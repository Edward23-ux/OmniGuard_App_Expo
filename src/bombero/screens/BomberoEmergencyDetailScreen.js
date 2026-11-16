import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    Linking,
    Alert,
    Image,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { iconoTipo } from '../../screens/ReportEmergencyScreen';
import { updateEmergencyStatus } from '../services/bomberoService';
import { subirEvidenciaFotografica } from '../../services/supabaseClient';
import { dispararNotificacionLocal } from '../../services/notificationService';
import { useUser } from '../../context/UserContext';
import { STATUS_BADGE_MAP } from './BomberoDashboardScreen';
import InteractiveEmergencyMap from '../components/InteractiveEmergencyMap';

const MOTIVOS_FALSA_ALARMA = [
    'Sin indicios en el lugar',
    'Actividad controlada / autorizada',
    'Ubicación inexistente',
];

export default function BomberoEmergencyDetailScreen({ route, navigation }) {
    const { user } = useUser();
    const initialEmergency = route.params?.emergency || {};
    const [emergency, setEmergency] = useState(initialEmergency);
    const [updating, setUpdating] = useState(false);
    const [testigosModalVisible, setTestigosModalVisible] = useState(false);
    const [evidenciaModalVisible, setEvidenciaModalVisible] = useState(false);
    const [confirmAtencionModalVisible, setConfirmAtencionModalVisible] = useState(false);
    const [cierreModalVisible, setCierreModalVisible] = useState(false);
    const [cierreFotoUri, setCierreFotoUri] = useState(null);
    const [cierreInforme, setCierreInforme] = useState('');
    const [submittingCierre, setSubmittingCierre] = useState(false);
    const [falsaAlarmaModalVisible, setFalsaAlarmaModalVisible] = useState(false);
    const [falsaAlarmaFotoUri, setFalsaAlarmaFotoUri] = useState(null);
    const [falsaAlarmaMotivo, setFalsaAlarmaMotivo] = useState('');
    const [falsaAlarmaDetalle, setFalsaAlarmaDetalle] = useState('');
    const [submittingFalsaAlarma, setSubmittingFalsaAlarma] = useState(false);
    const [isTouchingMap, setIsTouchingMap] = useState(false);

    const statusBadge = STATUS_BADGE_MAP[emergency.estado] || STATUS_BADGE_MAP.Pendiente;
    const shortId = String(emergency.id || '6cd64a46').slice(0, 8);
    const isIaApproved = emergency.iaValidacion?.estado !== 'Rechazado';
    const isClosedState = emergency.estado === 'Culminado' || emergency.estado === 'Falsa Alarma';
    const sinUnidadAsignada = !emergency.unidadAsignadaId || emergency.estado === 'Pendiente';
    const unidadOperativaAutorizada =
        !sinUnidadAsignada &&
        (Boolean(user?.unidad_asignada_id && emergency.unidadAsignadaId === user.unidad_asignada_id) ||
            Boolean(user?.compania_id && emergency.companiaId === user.compania_id));

    const capturarFotoEnSitio = async (onCaptured) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permiso de cámara requerido',
                    'Habilita el acceso a la cámara en la configuración para registrar la evidencia en sitio.',
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
                onCaptured(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[BomberoEmergencyDetailScreen] Error al capturar fotografía:', error);
            Alert.alert('Error', 'No se pudo acceder a la cámara del dispositivo.');
        }
    };

    const handleConfirmarInicioAtencion = async () => {
        if (updating) return;
        setUpdating(true);
        try {
            const updated = await updateEmergencyStatus(emergency.id, 'En Proceso', {
                bomberoId: user?.id || null,
            });
            if (updated) {
                setEmergency(updated);
            } else {
                setEmergency((prev) => ({ ...prev, estado: 'En Proceso' }));
            }
            setConfirmAtencionModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'No se pudo iniciar la atención de la emergencia.');
        } finally {
            setUpdating(false);
        }
    };

    const handleAbrirModalCierre = () => {
        setCierreFotoUri(null);
        setCierreInforme('');
        setCierreModalVisible(true);
    };

    const handleCapturarFotoCierre = () => {
        capturarFotoEnSitio(setCierreFotoUri);
    };

    const handleAbrirModalFalsaAlarma = () => {
        setFalsaAlarmaFotoUri(null);
        setFalsaAlarmaMotivo('');
        setFalsaAlarmaDetalle('');
        setFalsaAlarmaModalVisible(true);
    };

    const handleCapturarFotoFalsaAlarma = () => {
        capturarFotoEnSitio(setFalsaAlarmaFotoUri);
    };

    const getInformeFalsaAlarma = () => {
        const motivo = falsaAlarmaMotivo.trim();
        const detalle = falsaAlarmaDetalle.trim();
        if (motivo && detalle) return `${motivo}. ${detalle}`;
        return motivo || detalle;
    };

    const handleConfirmarFalsaAlarma = async () => {
        const informeFinal = getInformeFalsaAlarma();
        if (!falsaAlarmaFotoUri) {
            Alert.alert('Fotografía obligatoria', 'Debes capturar una fotografía en sitio para descartar la emergencia.');
            return;
        }
        if (informeFinal.length < 5) {
            Alert.alert('Motivo requerido', 'Selecciona un motivo o ingresa un detalle de al menos 5 caracteres.');
            return;
        }

        setSubmittingFalsaAlarma(true);
        let fotoCierreUrl = null;

        try {
            try {
                fotoCierreUrl = await subirEvidenciaFotografica(
                    falsaAlarmaFotoUri,
                    'cierres',
                    String(emergency.id)
                );
            } catch (uploadError) {
                console.error('[BomberoEmergencyDetailScreen] Error al subir foto de falsa alarma:', uploadError);
                fotoCierreUrl = falsaAlarmaFotoUri;
            }

            const updated = await updateEmergencyStatus(emergency.id, 'Falsa Alarma', {
                fotoCierreUrl,
                informeBombero: informeFinal,
                bomberoId: user?.id || null,
            });

            if (updated) {
                setEmergency(updated);
            } else {
                setEmergency((prev) => ({
                    ...prev,
                    estado: 'Falsa Alarma',
                    fotoCierreUrl,
                    informeBombero: informeFinal,
                }));
            }

            setFalsaAlarmaModalVisible(false);

            try {
                await dispararNotificacionLocal(
                    'Emergencia Descartada',
                    'Se registró el acta de falsa alarma en la central.'
                );
            } catch (notifErr) {
                console.warn('[BomberoEmergencyDetailScreen] No se pudo disparar notificación:', notifErr);
            }
        } catch (err) {
            console.error('[BomberoEmergencyDetailScreen] Error al registrar falsa alarma:', err);
            Alert.alert('Error', 'No se pudo registrar el acta de falsa alarma.');
        } finally {
            setSubmittingFalsaAlarma(false);
        }
    };

    const handleConfirmarCierre = async () => {
        const informeLimpio = cierreInforme.trim();
        if (!cierreFotoUri) {
            Alert.alert('Fotografía obligatoria', 'Debes capturar la fotografía final del siniestro controlado.');
            return;
        }
        if (informeLimpio.length < 5) {
            Alert.alert('Informe requerido', 'Ingresa un comentario técnico de al menos 5 caracteres.');
            return;
        }

        setSubmittingCierre(true);
        let fotoCierreUrl = null;

        try {
            try {
                fotoCierreUrl = await subirEvidenciaFotografica(
                    cierreFotoUri,
                    'cierres',
                    String(emergency.id)
                );
            } catch (uploadError) {
                console.error('[BomberoEmergencyDetailScreen] Error al subir foto de cierre a Supabase:', uploadError);
                fotoCierreUrl = cierreFotoUri;
            }

            const updated = await updateEmergencyStatus(emergency.id, 'Culminado', {
                fotoCierreUrl,
                informeBombero: informeLimpio,
                bomberoId: user?.id || null,
            });

            if (updated) {
                setEmergency(updated);
            } else {
                setEmergency((prev) => ({
                    ...prev,
                    estado: 'Culminado',
                    fotoCierreUrl,
                    informeBombero: informeLimpio,
                }));
            }

            setCierreModalVisible(false);

            try {
                await dispararNotificacionLocal(
                    'Emergencia Culminada',
                    'Se registró la evidencia de cierre en la central.'
                );
            } catch (notifErr) {
                console.warn('[BomberoEmergencyDetailScreen] No se pudo disparar notificación:', notifErr);
            }
        } catch (err) {
            console.error('[BomberoEmergencyDetailScreen] Error al culminar emergencia:', err);
            Alert.alert('Error', 'No se pudo registrar el cierre de la emergencia.');
        } finally {
            setSubmittingCierre(false);
        }
    };

    const handleOpenMaps = () => {
        const lat = emergency.coordenadas?.lat ?? -12.0689;
        const lng = emergency.coordenadas?.lng ?? -77.0361;
        const query = encodeURIComponent(emergency.direccion || `${lat},${lng}`);
        const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Navegación GPS', `Coordenadas: ${lat}, ${lng}\n${emergency.direccion}`);
        });
    };

    const handleCallReporter = () => {
        const tel = emergency.reportante?.telefono?.replace(/\s+/g, '') || '116';
        Linking.openURL(`tel:${tel}`).catch(() => {
            Alert.alert('Contacto del reportante', `Teléfono: ${emergency.reportante?.telefono || 'No registrado'}`);
        });
    };

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            {/* Barra superior de navegación Stack */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={10}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                    <Text style={styles.backBtnText}>Emergencias</Text>
                </TouchableOpacity>

                <Text style={styles.navBarTitle}>Detalle de Emergencia</Text>

                <TouchableOpacity
                    style={styles.profileShortcut}
                    onPress={() => navigation.navigate('BomberoProfile')}
                >
                    <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isTouchingMap}
            >
                {/* 1. Tarjeta Superior: Tipo, ID, Estado Actual y Botones de Acción */}
                <View style={styles.mainHeaderCard}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.typeAndIdWrap}>
                            <View style={styles.bigIconWrap}>
                                {iconoTipo[emergency.tipo] || iconoTipo['Incendio']}
                            </View>
                            <View>
                                <Text style={styles.emergencyTitle}>{emergency.tipo}</Text>
                                <Text style={styles.emergencyId}>ID: {shortId}...</Text>
                            </View>
                        </View>

                        <View style={[styles.currentStatusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[styles.currentStatusText, { color: statusBadge.color }]}>
                                {statusBadge.label}
                            </Text>
                        </View>
                    </View>

                    {sinUnidadAsignada && (
                        <View style={styles.readOnlyBanner}>
                            <Ionicons name="information-circle-outline" size={20} color="#B54708" />
                            <Text style={styles.readOnlyBannerText}>
                                Pendiente de despacho por Central. Modo solo lectura hasta la asignación de unidad.
                            </Text>
                        </View>
                    )}

                    {!sinUnidadAsignada && !unidadOperativaAutorizada && !isClosedState && (
                        <View style={styles.readOnlyBanner}>
                            <Ionicons name="information-circle-outline" size={20} color="#B54708" />
                            <Text style={styles.readOnlyBannerText}>
                                Emergencia asignada a otra unidad o compañía. Modo solo lectura.
                            </Text>
                        </View>
                    )}

                    {!sinUnidadAsignada && unidadOperativaAutorizada && emergency.estado === 'Asignado' && (
                        <>
                            <Text style={styles.actionSectionTitle}>ACCIONES DE ATENCIÓN:</Text>
                            <View style={styles.sequentialActionsRow}>
                                <TouchableOpacity
                                    style={[styles.sequentialBtn, styles.primaryActionBtn]}
                                    activeOpacity={0.85}
                                    disabled={updating}
                                    onPress={() => setConfirmAtencionModalVisible(true)}
                                >
                                    <MaterialCommunityIcons name="fire-truck" size={18} color={colors.surface} />
                                    <Text style={styles.primaryActionBtnText}>Iniciar Atención</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.sequentialBtn, styles.dangerOutlineBtn]}
                                    activeOpacity={0.85}
                                    disabled={updating}
                                    onPress={handleAbrirModalFalsaAlarma}
                                >
                                    <MaterialCommunityIcons name="close-circle-outline" size={18} color="#B42318" />
                                    <Text style={styles.dangerOutlineBtnText}>Falsa Alarma</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {!sinUnidadAsignada && unidadOperativaAutorizada && emergency.estado === 'En Proceso' && (
                        <>
                            <Text style={styles.actionSectionTitle}>ACCIONES EN CAMPO:</Text>
                            <View style={styles.sequentialActionsRow}>
                                <TouchableOpacity
                                    style={[styles.sequentialBtn, styles.successActionBtn]}
                                    activeOpacity={0.85}
                                    disabled={updating}
                                    onPress={handleAbrirModalCierre}
                                >
                                    <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.surface} />
                                    <Text style={styles.primaryActionBtnText}>Culminar Emergencia</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.sequentialBtn, styles.dangerOutlineBtn]}
                                    activeOpacity={0.85}
                                    disabled={updating}
                                    onPress={handleAbrirModalFalsaAlarma}
                                >
                                    <MaterialCommunityIcons name="close-circle-outline" size={18} color="#B42318" />
                                    <Text style={styles.dangerOutlineBtnText}>Falsa Alarma</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                {/* 2. Tarjeta Dirección Aproximada */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardSectionLabel}>DIRECCIÓN APROXIMADA</Text>
                    <Text style={styles.addressMainText}>
                        {emergency.direccion || 'Calle Manuel Nicolás Corpancho, Lima'}
                    </Text>
                    {!!emergency.referencia && (
                        <Text style={styles.referenceText}>{emergency.referencia}</Text>
                    )}
                    <Text style={styles.dateSubText}>
                        {emergency.fechaCorta || emergency.fecha || '9/9/2026'}
                    </Text>
                </View>

                {/* 3. Tarjeta Ubicación de la Emergencia (Mapa Interactivo Leaflet + OpenStreetMap + Redirección GPS) */}
                <View style={styles.infoCard}>
                    <View style={styles.mapHeaderRow}>
                        <Text style={styles.cardSectionLabel}>UBICACIÓN DE LA EMERGENCIA</Text>
                        <TouchableOpacity
                            style={styles.openGpsPill}
                            activeOpacity={0.8}
                            onPress={handleOpenMaps}
                        >
                            <MaterialCommunityIcons name="navigation-variant" size={14} color={colors.surface} />
                            <Text style={styles.openGpsText}>Abrir ruta GPS</Text>
                        </TouchableOpacity>
                    </View>

                    <InteractiveEmergencyMap
                        lat={emergency.coordenadas?.lat ?? -12.0689}
                        lng={emergency.coordenadas?.lng ?? -77.0361}
                        titulo={emergency.tipo || 'Emergencia'}
                        direccion={emergency.direccion || 'Calle Manuel Nicolás Corpancho, Lima'}
                        onMapTouchStart={() => setIsTouchingMap(true)}
                        onMapTouchEnd={() => setIsTouchingMap(false)}
                    />
                </View>

                {/* 4. Tarjeta Testigos */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardSectionLabel}>TESTIGOS</Text>
                    <View style={styles.witnessRowCard}>
                        <View>
                            <Text style={styles.witnessBigCount}>
                                {emergency.testigosCount || emergency.testigos?.length || 1}
                            </Text>
                            <Text style={styles.witnessSubtitle}>usuario(s) reportando</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.secondaryActionBtn}
                            activeOpacity={0.8}
                            onPress={() => setTestigosModalVisible(true)}
                        >
                            <Text style={styles.secondaryActionText}>Ver</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 5. Tarjeta Detalles del Ciudadano Reportante y Validación IA */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardSectionLabel}>DETALLES</Text>
                    <View style={styles.detailsRow}>
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                            <Text style={styles.reporterName}>
                                {emergency.reportante?.nombre || 'EDWARD ANGEL CAMPOS HEREDIA'}
                            </Text>
                            <Text style={styles.reporterDni}>
                                DNI: {emergency.reportante?.dni || '73338614'}
                            </Text>

                            <View
                                style={[
                                    styles.iaApprovalBadge,
                                    {
                                        backgroundColor: isIaApproved ? '#D1FADF' : '#FEE4E2',
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.iaApprovalText,
                                        {
                                            color: isIaApproved ? '#027A48' : '#B42318',
                                        },
                                    ]}
                                >
                                    {(emergency.iaValidacion?.estado || 'APROBADO').toUpperCase()} (
                                    {emergency.iaValidacion?.porcentaje ?? 95}%)
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailButtonsCol}>
                            <TouchableOpacity
                                style={styles.secondaryActionBtn}
                                activeOpacity={0.8}
                                onPress={() => setEvidenciaModalVisible(true)}
                            >
                                <Text style={styles.secondaryActionText}>Ver evidencia</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.callReporterBtn}
                                activeOpacity={0.8}
                                onPress={handleCallReporter}
                            >
                                <Ionicons name="call-outline" size={14} color={colors.primary} />
                                <Text style={styles.callReporterText}>Llamar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isClosedState && (emergency.fotoCierreUrl || emergency.informeBombero) && (
                        <View style={styles.cierreSummaryBox}>
                            <Text style={styles.cierreSummaryLabel}>
                                {emergency.estado === 'Falsa Alarma'
                                    ? 'ACTA DE FALSA ALARMA REGISTRADA'
                                    : 'ACTA DE CIERRE EN CAMPO'}
                            </Text>
                            {!!emergency.fotoCierreUrl && (
                                <Image
                                    source={{ uri: emergency.fotoCierreUrl }}
                                    style={styles.cierreSummaryImage}
                                    resizeMode="cover"
                                />
                            )}
                            {!!emergency.informeBombero && (
                                <Text style={styles.cierreSummaryText}>
                                    {emergency.informeBombero}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Modal: Lista de Testigos */}
            <Modal
                visible={testigosModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setTestigosModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={typography.h2}>Testigos Reportando</Text>
                            <TouchableOpacity onPress={() => setTestigosModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[typography.caption, { marginBottom: spacing.md }]}>
                            Ciudadanos con identidad validada por RENIEC que reportaron esta emergencia:
                        </Text>

                        {(emergency.testigos || [
                            {
                                id: 'default-1',
                                nombre: emergency.reportante?.nombre || 'EDWARD ANGEL CAMPOS HEREDIA',
                                dni: emergency.reportante?.dni || '73338614',
                                hora: '11:30',
                                comentario: 'Reporte ciudadano verificado con geolocalización.',
                            },
                        ]).map((testigo, idx) => (
                            <View key={testigo.id || idx} style={styles.witnessItemCard}>
                                <View style={styles.witnessItemHeader}>
                                    <View style={styles.witnessAvatar}>
                                        <Ionicons name="person" size={14} color={colors.surface} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.witnessItemName}>{testigo.nombre}</Text>
                                        <Text style={styles.witnessItemMeta}>
                                            DNI: {testigo.dni} · Hora: {testigo.hora}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.witnessComment}>{testigo.comentario}</Text>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={[globalStyles.primaryButton, { paddingVertical: 14, marginTop: spacing.md }]}
                            onPress={() => setTestigosModalVisible(false)}
                        >
                            <Text style={typography.buttonText}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal: Ver Evidencia y Análisis IA */}
            <Modal
                visible={evidenciaModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEvidenciaModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={typography.h2}>Evidencia de la Emergencia</Text>
                            <TouchableOpacity onPress={() => setEvidenciaModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.evidencePreviewBox}>
                            {emergency.fotoUrl ? (
                                <Image
                                    source={{ uri: emergency.fotoUrl }}
                                    style={styles.evidenceRealImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.evidenceIconBadge}>
                                    {iconoTipo[emergency.tipo] || iconoTipo['Incendio']}
                                </View>
                            )}
                            <Text style={styles.evidenceVisualTitle}>
                                Captura Verificada · {emergency.tipo}
                            </Text>
                            <Text style={styles.evidenceTimestamp}>
                                {emergency.evidencia?.fechaCaptura || emergency.fecha || '9/9/2026'}
                            </Text>
                            <View
                                style={[
                                    styles.iaApprovalBadge,
                                    {
                                        backgroundColor: isIaApproved ? '#D1FADF' : '#FEE4E2',
                                        marginTop: spacing.sm,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.iaApprovalText,
                                        { color: isIaApproved ? '#027A48' : '#B42318' },
                                    ]}
                                >
                                    IA: {(emergency.iaValidacion?.estado || 'APROBADO').toUpperCase()} (
                                    {emergency.iaValidacion?.porcentaje ?? 95}%)
                                </Text>
                            </View>
                        </View>

                        <View style={styles.evidenceDetailRow}>
                            <Text style={styles.evidenceDetailLabel}>Análisis de campo / IA:</Text>
                            <Text style={styles.evidenceDetailBody}>
                                {emergency.evidencia?.descripcion ||
                                    'Reporte georreferenciado con evidencia fotográfica analizada por el motor de IA de OmniGuard.'}
                            </Text>
                        </View>

                        <View style={styles.evidenceDetailRow}>
                            <Text style={styles.evidenceDetailLabel}>Resultado del modelo:</Text>
                            <Text style={styles.evidenceDetailBody}>
                                {emergency.evidencia?.confianzaDetalle ||
                                    `Confianza del ${emergency.iaValidacion?.porcentaje ?? 95}% en validación automática.`}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[globalStyles.primaryButton, { paddingVertical: 14, marginTop: spacing.md }]}
                            onPress={() => setEvidenciaModalVisible(false)}
                        >
                            <Text style={typography.buttonText}>Cerrar evidencia</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal: Acta de Cierre en Campo (Camara obligatoria + Informe tecnico) */}
            <Modal
                visible={cierreModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => !submittingCierre && setCierreModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={typography.h2}>Acta de Cierre en Campo</Text>
                            <TouchableOpacity
                                disabled={submittingCierre}
                                onPress={() => setCierreModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[typography.caption, { marginBottom: spacing.md }]}>
                            Registra la fotografía final del siniestro controlado y un breve informe técnico.
                        </Text>

                        {cierreFotoUri ? (
                            <View style={styles.cierrePhotoPreviewWrap}>
                                <Image
                                    source={{ uri: cierreFotoUri }}
                                    style={styles.cierrePhotoPreview}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    style={styles.retakePhotoBtn}
                                    activeOpacity={0.8}
                                    disabled={submittingCierre}
                                    onPress={handleCapturarFotoCierre}
                                >
                                    <Ionicons name="camera-reverse-outline" size={16} color={colors.text} />
                                    <Text style={styles.retakePhotoText}>Volver a tomar foto</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.cierreCameraBtn}
                                activeOpacity={0.8}
                                disabled={submittingCierre}
                                onPress={handleCapturarFotoCierre}
                            >
                                <Ionicons name="camera" size={24} color={colors.primary} />
                                <Text style={styles.cierreCameraText}>Capturar fotografía final</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.cierreInputLabel}>INFORME TÉCNICO DE CIERRE</Text>
                        <TextInput
                            style={styles.cierreTextInput}
                            placeholder="Describe las acciones realizadas (mínimo 5 caracteres)..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                            value={cierreInforme}
                            onChangeText={setCierreInforme}
                            editable={!submittingCierre}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[
                                globalStyles.primaryButton,
                                { paddingVertical: 14, marginTop: spacing.md, flexDirection: 'row' },
                                (!cierreFotoUri || cierreInforme.trim().length < 5 || submittingCierre) &&
                                    globalStyles.primaryButtonDisabled,
                            ]}
                            activeOpacity={0.85}
                            disabled={submittingCierre}
                            onPress={handleConfirmarCierre}
                        >
                            {submittingCierre && (
                                <ActivityIndicator size="small" color={colors.surface} style={{ marginRight: 8 }} />
                            )}
                            <Text style={typography.buttonText}>
                                {submittingCierre ? 'Registrando cierre...' : 'Confirmar y Culminar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal: Confirmación de Inicio de Atención */}
            <Modal
                visible={confirmAtencionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => !updating && setConfirmAtencionModalVisible(false)}
            >
                <View style={styles.confirmBackdrop}>
                    <View style={styles.confirmCard}>
                        <View style={styles.confirmIconCircle}>
                            <MaterialCommunityIcons name="fire-truck" size={28} color={colors.info} />
                        </View>
                        <Text style={styles.confirmTitle}>Iniciar Atención</Text>
                        <Text style={styles.confirmMessage}>
                            ¿Confirmar inicio de desplazamiento y atención de esta emergencia?
                        </Text>

                        <View style={styles.confirmButtonsRow}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                activeOpacity={0.8}
                                disabled={updating}
                                onPress={() => setConfirmAtencionModalVisible(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmAcceptBtn, updating && globalStyles.primaryButtonDisabled]}
                                activeOpacity={0.85}
                                disabled={updating}
                                onPress={handleConfirmarInicioAtencion}
                            >
                                {updating ? (
                                    <ActivityIndicator size="small" color={colors.surface} />
                                ) : (
                                    <Text style={styles.confirmAcceptText}>Confirmar Atención</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal: Acta de Falsa Alarma (Camara obligatoria + Motivo) */}
            <Modal
                visible={falsaAlarmaModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => !submittingFalsaAlarma && setFalsaAlarmaModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={typography.h2}>Acta de Falsa Alarma</Text>
                            <TouchableOpacity
                                disabled={submittingFalsaAlarma}
                                onPress={() => setFalsaAlarmaModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[typography.caption, { marginBottom: spacing.md }]}>
                            Captura una fotografía de verificación en el lugar y especifica el motivo del descarte.
                        </Text>

                        {falsaAlarmaFotoUri ? (
                            <View style={styles.cierrePhotoPreviewWrap}>
                                <Image
                                    source={{ uri: falsaAlarmaFotoUri }}
                                    style={styles.cierrePhotoPreview}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    style={styles.retakePhotoBtn}
                                    activeOpacity={0.8}
                                    disabled={submittingFalsaAlarma}
                                    onPress={handleCapturarFotoFalsaAlarma}
                                >
                                    <Ionicons name="camera-reverse-outline" size={16} color={colors.text} />
                                    <Text style={styles.retakePhotoText}>Volver a tomar foto</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.cierreCameraBtn}
                                activeOpacity={0.8}
                                disabled={submittingFalsaAlarma}
                                onPress={handleCapturarFotoFalsaAlarma}
                            >
                                <Ionicons name="camera" size={24} color={colors.primary} />
                                <Text style={styles.cierreCameraText}>Capturar fotografía en sitio</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.cierreInputLabel}>MOTIVO DEL DESCARTE</Text>
                        <View style={styles.motivosWrap}>
                            {MOTIVOS_FALSA_ALARMA.map((motivo) => {
                                const selected = falsaAlarmaMotivo === motivo;
                                return (
                                    <TouchableOpacity
                                        key={motivo}
                                        style={[
                                            styles.motivoChip,
                                            selected && styles.motivoChipSelected,
                                        ]}
                                        activeOpacity={0.8}
                                        disabled={submittingFalsaAlarma}
                                        onPress={() =>
                                            setFalsaAlarmaMotivo(selected ? '' : motivo)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.motivoChipText,
                                                selected && styles.motivoChipTextSelected,
                                            ]}
                                        >
                                            {motivo}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TextInput
                            style={styles.cierreTextInput}
                            placeholder="Detalle adicional del descarte (opcional si elegiste motivo)..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                            value={falsaAlarmaDetalle}
                            onChangeText={setFalsaAlarmaDetalle}
                            editable={!submittingFalsaAlarma}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[
                                globalStyles.primaryButton,
                                { paddingVertical: 14, marginTop: spacing.md, flexDirection: 'row' },
                                (!falsaAlarmaFotoUri ||
                                    getInformeFalsaAlarma().length < 5 ||
                                    submittingFalsaAlarma) &&
                                    globalStyles.primaryButtonDisabled,
                            ]}
                            activeOpacity={0.85}
                            disabled={submittingFalsaAlarma}
                            onPress={handleConfirmarFalsaAlarma}
                        >
                            {submittingFalsaAlarma && (
                                <ActivityIndicator size="small" color={colors.surface} style={{ marginRight: 8 }} />
                            )}
                            <Text style={typography.buttonText}>
                                {submittingFalsaAlarma ? 'Registrando acta...' : 'Confirmar Falsa Alarma'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    navBarTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    profileShortcut: {
        padding: 2,
    },
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.md,
        paddingBottom: spacing.xl,
    },
    mainHeaderCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md + 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    typeAndIdWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        flex: 1,
    },
    bigIconWrap: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emergencyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    emergencyId: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    currentStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.round,
    },
    currentStatusText: {
        fontSize: 11.5,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    actionSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
    },
    readOnlyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: '#FFFAEB',
        borderWidth: 1,
        borderColor: '#FEDF89',
        borderRadius: radius.md,
        padding: spacing.sm + 4,
    },
    readOnlyBannerText: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: '600',
        color: '#B54708',
        lineHeight: 18,
    },
    sequentialActionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    sequentialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
    },
    primaryActionBtn: {
        backgroundColor: colors.info,
    },
    successActionBtn: {
        backgroundColor: colors.success,
    },
    primaryActionBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.surface,
    },
    dangerOutlineBtn: {
        backgroundColor: '#FFF5F5',
        borderWidth: 1.5,
        borderColor: '#FDA29B',
    },
    dangerOutlineBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#B42318',
    },
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md + 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardSectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 0.5,
        marginBottom: spacing.xs + 2,
    },
    addressMainText: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        lineHeight: 22,
    },
    referenceText: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 4,
    },
    dateSubText: {
        fontSize: 12.5,
        color: colors.textMuted,
        marginTop: 6,
    },
    mapHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    openGpsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.info,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.round,
    },
    openGpsText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: colors.surface,
    },
    mapCanvas: {
        height: 200,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
    },
    mapPinOverlay: {
        position: 'absolute',
        top: '50%',
        left: '48.5%',
        marginTop: -34,
        marginLeft: -19,
    },
    zoomControls: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    zoomBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomBtnTop: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    zoomBtnSymbol: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    mapFooterBadge: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    mapCoordsText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text,
    },
    mapAttribution: {
        fontSize: 10.5,
        color: colors.info,
        fontWeight: '600',
    },
    witnessRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    witnessBigCount: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.primary,
    },
    witnessSubtitle: {
        fontSize: 12.5,
        color: colors.textMuted,
    },
    secondaryActionBtn: {
        backgroundColor: '#EEF4FF',
        borderWidth: 1,
        borderColor: '#C7D7FE',
        paddingHorizontal: spacing.md,
        paddingVertical: 9,
        borderRadius: radius.sm + 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1D4ED8',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    reporterName: {
        fontSize: 14.5,
        fontWeight: '800',
        color: colors.text,
        lineHeight: 20,
    },
    reporterDni: {
        fontSize: 12.5,
        color: colors.textMuted,
        marginTop: 3,
    },
    iaApprovalBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.round,
        marginTop: spacing.sm,
    },
    iaApprovalText: {
        fontSize: 11,
        fontWeight: '800',
    },
    detailButtonsCol: {
        gap: spacing.xs + 2,
        alignItems: 'stretch',
    },
    callReporterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm + 2,
        borderWidth: 1,
        borderColor: '#FDA29B',
        backgroundColor: '#FFF5F5',
    },
    callReporterText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 40, 0.55)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.lg + 4,
        borderTopRightRadius: radius.lg + 4,
        padding: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    witnessItemCard: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    witnessItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: 6,
    },
    witnessAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    witnessItemName: {
        fontSize: 13.5,
        fontWeight: '800',
        color: colors.text,
    },
    witnessItemMeta: {
        fontSize: 11.5,
        color: colors.textMuted,
    },
    witnessComment: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 19,
    },
    evidencePreviewBox: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        marginVertical: spacing.sm,
    },
    evidenceIconBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    evidenceVisualTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
    },
    evidenceTimestamp: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    evidenceDetailRow: {
        marginTop: spacing.sm,
    },
    evidenceDetailLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textMuted,
        marginBottom: 2,
    },
    evidenceDetailBody: {
        fontSize: 13.5,
        color: colors.text,
        lineHeight: 20,
    },
    evidenceRealImage: {
        width: '100%',
        height: 190,
        borderRadius: radius.sm,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
    },
    cierrePhotoPreviewWrap: {
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    cierrePhotoPreview: {
        width: '100%',
        height: 170,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    retakePhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    retakePhotoText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.text,
    },
    cierreCameraBtn: {
        height: 120,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    cierreCameraText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.primary,
    },
    cierreInputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    cierreTextInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: 14,
        color: colors.text,
        minHeight: 84,
    },
    cierreSummaryBox: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.xs + 2,
    },
    cierreSummaryLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    cierreSummaryImage: {
        width: '100%',
        height: 170,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    cierreSummaryText: {
        fontSize: 13.5,
        color: colors.text,
        lineHeight: 20,
    },
    confirmBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 40, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    confirmCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    confirmIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#D1E9FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm + 2,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    confirmMessage: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    confirmButtonsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    confirmCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    confirmAcceptBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.info,
    },
    confirmAcceptText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.surface,
    },
    motivosWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs + 2,
        marginBottom: spacing.sm + 2,
    },
    motivoChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    motivoChipSelected: {
        borderColor: colors.primary,
        backgroundColor: '#FFF5F5',
    },
    motivoChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    motivoChipTextSelected: {
        color: colors.primary,
        fontWeight: '700',
    },
});

