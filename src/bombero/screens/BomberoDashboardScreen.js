import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { useUser } from '../../context/UserContext';
import { iconoTipo } from '../../screens/ReportEmergencyScreen';
import { getBomberoEmergencies } from '../services/bomberoService';

const STATUS_STACK_ROUTES = [
    {
        key: 'Pendiente',
        routeName: 'BomberoPendientes',
        label: 'Pendientes',
        activeBg: '#FEF0C7',
        activeBorder: '#FEC84B',
        activeText: '#B54708',
    },
    {
        key: 'En Proceso',
        routeName: 'BomberoEnProceso',
        label: 'En Proceso',
        activeBg: '#D1E9FF',
        activeBorder: '#84CAFF',
        activeText: '#175CD3',
    },
    {
        key: 'Culminado',
        routeName: 'BomberoCulminados',
        label: 'Culminados',
        activeBg: '#D1FADF',
        activeBorder: '#6CE9A6',
        activeText: '#027A48',
    },
    {
        key: 'Falsa Alarma',
        routeName: 'BomberoFalsas',
        label: 'Falsas',
        activeBg: '#FEE4E2',
        activeBorder: '#FDA29B',
        activeText: '#EF3B4E',
    },
];

export const STATUS_BADGE_MAP = {
    Pendiente: {
        label: 'PENDIENTE',
        bg: '#FEF0C7',
        color: '#B54708',
        accent: '#F79009',
    },
    'En Proceso': {
        label: 'EN PROCESO',
        bg: '#D1E9FF',
        color: '#175CD3',
        accent: '#2E90FA',
    },
    Culminado: {
        label: 'CULMINADO',
        bg: '#D1FADF',
        color: '#027A48',
        accent: '#12B76A',
    },
    'Falsa Alarma': {
        label: 'FALSA ALARMA',
        bg: '#F2F4F7',
        color: '#475467',
        accent: '#EF3B4E',
    },
};

