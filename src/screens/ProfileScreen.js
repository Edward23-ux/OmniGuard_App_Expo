import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { useUser } from '../context/UserContext';

function formatFullName(name) {
    if (!name || !name.trim()) return 'Usuario';
    return name
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toLocaleUpperCase('es-PE') + word.slice(1).toLocaleLowerCase('es-PE'))
        .join(' ');
}

export default function ProfileScreen({ navigation }) {
    const { user, logout } = useUser();
    const [loggingOut, setLoggingOut] = useState(false);
    const lastUserRef = useRef(user);
    if (user) {
        lastUserRef.current = user;
    }
    const displayUser = user ?? lastUserRef.current;

    let initials = '?';
    if (displayUser?.datosReniec?.first_name && displayUser?.datosReniec?.first_last_name) {
        initials = `${displayUser.datosReniec.first_name[0]}${displayUser.datosReniec.first_last_name[0]}`.toUpperCase();
    } else if (displayUser?.nombre) {
        const parts = displayUser.nombre.trim().split(/\s+/);
        if (parts.length >= 2) {
            initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        } else if (parts.length === 1) {
            initials = parts[0][0].toUpperCase();
        }
    }

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch {
            setLoggingOut(false);
        }
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    };

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Mi Perfil</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.avatarWrap}>
                    <View style={styles.bigAvatar}>
                        <Text style={styles.bigAvatarText}>{initials}</Text>
                    </View>
                    <Text style={[typography.h2, styles.userName]}>
                        {formatFullName(displayUser?.nombre)}
                    </Text>
                    <Text style={typography.caption}>Ciudadano verificado</Text>
                </View>

                <View style={[globalStyles.card, styles.infoCard]}>
                    <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={20} color={colors.textMuted} />
                        <View style={{ marginLeft: spacing.sm }}>
                            <Text style={typography.caption}>DNI</Text>
                            <Text style={styles.infoValue}>{displayUser?.dni ?? '--------'}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { marginTop: spacing.md }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                        <View style={{ marginLeft: spacing.sm }}>
                            <Text style={typography.caption}>Estado de identidad</Text>
                            <Text style={[styles.infoValue, { color: colors.success }]}>Validado</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
                    activeOpacity={0.8}
                    disabled={loggingOut}
                    onPress={handleLogout}
                >
                    {loggingOut ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    )}
                    <Text style={styles.logoutText}>
                        {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    avatarWrap: {
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    bigAvatar: {
        width: 90,
        height: 90,
        borderRadius: radius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bigAvatarText: {
        color: colors.surface,
        fontSize: 30,
        fontWeight: '700',
    },
    userName: {
        marginTop: spacing.md,
        textAlign: 'center',
    },
    infoCard: {
        marginTop: spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
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
        gap: spacing.xs,
    },
    logoutButtonDisabled: {
        opacity: 0.65,
    },
    logoutText: {
        color: colors.danger,
        fontWeight: '700',
        fontSize: 15,
    },
});
