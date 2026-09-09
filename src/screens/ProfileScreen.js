import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { useUser } from '../context/UserContext';

export default function ProfileScreen({ navigation }) {
    const { user, logout } = useUser();
    const initials = user?.nombre
        ? user.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')
        : '?';

    const handleLogout = () => {
        logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    return (
        <SafeAreaView style={globalStyles.screen}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Mi Perfil</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.avatarWrap}>
                    <View style={styles.bigAvatar}>
                        <Text style={styles.bigAvatarText}>{initials}</Text>
                    </View>
                    <Text style={[typography.h2, { marginTop: spacing.md }]}>
                        {user?.nombre ?? 'Usuario'}
                    </Text>
                    <Text style={typography.caption}>Ciudadano verificado</Text>
                </View>

                <View style={[globalStyles.card, styles.infoCard]}>
                    <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={20} color={colors.textMuted} />
                        <View style={{ marginLeft: spacing.sm }}>
                            <Text style={typography.caption}>DNI</Text>
                            <Text style={styles.infoValue}>{user?.dni ?? '--------'}</Text>
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

                <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    <Text style={styles.logoutText}>Cerrar sesión</Text>
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
    logoutText: {
        color: colors.danger,
        fontWeight: '700',
        fontSize: 15,
    },
});
