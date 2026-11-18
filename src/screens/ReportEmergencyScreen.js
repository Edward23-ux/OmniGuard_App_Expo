import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
    Platform,
    Image,
    Linking,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { saveNewReport } from '../services/reportStorage';
import { supabase, subirEvidenciaFotografica } from '../services/supabaseClient';
import { dispararNotificacionLocal } from '../services/notificationService';
import { useUser } from '../context/UserContext';

const DEFAULT_COORDS = {
    latitud: -12.11568,
    longitud: -77.02970,
};

export const iconoTipo = {
    'Incendio': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </Svg>
    ),
    'Accidente Vehicular': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <Circle cx="7" cy="17" r="2" />
            <Circle cx="17" cy="17" r="2" />
            <Path d="M9 17h6" />
        </Svg>
    ),
    'Fuga de Gas': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06D6A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </Svg>
    ),
    'Rescate': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF006E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Path d="m4.93 4.93 4.24 4.24" />
            <Path d="m14.83 9.17 4.24-4.24" />
            <Path d="m14.83 14.83 4.24 4.24" />
            <Path d="m9.17 14.83-4.24 4.24" />
            <Circle cx="12" cy="12" r="4" />
        </Svg>
    ),
    'Derrumbe': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FB8500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Path d="M9 22V12h6v10" />
            <Path d="m11 5 2 5-4 2 2 3" />
        </Svg>
    ),
    'Inundación': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M2 6c.6 0 1.2-.2 1.6-.6L5 4l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L11 4l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L17 4l1.4 1.4c.4.4 1 .6 1.6.6" />
            <Path d="M2 12c.6 0 1.2-.2 1.6-.6L5 10l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L11 10l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L17 10l1.4 1.4c.4.4 1 .6 1.6.6" />
            <Path d="M2 18c.6 0 1.2-.2 1.6-.6L5 16l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L11 16l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L17 16l1.4 1.4c.4.4 1 .6 1.6.6" />
        </Svg>
    ),
    'Explosión': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="m12 3-1.912 5.886L4.2 8.878l4.757 4.107-1.818 6.015L12 15.275l4.86 3.725-1.817-6.015 4.756-4.107-5.888-.008z" />
        </Svg>
    ),
    'Otro': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8338EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="8" x2="12" y2="12" />
            <Line x1="12" y1="16" x2="12.01" y2="16" />
        </Svg>
    ),
};

const EMERGENCY_TYPES = [
    { id: 'incendio', label: 'Incendio' },
    { id: 'accidente', label: 'Accidente Vehicular' },
    { id: 'fuga_gas', label: 'Fuga de Gas' },
    { id: 'rescate', label: 'Rescate' },
    { id: 'derrumbe', label: 'Derrumbe' },
    { id: 'inundacion', label: 'Inundación' },
    { id: 'explosion', label: 'Explosión' },
    { id: 'otro', label: 'Otro' },
];

