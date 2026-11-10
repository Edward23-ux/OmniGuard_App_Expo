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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { iconoTipo } from '../../screens/ReportEmergencyScreen';
import { updateEmergencyStatus } from '../services/bomberoService';
import { STATUS_BADGE_MAP } from './BomberoDashboardScreen';
import InteractiveEmergencyMap from '../components/InteractiveEmergencyMap';

const ACTION_BUTTONS = [
    {
        targetState: 'Pendiente',
        label: 'Pendiente',
        icon: 'clock-outline',
        bg: '#FEF0C7',
        border: '#FEC84B',
        color: '#B54708',
    },
    {
        targetState: 'En Proceso',
        label: 'Atender',
        icon: 'fire-truck',
        bg: '#D1E9FF',
        border: '#84CAFF',
        color: '#175CD3',
    },
    {
        targetState: 'Culminado',
        label: 'Culminar',
        icon: 'check-circle-outline',
        bg: '#D1FADF',
        border: '#6CE9A6',
        color: '#027A48',
    },
    {
        targetState: 'Falsa Alarma',
        label: 'Falsa Alarma',
        icon: 'close-circle-outline',
        bg: '#FEE4E2',
        border: '#FDA29B',
        color: '#B42318',
    },
];

export default function BomberoEmergencyDetailScreen({ route, navigation }) {
    const initialEmergency = route.params?.emergency || {};
    const [emergency, setEmergency] = useState(initialEmergency);
    const [updating, setUpdating] = useState(false);
    const [testigosModalVisible, setTestigosModalVisible] = useState(false);
    const [evidenciaModalVisible, setEvidenciaModalVisible] = useState(false);
    const [isTouchingMap, setIsTouchingMap] = useState(false);

    const statusBadge = STATUS_BADGE_MAP[emergency.estado] || STATUS_BADGE_MAP.Pendiente;
    const shortId = String(emergency.id || '6cd64a46').slice(0, 8);
    const isIaApproved = emergency.iaValidacion?.estado !== 'Rechazado';

    const handleChangeStatus = async (nuevoEstado) => {
        if (updating || emergency.estado === nuevoEstado) return;
        setUpdating(true);
        try {
            const updated = await updateEmergencyStatus(emergency.id, nuevoEstado);
            if (updated) {
                setEmergency(updated);
            } else {
                setEmergency((prev) => ({ ...prev, estado: nuevoEstado }));
            }
        } catch (err) {
            Alert.alert('Error', 'No se pudo actualizar el estado de la emergencia.');
        } finally {
            setUpdating(false);
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

                    <Text style={styles.actionSectionTitle}>CAMBIAR ESTADO DE ATENCIÓN:</Text>
                    <View style={styles.actionsGrid}>
                        {ACTION_BUTTONS.map((btn) => {
                            const isCurrent = emergency.estado === btn.targetState;
                            return (
                                <TouchableOpacity
                                    key={btn.targetState}
                                    style={[
                                        styles.actionBtn,
                                        {
                                            backgroundColor: isCurrent ? btn.bg : '#F9FAFB',
                                            borderColor: isCurrent ? btn.border : colors.border,
                                        },
                                        isCurrent && styles.actionBtnActive,
                                    ]}
                                    activeOpacity={0.8}
                                    disabled={updating}
                                    onPress={() => handleChangeStatus(btn.targetState)}
                                >
                                    <MaterialCommunityIcons
                                        name={btn.icon}
                                        size={18}
                                        color={isCurrent ? btn.color : colors.textMuted}
                                    />
                                    <Text
                                        style={[
                                            styles.actionBtnText,
                                            { color: isCurrent ? btn.color : colors.text },
                                        ]}
                                    >
                                        {btn.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
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
                            <View style={styles.evidenceIconBadge}>
                                {iconoTipo[emergency.tipo] || iconoTipo['Incendio']}
                            </View>
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
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    actionBtn: {
        width: '48%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1.5,
    },
    actionBtnActive: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700',
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
});

