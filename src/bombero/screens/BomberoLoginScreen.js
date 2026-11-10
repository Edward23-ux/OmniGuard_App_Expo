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
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { useUser } from '../../context/UserContext';
import { authenticateBombero, DEMO_BOMBERO_CREDENTIALS } from '../services/bomberoService';

export default function BomberoLoginScreen({ navigation }) {
    const { login } = useUser();
    const [identificador, setIdentificador] = useState('bombero116');
    const [password, setPassword] = useState('123456');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isFormValid = identificador.trim().length >= 3 && password.trim().length >= 4;

    const handleSelectDemo = (cred) => {
        setIdentificador(cred.usuario);
        setPassword(cred.password);
        setError('');
    };

    const handleLogin = async () => {
        if (!isFormValid) {
            setError('Completa tu usuario y contraseña.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const bomberoData = await authenticateBombero(identificador, password);
            login(bomberoData);
            navigation.reset({ index: 0, routes: [{ name: 'BomberoStack' }] });
        } catch (err) {
            setError(err.message || 'No se pudo validar las credenciales.');
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
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Barra superior para regresar a Login ciudadano */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                            <Text style={styles.backButtonText}>Acceso ciudadano</Text>
                        </TouchableOpacity>

                        <View style={styles.dbBadge}>
                            <View style={styles.dbDot} />
                            <Text style={styles.dbBadgeText}>Central 116</Text>
                        </View>
                    </View>

                    {/* Encabezado de Bomberos */}
                    <View style={styles.logoWrap}>
                        <View style={styles.logoCircle}>
                            <MaterialCommunityIcons name="fire-truck" size={40} color={colors.surface} />
                        </View>
                        <Text style={typography.h1}>Portal de Bomberos</Text>
                        <Text style={[typography.caption, styles.subtitle]}>
                            Gestión táctica de emergencias · Cía. Cap. José A. Quiñonez N° 108
                        </Text>
                    </View>

                    {/* Formulario de credenciales */}
                    <View style={styles.formCard}>
                        <Text style={typography.h2}>Credenciales de Operador</Text>
                        <Text style={[typography.caption, { marginTop: 4, marginBottom: spacing.md }]}>
                            Validación conectada a la tabla{' '}
                            <Text style={styles.codeHighlight}>usuarios_dashboard</Text> de Supabase.
                        </Text>

                        <Text style={styles.inputLabel}>Usuario o Correo Institucional</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="ej. bombero116 o bombero@omniguard.pe"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={identificador}
                                onChangeText={(t) => {
                                    setIdentificador(t);
                                    if (error) setError('');
                                }}
                                editable={!loading}
                            />
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Contraseña</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={(t) => {
                                    setPassword(t);
                                    if (error) setError('');
                                }}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={10}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        {!!error && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                globalStyles.primaryButton,
                                styles.submitBtn,
                                (!isFormValid || loading) && globalStyles.primaryButtonDisabled,
                            ]}
                            activeOpacity={0.85}
                            disabled={!isFormValid || loading}
                            onPress={handleLogin}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.surface} />
                            ) : (
                                <View style={styles.btnContent}>
                                    <MaterialCommunityIcons name="shield-check" size={20} color={colors.surface} />
                                    <Text style={typography.buttonText}>Ingresar a la Central</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Tarjeta de acceso rápido con credenciales de prueba */}
                        <View style={styles.demoSection}>
                            <View style={styles.demoHeader}>
                                <Ionicons name="key-outline" size={15} color={colors.primary} />
                                <Text style={styles.demoTitle}>Credenciales de prueba (toca para rellenar)</Text>
                            </View>
                            <View style={styles.demoPillsRow}>
                                {DEMO_BOMBERO_CREDENTIALS.map((cred) => {
                                    const isSelected = identificador === cred.usuario && password === cred.password;
                                    return (
                                        <TouchableOpacity
                                            key={cred.id}
                                            style={[styles.demoChip, isSelected && styles.demoChipActive]}
                                            activeOpacity={0.75}
                                            onPress={() => handleSelectDemo(cred)}
                                        >
                                            <Text style={[styles.demoChipRole, isSelected && { color: colors.primary }]}>
                                                {cred.rango}
                                            </Text>
                                            <Text style={styles.demoChipText}>
                                                Usuario: <Text style={{ fontWeight: '700' }}>{cred.usuario}</Text>
                                            </Text>
                                            <Text style={styles.demoChipText}>
                                                Clave: <Text style={{ fontWeight: '700' }}>{cred.password}</Text>
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        marginBottom: spacing.md,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.round,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    dbBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.round,
    },
    dbDot: {
        width: 8,
        height: 8,
        borderRadius: radius.round,
        backgroundColor: colors.success,
        marginRight: 6,
    },
    dbBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success,
    },
    logoWrap: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    logoCircle: {
        width: 78,
        height: 78,
        borderRadius: radius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
    },
    subtitle: {
        marginTop: 4,
        textAlign: 'center',
    },
    formCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    codeHighlight: {
        fontWeight: '700',
        color: colors.text,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        backgroundColor: '#F9FAFB',
        height: 50,
        gap: spacing.sm,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEE4E2',
        padding: spacing.sm,
        borderRadius: radius.sm,
        marginTop: spacing.md,
    },
    errorText: {
        color: '#B42318',
        fontSize: 12.5,
        fontWeight: '600',
        flex: 1,
    },
    submitBtn: {
        marginTop: spacing.lg,
        paddingVertical: 15,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    demoSection: {
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    demoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.sm,
    },
    demoTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
    },
    demoPillsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    demoChip: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.sm + 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    demoChipActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(239, 59, 78, 0.06)',
    },
    demoChipRole: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    demoChipText: {
        fontSize: 11.5,
        color: colors.textMuted,
    },
});

