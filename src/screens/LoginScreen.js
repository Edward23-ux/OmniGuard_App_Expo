import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
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
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
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
                        />
                        {!!error && <Text style={styles.errorText}>{error}</Text>}

                        <TouchableOpacity
                            style={[
                                globalStyles.primaryButton,
                                styles.button,
                                !isValidDni && globalStyles.primaryButtonDisabled,
                            ]}
                            activeOpacity={0.85}
                            disabled={!isValidDni}
                            onPress={handleSubmit}
                        >
                            <Text style={typography.buttonText}>Ingresar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
