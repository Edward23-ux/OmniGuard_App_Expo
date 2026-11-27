import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, spacing, radius } from '../styles/globalStyles';
import { supabase } from '../services/supabaseClient';
import { useUser } from '../context/UserContext';

const MAX_BASE64_LENGTH = 5500000; // ~4 MB en binario, igual que validar-dni-ia

export default function ScanDniScreen({ navigation, route }) {
    const { login } = useUser();
    const userData = route?.params?.userData;
    const dniEsperado = String(
        userData?.dni || userData?.datosReniec?.document_number || ''
    ).trim();

    const [capturedUri, setCapturedUri] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mensaje, setMensaje] = useState('Toma una foto nítida de tu DNI físico original');
    const [exito, setExito] = useState(false);
    const [errorState, setErrorState] = useState(false);
    const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
    const [rejectionMessage, setRejectionMessage] = useState('');

    const mostrarPopupRechazo = (sugerencias) => {
        setRejectionMessage(
            sugerencias || 'Error de validación. Asegúrate de enfocar bien tu DNI.'
        );
        setRejectionModalVisible(true);
    };

    const handleReintentar = () => {
        setRejectionModalVisible(false);
        setCapturedUri(null);
        setErrorState(false);
        setMensaje('Toma una foto nítida de tu DNI físico original');
    };

    const handleEscanearDni = async () => {
        if (isProcessing) return;

        if (!dniEsperado || dniEsperado.length !== 8) {
            Alert.alert('Error', 'No se encontró un número de DNI válido para validar.', [
                { text: 'Volver', onPress: () => navigation.goBack() },
            ]);
            return;
        }

        try {
            // 1. Solicitar permiso de cámara
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permiso de cámara requerido',
                    'OmniGuard necesita acceso a tu cámara para escanear tu DNI y validar tu identidad.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
                    ]
                );
                return;
            }

            // 2. Capturar foto en vivo con la cámara (sin galería)
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.65,
                base64: true,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const asset = result.assets[0];
            setCapturedUri(asset.uri);
            setIsProcessing(true);
            setErrorState(false);
            setMensaje('Analizando DNI con IA...');

            // 3. Obtener Base64 de la imagen capturada
            let base64Image = asset.base64 || '';
            if (!base64Image && asset.uri) {
                base64Image = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            }

            if (!base64Image) {
                setErrorState(true);
                setIsProcessing(false);
                setMensaje('Error al procesar la imagen');
                mostrarPopupRechazo('No se pudo leer la imagen capturada. Intenta nuevamente.');
                return;
            }

            // Limpiar posible prefijo data URI
            base64Image = base64Image.replace(/^data:[^;]+;base64,/, '');

            // 4. Validar tamaño máximo (~4 MB) antes de invocar la Edge Function
            if (base64Image.length > MAX_BASE64_LENGTH) {
                setErrorState(true);
                setIsProcessing(false);
                setMensaje('Error al procesar la imagen');
                mostrarPopupRechazo(
                    'La imagen es muy pesada. Aléjate un poco del DNI e intenta de nuevo.'
                );
                return;
            }

            // 5. Invocar Supabase Edge Function 'validar-dni-ia' (Gemini)
            const { data, error } = await supabase.functions.invoke('validar-dni-ia', {
                body: {
                    imagenBase64: base64Image,
                    dniEsperado,
                },
            });

            if (error) {
                let errorMsg = 'Error de conexión con el servicio de validación. Intenta de nuevo.';
                try {
                    if (error.context && typeof error.context.json === 'function') {
                        const errBody = await error.context.json();
                        errorMsg = errBody?.motivo || errBody?.error || errorMsg;
                    } else if (error.message) {
                        errorMsg = error.message;
                    }
                } catch {
                    // Mantener mensaje por defecto si no se puede parsear JSON
                }

                setErrorState(true);
                setIsProcessing(false);
                setMensaje('Error de validación');
                mostrarPopupRechazo(errorMsg);
                return;
            }

            // Verificar error devuelto en payload
            if (data?.error) {
                setErrorState(true);
                setIsProcessing(false);
                setMensaje('Error de validación');
                mostrarPopupRechazo(String(data.error));
                return;
            }

            // 6. Evaluar resultado de la IA
            if (data?.valido === true) {
                setExito(true);
                setIsProcessing(false);
                setErrorState(false);
                setMensaje('Identidad verificada correctamente');

                await login({
                    ...userData,
                    verificado: true,
                });
            } else {
                setErrorState(true);
                setIsProcessing(false);
                setMensaje('Validación rechazada');
                mostrarPopupRechazo(
                    data?.motivo ||
                        'Error de validación. Asegúrate de enfocar bien tu DNI físico.'
                );
            }
        } catch (err) {
            console.error('[ScanDniScreen] Error al validar DNI:', err);
            setErrorState(true);
            setIsProcessing(false);
            setMensaje('Error de conexión');
            mostrarPopupRechazo('Error de conexión. Verifica tu internet e intenta de nuevo.');
        }
    };

    const handleFinalizarRegistro = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
        });
    };

    const nombreCiudadano = (
        userData?.nombre ||
        [userData?.nombres, userData?.apellidos].filter(Boolean).join(' ') ||
        'Ciudadano Verificado'
    ).trim();

    const frameBorderColor = exito
        ? colors.success
        : errorState
          ? colors.danger
          : colors.primary;

    if (exito) {
        const checksAprobados = [
            'Documento físico original detectado',
            'Captura en vivo (sin pantalla ni impresión)',
            'Legibilidad y nitidez aprobadas',
            `Número de DNI ${dniEsperado} coincidente con RENIEC`,
        ];

        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.verifiedContainer}>
                    <View style={styles.verifiedHeader}>
                        <View style={styles.verifiedIconWrap}>
                            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
                        </View>
                        <Text style={styles.verifiedTitle}>Identidad verificada</Text>
                        <Text style={styles.verifiedSubtitle}>
                            Validamos tu documento con inteligencia artificial y los registros de RENIEC.
                        </Text>
                    </View>

                    <View style={styles.verifiedCard}>
                        <View style={styles.identityRow}>
                            {capturedUri ? (
                                <Image
                                    source={{ uri: capturedUri }}
                                    style={styles.verifiedThumb}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.verifiedThumbFallback}>
                                    <MaterialCommunityIcons
                                        name="card-account-details-outline"
                                        size={24}
                                        color={colors.primary}
                                    />
                                </View>
                            )}
                            <View style={styles.identityMeta}>
                                <Text style={styles.identityLabel}>TITULAR VERIFICADO</Text>
                                <Text style={styles.identityName} numberOfLines={2}>
                                    {nombreCiudadano}
                                </Text>
                                <Text style={styles.identityDni}>DNI {dniEsperado}</Text>
                            </View>
                        </View>

                        <View style={styles.verifiedDivider} />

                        <View style={styles.checksList}>
                            {checksAprobados.map((item) => (
                                <View key={item} style={styles.checkRow}>
                                    <View style={styles.checkDot}>
                                        <Ionicons name="checkmark" size={13} color={colors.success} />
                                    </View>
                                    <Text style={styles.checkText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.bottomPanel}>
                    <TouchableOpacity
                        style={styles.scanButton}
                        activeOpacity={0.85}
                        onPress={handleFinalizarRegistro}
                    >
                        <View style={styles.scanButtonRow}>
                            <Text style={styles.scanButtonText}>Finalizar y continuar</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.surface} />
                        </View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    disabled={isProcessing}
                    hitSlop={10}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verificar DNI</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Zona visual del marco del DNI */}
            <View style={styles.previewArea}>
                <View style={styles.dniTag}>
                    <MaterialCommunityIcons
                        name="card-account-details-outline"
                        size={18}
                        color={colors.primary}
                    />
                    <Text style={styles.dniTagText}>DNI a validar: {dniEsperado}</Text>
                </View>

                <View style={[styles.dniFrame, { borderColor: frameBorderColor }]}>
                    {capturedUri ? (
                        <Image
                            source={{ uri: capturedUri }}
                            style={styles.capturedImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.placeholderContent}>
                            <MaterialCommunityIcons
                                name="smart-card-outline"
                                size={56}
                                color={colors.textMuted}
                            />
                            <Text style={styles.placeholderTitle}>
                                Frente de tu DNI físico
                            </Text>
                            <Text style={styles.placeholderSubtitle}>
                                No se permiten fotos de pantallas ni impresiones
                            </Text>
                        </View>
                    )}

                    {/* Overlay de procesamiento */}
                    {isProcessing && (
                        <View style={styles.processingOverlay}>
                            <ActivityIndicator size="large" color={colors.surface} />
                            <Text style={styles.processingOverlayText}>
                                Analizando autenticidad...
                            </Text>
                        </View>
                    )}

                    {/* Overlay de éxito */}
                    {exito && (
                        <View style={styles.successOverlay}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                            <Text style={styles.successOverlayText}>DNI Verificado</Text>
                        </View>
                    )}

                    {/* Esquinas decorativas */}
                    <View style={[styles.corner, styles.cornerTL, { borderColor: frameBorderColor }]} />
                    <View style={[styles.corner, styles.cornerTR, { borderColor: frameBorderColor }]} />
                    <View style={[styles.corner, styles.cornerBL, { borderColor: frameBorderColor }]} />
                    <View style={[styles.corner, styles.cornerBR, { borderColor: frameBorderColor }]} />
                </View>

                {/* Consejos breves para pasar validación IA */}
                <View style={styles.tipsCard}>
                    <View style={styles.tipRow}>
                        <Ionicons name="sunny-outline" size={16} color={colors.warning} />
                        <Text style={styles.tipText}>Buena iluminación, sin reflejos ni sombras</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Ionicons name="scan-outline" size={16} color={colors.info} />
                        <Text style={styles.tipText}>
                            Muestra el documento completo sobre una superficie real
                        </Text>
                    </View>
                </View>
            </View>

            {/* Panel inferior */}
            <View style={styles.bottomPanel}>
                {!!mensaje && (
                    <View
                        style={[
                            styles.statusBanner,
                            exito && styles.statusBannerSuccess,
                            errorState && styles.statusBannerError,
                        ]}
                    >
                        <Ionicons
                            name={
                                exito
                                    ? 'checkmark-circle'
                                    : errorState
                                      ? 'alert-circle-outline'
                                      : 'information-circle-outline'
                            }
                            size={20}
                            color={
                                exito
                                    ? colors.success
                                    : errorState
                                      ? colors.danger
                                      : colors.textMuted
                            }
                        />
                        <Text
                            style={[
                                styles.statusText,
                                exito && { color: colors.success },
                                errorState && { color: colors.danger },
                            ]}
                        >
                            {mensaje}
                        </Text>
                    </View>
                )}

                {!exito && (
                    <TouchableOpacity
                        style={[
                            styles.scanButton,
                            isProcessing && styles.scanButtonDisabled,
                        ]}
                        activeOpacity={0.85}
                        disabled={isProcessing}
                        onPress={handleEscanearDni}
                    >
                        {isProcessing ? (
                            <View style={styles.scanButtonRow}>
                                <ActivityIndicator size="small" color={colors.surface} />
                                <Text style={styles.scanButtonText}>Analizando...</Text>
                            </View>
                        ) : (
                            <View style={styles.scanButtonRow}>
                                <Ionicons name="camera" size={22} color={colors.surface} />
                                <Text style={styles.scanButtonText}>Escanear DNI</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Modal de Validación Rechazada */}
            <Modal
                visible={rejectionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleReintentar}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="warning" size={28} color={colors.danger} />
                            <Text style={styles.modalTitle}>Validación Rechazada</Text>
                        </View>

                        <Text style={styles.modalSubtitle}>Sugerencias para el usuario:</Text>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalBody}>{rejectionMessage}</Text>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.retryButton}
                            activeOpacity={0.85}
                            onPress={handleReintentar}
                        >
                            <Text style={styles.retryButtonText}>Reintentar tomar foto</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.round,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    previewArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    dniTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.round,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    dniTagText: {
        color: colors.text,
        fontSize: 13.5,
        fontWeight: '600',
        letterSpacing: 1,
    },
    dniFrame: {
        width: '100%',
        maxWidth: 340,
        aspectRatio: 1.586, // Proporción oficial de tarjeta ID-1 (DNI)
        borderRadius: radius.md,
        borderWidth: 2.5,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    capturedImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    placeholderContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    placeholderTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    placeholderSubtitle: {
        color: colors.textMuted,
        fontSize: 12.5,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    processingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        backgroundColor: 'rgba(16, 24, 40, 0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    processingOverlayText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    successOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        backgroundColor: 'rgba(16, 24, 40, 0.78)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    successOverlayText: {
        color: colors.success,
        fontSize: 16,
        fontWeight: '700',
    },
    corner: {
        position: 'absolute',
        zIndex: 20,
        width: 22,
        height: 22,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    tipsCard: {
        width: '100%',
        maxWidth: 340,
        marginTop: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tipText: {
        flex: 1,
        color: colors.textMuted,
        fontSize: 12.5,
        lineHeight: 17,
    },
    bottomPanel: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.md,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.background,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusBannerSuccess: {
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        borderColor: 'rgba(18, 183, 106, 0.3)',
    },
    statusBannerError: {
        backgroundColor: 'rgba(239, 59, 78, 0.10)',
        borderColor: 'rgba(239, 59, 78, 0.3)',
    },
    statusText: {
        flex: 1,
        color: colors.textMuted,
        fontSize: 13.5,
        lineHeight: 18,
    },
    scanButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    scanButtonDisabled: {
        backgroundColor: '#F1AEB6',
        shadowOpacity: 0,
        elevation: 0,
    },
    scanButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    scanButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '700',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 40, 0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#101828',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: spacing.md,
    },
    modalTitle: {
        flex: 1,
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    modalSubtitle: {
        color: colors.textMuted,
        fontSize: 13.5,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    modalScroll: {
        maxHeight: 220,
        marginBottom: spacing.lg,
    },
    modalBody: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 21,
    },
    retryButton: {
        backgroundColor: colors.primary,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    retryButtonText: {
        color: colors.surface,
        fontSize: 14.5,
        fontWeight: '700',
    },
    verifiedContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    verifiedHeader: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    verifiedIconWrap: {
        width: 72,
        height: 72,
        borderRadius: radius.round,
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    verifiedTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
    },
    verifiedSubtitle: {
        fontSize: 13.5,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 6,
        paddingHorizontal: spacing.sm,
    },
    verifiedCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    identityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    verifiedThumb: {
        width: 76,
        height: 48,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    verifiedThumbFallback: {
        width: 76,
        height: 48,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    identityMeta: {
        flex: 1,
    },
    identityLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.6,
    },
    identityName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    identityDni: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        marginTop: 2,
    },
    verifiedDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    checksList: {
        gap: 10,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkText: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '500',
        color: colors.text,
        lineHeight: 19,
    },
});
