import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { useUser } from '../context/UserContext';

export default function LoginScreen({ navigation }) {
    const { login, consultarDniReniec } = useUser();
    const [dni, setDni] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isValidDni = dni.length === 8;

    const handleDniChange = (text) => {
        const onlyDigits = text.replace(/[^0-9]/g, '').slice(0, 8);
        setDni(onlyDigits);
        if (error) setError('');
        if (onlyDigits.length === 8) {
            Keyboard.dismiss();
        }
    };

    const handleSubmit = async () => {
        if (!isValidDni) {
            setError('El DNI debe tener 8 dígitos.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const userData = await consultarDniReniec(dni);
            login(userData);
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } catch (err) {
            setError(err.message || 'Error al consultar el DNI.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={globalStyles.screen}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Botón superior derecho "Soy bombero" */}
                <View style={styles.topHeader}>
                    <TouchableOpacity
                        style={styles.bomberoButton}
                        activeOpacity={0.82}
                        onPress={() => navigation.navigate('BomberoLogin')}
                    >
                        <MaterialCommunityIcons name="fire-truck" size={18} color={colors.primary} />
                        <Text style={styles.bomberoButtonText}>Soy bombero</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.logoWrap}>
                        <View style={styles.logoCircle}>
                            <MaterialCommunityIcons name="shield-alert" size={40} color={colors.surface} />
                        </View>
                        <Text style={typography.h1}>OmniGuard</Text>
                        <Text style={[typography.caption, styles.subtitle]}>
                            Seguridad urbana y emergencias en tiempo real
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Text style={typography.h2}>Ingresa con tu DNI</Text>
                        <Text style={[typography.caption, { marginBottom: spacing.md }]}>
                            Validamos tu identidad para evitar reportes falsos.
                        </Text>

                        <TextInput
                            style={[globalStyles.input, styles.dniInput]}
                            placeholder="00000000"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={8}
                            value={dni}
                            onChangeText={handleDniChange}
                            textAlign="center"
                            editable={!loading}
                        />
                        {!!error && <Text style={styles.errorText}>{error}</Text>}

                        <TouchableOpacity
                            style={[
                                globalStyles.primaryButton,
                                styles.button,
                                (!isValidDni || loading) && globalStyles.primaryButtonDisabled,
                            ]}
                            activeOpacity={0.85}
                            disabled={!isValidDni || loading}
                            onPress={handleSubmit}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.surface} />
                            ) : (
                                <Text style={typography.buttonText}>Ingresar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    bomberoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: 9,
        borderRadius: radius.round,
        borderWidth: 1.5,
        borderColor: 'rgba(239, 59, 78, 0.35)',
        shadowColor: colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    bomberoButtonText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.primary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    logoWrap: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoCircle: {
        width: 84,
        height: 84,
        borderRadius: radius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    form: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dniInput: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    errorText: {
        color: colors.danger,
        fontSize: 13,
        marginBottom: spacing.sm,
    },
    button: {
        marginTop: spacing.md,
    },
});
