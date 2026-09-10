import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { useUser } from '../context/UserContext';

export default function HomeScreen({ navigation }) {
    const { user } = useUser();
    let initials = '?';
    if (user?.datosReniec?.first_name && user?.datosReniec?.first_last_name) {
        initials = `${user.datosReniec.first_name[0]}${user.datosReniec.first_last_name[0]}`.toUpperCase();
    } else if (user?.nombre) {
        const parts = user.nombre.trim().split(/\s+/);
        if (parts.length >= 2) {
            initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        } else if (parts.length === 1) {
            initials = parts[0][0].toUpperCase();
        }
    }

    return (
        <SafeAreaView style={globalStyles.screen}>
            <View style={globalStyles.container}>
                {/* Header con perfil arriba a la derecha */}
                <View style={globalStyles.header}>
                    <View>
                        <Text style={typography.h1}>¿Necesitas ayuda?</Text>
                        <Text style={[typography.caption, { marginTop: 2 }]}>
                            Reporta una emergencia o monitorea{'\n'}tu ciudad en tiempo real.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={globalStyles.avatar}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Text style={globalStyles.avatarText}>{initials}</Text>
                    </TouchableOpacity>
                </View>

                {/* Botón principal: Reportar Emergencia */}
                <TouchableOpacity
                    style={styles.emergencyCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('ReportEmergency')}
                >
                    <MaterialCommunityIcons name="alert" size={44} color={colors.surface} />
                    <Text style={styles.emergencyTitle}>REPORTAR EMERGENCIA</Text>
                    <Text style={styles.emergencySubtitle}>Toca aquí si hay una emergencia</Text>
                </TouchableOpacity>

                {/* Accesos: Mis Reportes / Monitor */}
                <View style={styles.row}>
                    <TouchableOpacity
                        style={[globalStyles.card, styles.smallCard]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('MisReportes')}
                    >
                        <View style={styles.smallCardTop}>
                            <Ionicons name="time-outline" size={22} color={colors.info} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                        <Text style={styles.smallCardTitle}>Mis Reportes</Text>
                        <Text style={typography.caption}>Ver historial</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[globalStyles.card, styles.smallCard]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('Monitor')}
                    >
                        <View style={styles.smallCardTop}>
                            <Ionicons name="map-outline" size={22} color={colors.success} />
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                        <Text style={styles.smallCardTitle}>Monitor</Text>
                        <Text style={typography.caption}>Ver ciudad</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    emergencyCard: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        paddingVertical: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
    },
    emergencyTitle: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: '800',
        marginTop: spacing.sm,
        letterSpacing: 0.5,
    },
    emergencySubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    smallCard: {
        flex: 1,
    },
    smallCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    smallCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
});