export default function ReportEmergencyScreen({ navigation }) {
    const { user } = useUser();
    const [selected, setSelected] = useState(null);
    const [coords, setCoords] = useState(DEFAULT_COORDS);
    const [photoUri, setPhotoUri] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [reportedType, setReportedType] = useState(null);

    const obtenerUbicacionGps = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            // 1. Obtener de inmediato la última posición en caché del sistema (< 20ms)
            try {
                const lastKnown = await Location.getLastKnownPositionAsync({
                    maxAge: 600000,
                });
                if (lastKnown?.coords) {
                    setCoords({
                        latitud: lastKnown.coords.latitude,
                        longitud: lastKnown.coords.longitude,
                    });
                }
            } catch {
                // Continuar con lectura activa
            }

            // 2. Refinar ubicación con timeout corto (4s) para evitar bloqueos largos del GPS
            const positionPromise = Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GPS_TIMEOUT')), 4000)
            );

            const location = await Promise.race([positionPromise, timeoutPromise]);
            if (location?.coords) {
                setCoords({
                    latitud: location.coords.latitude,
                    longitud: location.coords.longitude,
                });
            }
        } catch (error) {
            console.warn('[ReportEmergencyScreen] Usando última ubicación disponible:', error.message);
        }
    }, []);

    useEffect(() => {
        obtenerUbicacionGps();
    }, [obtenerUbicacionGps]);

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permiso de cámara requerido',
                    'Habilita el acceso a la cámara en la configuración para capturar evidencia fotográfica.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
                    ]
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets?.length > 0) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[ReportEmergencyScreen] Error al abrir cámara:', error);
            Alert.alert('Error', 'No se pudo acceder a la cámara del dispositivo.');
        }
    };

    const handlePickFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permiso de galería requerido',
                    'Habilita el acceso a tus fotos en la configuración para adjuntar evidencia.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
                    ]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets?.length > 0) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[ReportEmergencyScreen] Error al abrir galería:', error);
            Alert.alert('Error', 'No se pudo abrir la galería de imágenes.');
        }
    };

    const enviarEmergenciaSupabase = async (tipoLabel, fotoUrl) => {
        if (!user?.id) {
            throw new Error('Sesión ciudadana no válida. Inicia sesión nuevamente.');
        }

        const { data: nuevaEmergencia, error: emergencyError } = await supabase
            .from('emergencias')
            .insert({
                usuario_id: user.id,
                tipo: tipoLabel,
                latitud: coords.latitud,
                longitud: coords.longitud,
                estado: 'Pendiente',
                foto_url: fotoUrl,
            })
            .select()
            .single();

        if (emergencyError) {
            throw emergencyError;
        }

        return nuevaEmergencia?.id ? String(nuevaEmergencia.id) : null;
    };

    const handleReport = async () => {
        const tipo = EMERGENCY_TYPES.find((t) => t.id === selected);
        if (!tipo || submitting) return;

        if (!user?.id) {
            Alert.alert('Sesión requerida', 'Debes iniciar sesión con tu DNI para reportar una emergencia.');
            return;
        }

        setSubmitting(true);
        let fotoUrl = null;
        let remoteId = null;

        try {
            if (photoUri) {
                try {
                    fotoUrl = await subirEvidenciaFotografica(
                        photoUri,
                        'iniciales',
                        user.dni || user.id
                    );
                } catch (uploadError) {
                    console.error('[ReportEmergencyScreen] Error al subir foto a Supabase:', uploadError);
                }
            }

            try {
                remoteId = await enviarEmergenciaSupabase(tipo.label, fotoUrl);
            } catch (supabaseError) {
                console.error('[ReportEmergencyScreen] Error al sincronizar emergencia con Supabase (modo offline activo):', supabaseError);
            }

            await saveNewReport(tipo.label, user, {
                id: remoteId,
                usuarioId: user.id,
                coordenadas: { lat: coords.latitud, lng: coords.longitud },
                fotoUrl: fotoUrl || photoUri || null,
            });

            try {
                await dispararNotificacionLocal(
                    'Alerta Registrada',
                    'Tu reporte de ' + tipo.label + ' fue enviado a la central 116.'
                );
            } catch (notifError) {
                console.warn('[ReportEmergencyScreen] No se pudo mostrar notificación local:', notifError);
            }

            setReportedType(tipo);
            setSuccessModalVisible(true);
        } catch (error) {
            console.error('[ReportEmergencyScreen] Error al guardar reporte:', error);
            Alert.alert('Error', 'No se pudo guardar el reporte en la memoria local.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAcceptSuccess = () => {
        setSuccessModalVisible(false);
        navigation.navigate('MainTabs', { screen: 'MisReportes' });
    };

    return (
        <SafeAreaView style={globalStyles.screen}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
                        <Ionicons name="arrow-back" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reportar Emergencia</Text>
                    <View style={{ width: 26 }} />
                </View>

                <Text style={styles.question}>¿Qué está pasando?</Text>
                <Text style={styles.hint}>Selecciona el tipo de emergencia</Text>

                <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.grid}>
                        {EMERGENCY_TYPES.map((type) => {
                            const isSelected = selected === type.id;
                            const isDimmed = submitting && !isSelected;
                            return (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.typeButton,
                                        isSelected && styles.typeButtonSelected,
                                        isDimmed && styles.typeButtonDisabled,
                                    ]}
                                    activeOpacity={0.8}
                                    disabled={submitting}
                                    onPress={() => {
                                        if (!submitting) setSelected(type.id);
                                    }}
                                >
                                    <View style={styles.iconContainer}>
                                        {iconoTipo[type.label]}
                                    </View>
                                    <Text
                                        style={[
                                            styles.typeLabel,
                                            isSelected && styles.typeLabelSelected,
                                            isDimmed && styles.typeLabelDisabled,
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Bloque opcional de Evidencia Fotográfica */}
                    <View style={styles.evidenceCard}>
                        <Text style={styles.evidenceSectionTitle}>Evidencia Fotográfica (opcional)</Text>
                        {photoUri ? (
                            <View style={styles.previewWrap}>
                                <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                                <TouchableOpacity
                                    style={[styles.discardPhotoBtn, submitting && { opacity: 0.5 }]}
                                    activeOpacity={0.8}
                                    disabled={submitting}
                                    onPress={() => setPhotoUri(null)}
                                >
                                    <Ionicons name="trash-outline" size={16} color={colors.surface} />
                                    <Text style={styles.discardPhotoText}>Descartar foto</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.photoActionsRow}>
                                <TouchableOpacity
                                    style={[styles.photoActionBtn, submitting && { opacity: 0.5 }]}
                                    activeOpacity={0.8}
                                    disabled={submitting}
                                    onPress={handleTakePhoto}
                                >
                                    <Ionicons name="camera-outline" size={18} color={colors.text} />
                                    <Text style={styles.photoActionText}>Tomar Foto</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.photoActionBtn, submitting && { opacity: 0.5 }]}
                                    activeOpacity={0.8}
                                    disabled={submitting}
                                    onPress={handlePickFromGallery}
                                >
                                    <Ionicons name="images-outline" size={18} color={colors.text} />
                                    <Text style={styles.photoActionText}>Galería</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <TouchableOpacity
                    style={[
                        globalStyles.primaryButton,
                        styles.submitButton,
                        (!selected || submitting) && globalStyles.primaryButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={!selected || submitting}
                    onPress={handleReport}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color={colors.surface} style={{ marginRight: 8 }} />
                    ) : (
                        <Ionicons name="alert-circle" size={20} color={colors.surface} style={{ marginRight: 8 }} />
                    )}
                    <Text style={typography.buttonText}>
                        {submitting ? 'ENVIANDO REPORTE...' : 'REPORTAR AHORA'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal de confirmación con diseño OmniGuard */}
            <Modal
                visible={successModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleAcceptSuccess}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {/* Círculo con ícono de éxito */}
                        <View style={styles.successIconOuter}>
                            <View style={styles.successIconInner}>
                                <Ionicons name="checkmark-sharp" size={32} color={colors.surface} />
                            </View>
                        </View>

                        <Text style={styles.modalTitle}>¡Reporte Enviado!</Text>

                        {reportedType && (
                            <View style={styles.emergencyTag}>
                                <View style={{ marginRight: 6 }}>
                                    {iconoTipo[reportedType.label]}
                                </View>
                                <Text style={styles.emergencyTagText}>{reportedType.label}</Text>
                            </View>
                        )}

                        <Text style={styles.modalMessage}>
                            Se registró tu emergencia correctamente. Un operador de la central revisará tu reporte de inmediato.
                        </Text>


                        <TouchableOpacity
                            style={[globalStyles.primaryButton, styles.modalButton]}
                            activeOpacity={0.85}
                            onPress={handleAcceptSuccess}
                        >
                            <Text style={typography.buttonText}>Mis Reportes</Text>
                            <Ionicons name="arrow-forward" size={18} color={colors.surface} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const CARD_GAP = spacing.md;

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    question: { color: colors.text, fontSize: 20, fontWeight: '700' },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.md },
    scrollBody: { paddingBottom: spacing.lg },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    typeButton: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: CARD_GAP,
    },
    typeButtonSelected: { borderColor: colors.primary, backgroundColor: 'rgba(239,59,78,0.08)' },
    typeButtonDisabled: { opacity: 0.35 },
    iconContainer: { marginBottom: spacing.sm },
    typeLabel: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    typeLabelSelected: { color: colors.primaryDark },
    typeLabelDisabled: { color: colors.textMuted },
    evidenceCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    evidenceSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    photoActionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    photoActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    photoActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    previewWrap: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    previewImage: {
        width: '100%',
        height: 160,
        borderRadius: radius.sm,
        backgroundColor: colors.background,
    },
    discardPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.danger,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.sm,
    },
    discardPhotoText: {
        color: colors.surface,
        fontSize: 12.5,
        fontWeight: '700',
    },
    submitButton: { flexDirection: 'row', marginBottom: spacing.lg },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 40, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.surface,
        borderRadius: radius.lg + 4,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    successIconOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    successIconInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    emergencyTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 59, 78, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 59, 78, 0.25)',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.round,
        marginVertical: spacing.sm,
    },
    emergencyTagText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    modalMessage: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 4,
        marginBottom: spacing.md,
    },
    dispatchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 183, 106, 0.08)',
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: 5,
        borderRadius: radius.round,
        marginBottom: spacing.lg,
    },
    dispatchDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 6,
    },
    dispatchText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success,
    },
    modalButton: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
    },
});
