import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';

const STATUS_STYLES = {
    Pendiente: { bg: '#FEF0C7', color: '#B54708' },
    Asignado: { bg: '#E0E7FF', color: '#3730A3' },
    'En Proceso': { bg: '#D1E9FF', color: '#175CD3' },
    Culminado: { bg: '#D1FADF', color: '#027A48' },
    'Falsa Alarma': { bg: '#FEE4E2', color: '#B42318' },
};

function normalizarEstado(estado) {
    if (!estado) return 'Pendiente';
    const clave = String(estado).trim().toLowerCase().replace(/\s+/g, '_');
    const mapa = {
        pendiente: 'Pendiente',
        asignado: 'Asignado',
        en_proceso: 'En Proceso',
        en_camino: 'En Proceso',
        en_atencion: 'En Proceso',
        culminado: 'Culminado',
        resuelto_campo: 'Culminado',
        cerrado: 'Culminado',
        falsa_alarma: 'Falsa Alarma',
    };
    return mapa[clave] || estado;
}

export default function CitizenReportDetailScreen({ route, navigation }) {
    const reporte = route.params?.reporte || {};
    const estadoNormalizado = normalizarEstado(reporte.estado);
    const statusStyle = STATUS_STYLES[estadoNormalizado] ?? STATUS_STYLES.Pendiente;

    const informeBombero = reporte.informeBombero || reporte.informe_bombero || null;
    const fotoCierreUrl = reporte.fotoCierreUrl || reporte.foto_cierre_url || null;
    const fotoOriginalUrl = reporte.fotoUrl || reporte.foto_url || reporte.imageUri || null;

    const tieneResolucion =
        Boolean(informeBombero || fotoCierreUrl) ||
        estadoNormalizado === 'Culminado' ||
        estadoNormalizado === 'Falsa Alarma';

    const direccionTexto =
        reporte.direccion ||
        (reporte.coordenadas
            ? `Lat: ${Number(reporte.coordenadas.lat).toFixed(5)}, Lng: ${Number(reporte.coordenadas.lng).toFixed(5)}`
            : 'Ubicación GPS registrada');

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={styles.headerBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={10}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={typography.h2}>Detalle del Reporte</Text>
                <View style={{ width: 30 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Cabecera de Estado */}
                <View style={styles.card}>
                    <View style={styles.headerTopRow}>
                        <Text style={styles.detailTitle}>{reporte.tipo || 'Emergencia'}</Text>
                        <View style={[globalStyles.badge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[globalStyles.badgeText, { color: statusStyle.color }]}>
                                {estadoNormalizado}
                            </Text>
                        </View>
                    </View>

                    {Boolean(reporte.companiaAsignada) && (
                        <View style={styles.companyRow}>
                            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                            <Text style={styles.companyText}>{reporte.companiaAsignada}</Text>
                        </View>
                    )}
                </View>

                {/* 2. Bloque Superior (Más Reciente): Resolución de la Unidad */}
                <View style={styles.card}>
                    <Text style={styles.blockLabel}>Resolución de la Unidad</Text>
                    {tieneResolucion && (informeBombero || fotoCierreUrl) ? (
                        <View style={styles.resolutionBody}>
                            {Boolean(informeBombero) && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Informe del efectivo</Text>
                                    <Text style={styles.detailValue}>{informeBombero}</Text>
                                </View>
                            )}
                            {Boolean(fotoCierreUrl) && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Evidencia fotográfica de cierre</Text>
                                    <Image
                                        source={{ uri: fotoCierreUrl }}
                                        style={styles.closureImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.waitingBox}>
                            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.waitingText}>En espera de resolución en campo</Text>
                        </View>
                    )}
                </View>

                {/* 3. Bloque Inferior (Más Antiguo): Reporte Original del Ciudadano */}
                <View style={styles.card}>
                    <Text style={styles.blockLabel}>Reporte Original del Ciudadano</Text>

                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Fecha y hora de envío</Text>
                        <Text style={styles.detailValue}>{reporte.fecha || 'Reciente'}</Text>
                    </View>

                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Dirección / Coordenadas</Text>
                        <Text style={styles.detailValue}>{direccionTexto}</Text>
                    </View>

                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Descripción</Text>
                        <Text style={styles.detailValue}>
                            {reporte.descripcion ||
                                `Alerta de emergencia de tipo ${reporte.tipo || 'Emergencia'} enviada desde la plataforma ciudadana.`}
                        </Text>
                    </View>

                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Fotografía enviada</Text>
                        {fotoOriginalUrl ? (
                            <Image
                                source={{ uri: fotoOriginalUrl }}
                                style={styles.evidenceImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={typography.caption}>Sin fotografía adjunta</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerBar: {
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
        padding: 4,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.md,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    detailTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: colors.text,
        flex: 1,
    },
    companyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    companyText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: colors.text,
    },
    blockLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resolutionBody: {
        gap: spacing.md,
    },
    waitingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    waitingText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: colors.textMuted,
    },
    detailSection: {
        gap: 4,
    },
    detailLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    detailValue: {
        fontSize: 14.5,
        color: colors.text,
        lineHeight: 20,
    },
    closureImage: {
        width: '100%',
        height: 240,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        marginTop: 4,
    },
    evidenceImage: {
        width: '100%',
        height: 200,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        marginTop: 4,
    },
});
