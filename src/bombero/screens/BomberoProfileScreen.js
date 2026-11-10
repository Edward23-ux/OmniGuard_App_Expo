import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { useUser } from '../../context/UserContext';
import { getBomberoEmergencies } from '../services/bomberoService';

export default function BomberoProfileScreen({ navigation }) {
    const { user, logout } = useUser();
    const [stats, setStats] = useState({ total: 0, atendidas: 0, enProceso: 0 });

    useEffect(() => {
        getBomberoEmergencies().then((list) => {
            setStats({
                total: list.length,
                atendidas: list.filter((e) => e.estado === 'Culminado').length,
                enProceso: list.filter((e) => e.estado === 'En Proceso').length,
            });
        });
    }, []);

    const nombre = user?.nombre || 'Cap. Carlos Mendoza Vargas';
    const parts = nombre.replace(/^(Cap\.|Tnte\.|Subtnte\.)\s*/i, '').trim().split(/\s+/);
    const initials =
        parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : (parts[0]?.[0] || 'B').toUpperCase();

    const handleLogout = () => {
        logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

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
                <Text style={typography.h2}>Mi Perfil · Bombero</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar y Rango */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.bigAvatar}>
                            <Text style={styles.bigAvatarText}>{initials}</Text>
                        </View>
                        <View style={styles.badgeIconCircle}>
                            <MaterialCommunityIcons name="fire-truck" size={16} color={colors.surface} />
                        </View>
                    </View>

                    <Text style={[typography.h2, { marginTop: spacing.md, textAlign: 'center' }]}>
                        {nombre}
                    </Text>
                    <Text style={styles.rankBadge}>
                        {user?.rango || 'Capitán CBP'} · {user?.codigoBombero || 'CBP-10842'}
                    </Text>

                    <View style={styles.activeStatusPill}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeStatusText}>En Servicio Activo · Central 116</Text>
                    </View>
                </View>

                {/* Resumen de Guardia */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: colors.text }]}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Reportes Totales</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: colors.info }]}>{stats.enProceso}</Text>
                        <Text style={styles.statLabel}>En Proceso</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: colors.success }]}>{stats.atendidas}</Text>
                        <Text style={styles.statLabel}>Culminados</Text>
                    </View>
                </View>

                {/* Información Institucional y de Cuenta (usuarios_dashboard) */}
                <View style={[globalStyles.card, styles.infoCard]}>
                    <Text style={styles.sectionTitle}>DATOS DE OPERADOR (USUARIOS_DASHBOARD)</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <MaterialCommunityIcons name="shield-account-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={typography.caption}>Usuario / Correo</Text>
                            <Text style={styles.infoValue}>
                                {user?.usuario || 'bombero116'} ({user?.correo || 'bombero@omniguard.pe'})
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <MaterialCommunityIcons name="office-building-marker-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={typography.caption}>Compañía Asignada</Text>
                            <Text style={styles.infoValue}>
                                {user?.compania || 'Compañía Cap. José A. Quiñonez N° 108'}
                            </Text>
                            <Text style={styles.subInfoText}>
                                {user?.direccionEstacion || 'Cap. José A. Quiñonez N° 108, Lima'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={typography.caption}>Turno Operativo</Text>
                            <Text style={styles.infoValue}>
                                {user?.turno || 'Guardia Diurna / Nocturna (24h)'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={[styles.infoIconBox, { backgroundColor: '#ECFDF3' }]}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={typography.caption}>Tabla de Autenticación</Text>
                            <Text style={[styles.infoValue, { color: colors.success }]}>
                                Validado · Supabase (usuarios_dashboard)
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Botón Cerrar Sesión */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    activeOpacity={0.8}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    <Text style={styles.logoutText}>Cerrar sesión de bombero</Text>
                </TouchableOpacity>
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
    },
    bigAvatar: {
        width: 92,
        height: 92,
        borderRadius: radius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
    },
    bigAvatarText: {
        color: colors.surface,
        fontSize: 30,
        fontWeight: '800',
    },
    badgeIconCircle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.text,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankBadge: {
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.textMuted,
        marginTop: 4,
    },
    activeStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.round,
        marginTop: spacing.sm + 2,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 6,
    },
    activeStatusText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 11.5,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 2,
    },
    infoCard: {
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 0.6,
        marginBottom: spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
    },
    infoIconBox: {
        width: 38,
        height: 38,
        borderRadius: radius.sm + 2,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoValue: {
        fontSize: 14.5,
        fontWeight: '700',
        color: colors.text,
        marginTop: 1,
    },
    subInfoText: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.danger,
        backgroundColor: colors.surface,
        gap: spacing.xs + 2,
    },
    logoutText: {
        color: colors.danger,
        fontWeight: '700',
        fontSize: 15,
    },
});