export default function BomberoDashboardScreen({ route, navigation }) {
    const { user } = useUser();
    const currentStatusFilter = route.params?.statusFilter || 'Pendiente';

    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const cargarDatos = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const list = await getBomberoEmergencies();
            setEmergencies(list);
        } catch (err) {
            console.error('Error cargando emergencias:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargarDatos(true);
        }, [cargarDatos])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        cargarDatos(true);
    };

    const handleNavigateStatus = (routeName) => {
        if (route.name !== routeName) {
            navigation.navigate(routeName);
        }
    };

    const counts = useMemo(() => {
        return {
            Pendiente: emergencies.filter((e) => e.estado === 'Pendiente').length,
            'En Proceso': emergencies.filter((e) => e.estado === 'En Proceso').length,
            Culminado: emergencies.filter((e) => e.estado === 'Culminado').length,
            'Falsa Alarma': emergencies.filter((e) => e.estado === 'Falsa Alarma').length,
        };
    }, [emergencies]);

    const totalUnidades = 3;
    const unidadesDisponibles = Math.max(0, totalUnidades - counts['En Proceso']);

    const filteredEmergencies = useMemo(
        () => emergencies.filter((e) => e.estado === currentStatusFilter),
        [emergencies, currentStatusFilter]
    );

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                {/* 1. Header Institucional con acceso a Mi Perfil */}
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <View style={styles.shieldBox}>
                            <MaterialCommunityIcons name="shield-outline" size={24} color={colors.primary} />
                        </View>
                        <View>
                            <View style={styles.titleWithDot}>
                                <Text style={styles.brandTitle}>OmniGuard</Text>
                                <View style={styles.onlineDot} />
                            </View>
                            <Text style={styles.stationSubtitle}>
                                {user?.direccionEstacion || 'Cap. José A. Quiñonez N° 108'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.profileButton}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('BomberoProfile')}
                    >
                        <View style={styles.profileAvatar}>
                            <Ionicons name="person" size={15} color={colors.surface} />
                        </View>
                        <Text style={styles.profileButtonText}>Mi Perfil</Text>
                    </TouchableOpacity>
                </View>

                {/* 2. Panel de Unidades Disponibles, KPIs de Estado y Botón de Mapa de Calor debajo */}
                <View style={styles.topMetricsWrap}>
                    <View style={styles.unitsCard}>
                        <Text style={styles.unitsLabel}>UNIDADES DISPONIBLES</Text>
                        <View style={styles.unitsValueRow}>
                            <Text style={styles.unitsBigNumber}>{unidadesDisponibles}</Text>
                            <Text style={styles.unitsTotalNumber}>/ {totalUnidades}</Text>
                        </View>
                    </View>

                    {/* Tarjeta de contadores (Pendientes / En Proceso / Culminados) */}
                    <View style={styles.kpiRowCard}>
                        <TouchableOpacity
                            style={styles.kpiItem}
                            activeOpacity={0.75}
                            onPress={() => handleNavigateStatus('BomberoPendientes')}
                        >
                            <Text style={[styles.kpiNumber, { color: colors.warning }]}>
                                {counts.Pendiente}
                            </Text>
                            <Text style={styles.kpiLabel}>Pendientes</Text>
                        </TouchableOpacity>

                        <View style={styles.kpiDivider} />

                        <TouchableOpacity
                            style={styles.kpiItem}
                            activeOpacity={0.75}
                            onPress={() => handleNavigateStatus('BomberoEnProceso')}
                        >
                            <Text style={[styles.kpiNumber, { color: colors.info }]}>
                                {counts['En Proceso']}
                            </Text>
                            <Text style={styles.kpiLabel}>En Proceso</Text>
                        </TouchableOpacity>

                        <View style={styles.kpiDivider} />

                        <TouchableOpacity
                            style={styles.kpiItem}
                            activeOpacity={0.75}
                            onPress={() => handleNavigateStatus('BomberoCulminados')}
                        >
                            <Text style={[styles.kpiNumber, { color: colors.success }]}>
                                {counts.Culminado}
                            </Text>
                            <Text style={styles.kpiLabel}>Culminados</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Botón Mapa de Calor debajo de la tarjeta de contadores */}
                    <TouchableOpacity
                        style={styles.heatmapButton}
                        activeOpacity={0.82}
                        onPress={() => navigation.navigate('BomberoHeatmap')}
                    >
                        <View style={styles.heatmapButtonLeft}>
                            <View style={styles.heatmapIconWrap}>
                                <MaterialCommunityIcons name="fire-circle" size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.heatmapButtonText}>Mapa de calor</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* 3. Barra uniforme de Estados de Emergencia (Stack Navigation) */}
                <View style={styles.tabsRow}>
                    {STATUS_STACK_ROUTES.map((tab) => {
                        const isActive = currentStatusFilter === tab.key;
                        const count = counts[tab.key] || 0;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[
                                    styles.tabButton,
                                    isActive && {
                                        backgroundColor: tab.activeBg,
                                        borderColor: tab.activeBorder,
                                    },
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleNavigateStatus(tab.routeName)}
                            >
                                <View
                                    style={[
                                        styles.tabCountBadge,
                                        isActive
                                            ? { backgroundColor: tab.activeText }
                                            : { backgroundColor: '#F2F4F7' },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tabCountText,
                                            isActive
                                                ? { color: colors.surface }
                                                : { color: colors.textMuted },
                                        ]}
                                    >
                                        {count}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.tabButtonText,
                                        isActive && { color: tab.activeText, fontWeight: '800' },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 4. Lista de Emergencias */}
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[typography.caption, { marginTop: spacing.sm }]}>
                            Sincronizando central de emergencias...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredEmergencies}
                        keyExtractor={(item) => String(item.id)}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <MaterialCommunityIcons
                                    name="shield-check-outline"
                                    size={44}
                                    color={colors.textMuted}
                                />
                                <Text style={styles.emptyTitle}>Sin emergencias en esta bandeja</Text>
                                <Text style={typography.caption}>
                                    No hay reportes en estado "{currentStatusFilter}" por el momento.
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const statusStyle = STATUS_BADGE_MAP[item.estado] || STATUS_BADGE_MAP.Pendiente;
                            const isIaApproved = item.iaValidacion?.estado === 'Aprobado';
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.emergencyCard,
                                        { borderLeftColor: statusStyle.accent },
                                    ]}
                                    activeOpacity={0.82}
                                    onPress={() =>
                                        navigation.navigate('BomberoEmergencyDetail', {
                                            emergencyId: item.id,
                                            emergency: item,
                                        })
                                    }
                                >
                                    <View style={styles.cardTopRow}>
                                        <View style={styles.iconAndTitle}>
                                            <View style={styles.typeIconBox}>
                                                {iconoTipo[item.tipo] || iconoTipo['Otro']}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.cardTitle}>{item.tipo}</Text>
                                                <View style={styles.witnessRow}>
                                                    <Ionicons name="people" size={14} color={colors.text} />
                                                    <Text style={styles.witnessText}>
                                                        {item.testigosCount || 1} testigo(s)
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.rightMeta}>
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: statusStyle.bg },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusBadgeText,
                                                        { color: statusStyle.color },
                                                    ]}
                                                >
                                                    {statusStyle.label}
                                                </Text>
                                            </View>
                                            <Text style={styles.dateText}>
                                                {item.fechaCorta || item.fecha}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.addressPreviewRow}>
                                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.addressPreviewText} numberOfLines={1}>
                                            {item.direccion}
                                        </Text>
                                    </View>

                                    <View style={styles.cardBottomRow}>
                                        <Text style={styles.iaLabel}>
                                            IA:{' '}
                                            <Text
                                                style={{
                                                    color: isIaApproved ? colors.success : colors.danger,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                {item.iaValidacion?.estado || 'Aprobado'}
                                            </Text>{' '}
                                            ({item.iaValidacion?.porcentaje ?? 95}%)
                                        </Text>

                                        <View style={styles.detailLink}>
                                            <Text style={styles.detailLinkText}>Ver detalles</Text>
                                            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
    },
    shieldBox: {
        width: 42,
        height: 42,
        borderRadius: radius.md,
        backgroundColor: '#FEE4E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWithDot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    onlineDot: {
        width: 9,
        height: 9,
        borderRadius: radius.round,
        backgroundColor: colors.success,
    },
    stationSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 1,
    },
    profileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: 7,
        borderRadius: radius.round,
        borderWidth: 1,
        borderColor: colors.border,
    },
    profileAvatar: {
        width: 24,
        height: 24,
        borderRadius: radius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileButtonText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.text,
    },
    topMetricsWrap: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    unitsCard: {
        backgroundColor: '#ECFDF3',
        borderWidth: 1,
        borderColor: '#ABEFC6',
        borderRadius: radius.md,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitsLabel: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#027A48',
        letterSpacing: 0.6,
    },
    unitsValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 2,
    },
    unitsBigNumber: {
        fontSize: 26,
        fontWeight: '900',
        color: '#12B76A',
    },
    unitsTotalNumber: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475467',
        marginLeft: 4,
    },
    kpiRowCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.sm + 4,
    },
    kpiItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    kpiDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    kpiNumber: {
        fontSize: 22,
        fontWeight: '900',
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        marginTop: 2,
    },
    heatmapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
    },
    heatmapButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    heatmapIconWrap: {
        width: 30,
        height: 30,
        borderRadius: radius.round,
        backgroundColor: '#FEE4E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heatmapButtonText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.text,
    },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        gap: 8,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        paddingHorizontal: 4,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    tabCountBadge: {
        minWidth: 24,
        height: 20,
        borderRadius: radius.round,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 7,
    },
    tabCountText: {
        fontSize: 11,
        fontWeight: '800',
    },
    tabButtonText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textMuted,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        gap: spacing.sm,
    },
    emergencyCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    iconAndTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        flex: 1,
    },
    typeIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.sm,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    witnessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
    },
    witnessText: {
        fontSize: 12.5,
        color: colors.textMuted,
        fontWeight: '500',
    },
    rightMeta: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.round,
    },
    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    dateText: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 6,
    },
    addressPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.sm,
        paddingTop: spacing.xs,
    },
    addressPreviewText: {
        fontSize: 12.5,
        color: colors.textMuted,
        flex: 1,
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: '#F2F4F7',
    },
    iaLabel: {
        fontSize: 12.5,
        color: colors.textMuted,
    },
    detailLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    detailLinkText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.primary,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl * 1.5,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginTop: 4,
    },
});
