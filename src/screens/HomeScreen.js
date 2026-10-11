import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, radius } from '../styles/globalStyles';
import { useUser } from '../context/UserContext';

export default function HomeScreen({ navigation }) {
    const { user } = useUser();

    // Obtener primer nombre del usuario formateado
    const rawNombre =
        user?.datosReniec?.first_name?.trim()?.split(/\s+/)[0] ||
        user?.nombre?.trim()?.split(/\s+/)[0] ||
        '';
    const primerNombre = rawNombre
        ? rawNombre.charAt(0).toUpperCase() + rawNombre.slice(1).toLowerCase()
        : '';

    const pregunta = primerNombre ? `¿Necesitas ayuda ${primerNombre}?` : '¿Necesitas ayuda?';

    const llamarEmergencia = (numero, servicio) => {
        const url = `tel:${numero}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Llamada rápida', `Llama directamente marcando al ${numero} (${servicio}).`);
                }
            })
            .catch(() => {
                Alert.alert('Llamada rápida', `Llama directamente marcando al ${numero} (${servicio}).`);
            });
    };

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                {/* 1. Header con espaciado generoso e indicador de estado */}
                <View style={styles.header}>
                    <View style={styles.statusPill}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>OmniGuard Activo · Central 116</Text>
                    </View>

                    <Text style={styles.title}>{pregunta}</Text>
                    <Text style={styles.subtitle}>
                        Envía una alerta geolocalizada a los bomberos o contacta líneas de auxilio en tiempo real.
                    </Text>
                </View>

                {/* 2. ThumbZone: Botón Principal de Emergencia ergonómico */}
                <View style={styles.thumbZone}>
                    <TouchableOpacity
                        style={styles.emergencyCard}
                        activeOpacity={0.88}
                        onPress={() => navigation.navigate('ReportEmergency')}
                    >
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="alert-octagon" size={46} color={colors.surface} />
                        </View>
                        <Text style={styles.emergencyTitle}>REPORTAR EMERGENCIA</Text>
                        <Text style={styles.emergencySubtitle}>
                            Toca aquí para enviar auxilio inmediato
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 3. Accesos de alta utilidad: Marcado rápido de auxilio */}
                <View style={styles.supportSection}>
                    <Text style={styles.supportLabel}>Llamadas directas de emergencia</Text>
                    <View style={styles.supportRow}>
                        <TouchableOpacity
                            style={styles.callCard}
                            activeOpacity={0.8}
                            onPress={() => llamarEmergencia('116', 'Bomberos')}
                        >
                            <View style={[styles.callIconWrap, { backgroundColor: '#FEE4E2' }]}>
                                <MaterialCommunityIcons name="fire-truck" size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.callNumber}>116</Text>
                            <Text style={styles.callName}>Bomberos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.callCard}
                            activeOpacity={0.8}
                            onPress={() => llamarEmergencia('105', 'Policía')}
                        >
                            <View style={[styles.callIconWrap, { backgroundColor: '#E0EAFF' }]}>
                                <MaterialCommunityIcons name="shield-check" size={24} color="#3538CD" />
                            </View>
                            <Text style={styles.callNumber}>105</Text>
                            <Text style={styles.callName}>Policía</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.callCard}
                            activeOpacity={0.8}
                            onPress={() => llamarEmergencia('106', 'SAMU')}
                        >
                            <View style={[styles.callIconWrap, { backgroundColor: '#D1FADF' }]}>
                                <MaterialCommunityIcons name="ambulance" size={24} color="#027A48" />
                            </View>
                            <Text style={styles.callNumber}>106</Text>
                            <Text style={styles.callName}>SAMU</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    header: {
        marginTop: spacing.sm,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.round,
        marginBottom: spacing.md,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: radius.round,
        backgroundColor: colors.success,
        marginRight: spacing.xs + 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success,
    },
    title: {
        fontSize: 27,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 21,
    },
    thumbZone: {
        marginVertical: spacing.lg,
    },
    emergencyCard: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg + 4,
        paddingVertical: spacing.xl + 4,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.38,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: radius.round,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    emergencyTitle: {
        color: colors.surface,
        fontSize: 19,
        fontWeight: '900',
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    emergencySubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
    },
    supportSection: {
        marginBottom: spacing.xs,
    },
    supportLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: spacing.sm + 2,
    },
    supportRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    callCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    callIconWrap: {
        width: 44,
        height: 44,
        borderRadius: radius.round,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    callNumber: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    callName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        marginTop: 1,
    },
});
