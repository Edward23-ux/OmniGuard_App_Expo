import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Modal,
    Pressable,
    Animated,
    PanResponder,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { useUser } from '../../context/UserContext';
import { authenticateBombero, getCuentasDemoBomberos } from '../services/bomberoService';

export default function BomberoLoginScreen({ navigation }) {
    const { login } = useUser();
    const [identificador, setIdentificador] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAccountsModal, setShowAccountsModal] = useState(false);
    const [cuentasCentral, setCuentasCentral] = useState([]);
    const [loadingCuentas, setLoadingCuentas] = useState(false);

    const cargarCuentasCentral = useCallback(async () => {
        setLoadingCuentas(true);
        try {
            const lista = await getCuentasDemoBomberos();
            setCuentasCentral(lista);
        } catch (err) {
            console.warn('[BomberoLoginScreen] No se pudieron cargar cuentas de central:', err.message);
            setCuentasCentral([]);
        } finally {
            setLoadingCuentas(false);
        }
    }, []);

    useEffect(() => {
        cargarCuentasCentral();
    }, [cargarCuentasCentral]);

    const { width, height } = useWindowDimensions();
    const pan = useRef(
        new Animated.ValueXY({
            x: Math.max(16, width / 2 - 26),
            y: Math.max(80, height - 96),
        })
    ).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.extractOffset();
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
                useNativeDriver: false,
            }),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();
                if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
                    setShowAccountsModal(true);
                    if (cuentasCentral.length === 0) {
                        cargarCuentasCentral();
                    }
                }
            },
        })
    ).current;

    const isFormValid = identificador.trim().length >= 3 && password.trim().length >= 4;

    const handleSelectCuenta = (cuenta) => {
        setIdentificador(cuenta.placa_servicio || cuenta.email);
        setPassword(cuenta.password_hash || '');
        setError('');
        setShowAccountsModal(false);
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
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Encabezado de Bomberos */}
                    <View style={styles.logoWrap}>
                        <View style={styles.logoCircle}>
                            <MaterialCommunityIcons name="fire-truck" size={40} color={colors.surface} />
                        </View>
                        <Text style={typography.h1}>Portal de Bomberos</Text>
                    </View>

                    {/* Formulario de credenciales */}
                    <View style={styles.formCard}>
                        <Text style={styles.inputLabel}>Usuario o Correo Institucional</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Placa de servicio o correo institucional"
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Animated.View
                style={[
                    styles.floatingAccountsBtn,
                    { transform: pan.getTranslateTransform() },
                ]}
                {...panResponder.panHandlers}
            >
                <Ionicons name="key-outline" size={22} color={colors.surface} />
            </Animated.View>

            <Modal
                visible={showAccountsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAccountsModal(false)}
            >
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={() => setShowAccountsModal(false)}
                >
                    <Pressable style={styles.modalPanel} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cuentas de Central</Text>
                            <TouchableOpacity
                                onPress={() => setShowAccountsModal(false)}
                                hitSlop={10}
                            >
                                <Ionicons name="close" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalList}>
                            {loadingCuentas ? (
                                <View style={{ paddingVertical: spacing.lg, alignItems: 'center', gap: 8 }}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={styles.accountOptionSubtitle}>
                                        Consultando centrales activas...
                                    </Text>
                                </View>
                            ) : cuentasCentral.length === 0 ? (
                                <Text style={[styles.accountOptionSubtitle, { textAlign: 'center', paddingVertical: spacing.md }]}>
                                    No hay cuentas activas registradas en Supabase.
                                </Text>
                            ) : (
                                cuentasCentral.map((cuenta) => {
                                    const cuentaId = cuenta.placa_servicio || cuenta.email;
                                    const isSelected =
                                        identificador === cuentaId && password === (cuenta.password_hash || '');
                                    return (
                                        <TouchableOpacity
                                            key={cuenta.id}
                                            style={[styles.accountOption, isSelected && styles.accountOptionActive]}
                                            activeOpacity={0.75}
                                            onPress={() => handleSelectCuenta(cuenta)}
                                        >
                                            <View style={styles.accountOptionMain}>
                                                <Text
                                                    style={[
                                                        styles.accountOptionTitle,
                                                        isSelected && { color: colors.primary },
                                                    ]}
                                                >
                                                    {cuenta.compania_nombre} · {cuenta.placa_servicio}
                                                </Text>
                                                <Text style={styles.accountOptionSubtitle}>{cuenta.email}</Text>
                                            </View>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={18}
                                                color={isSelected ? colors.primary : colors.textMuted}
                                            />
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
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
    formCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
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
    floatingAccountsBtn: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 52,
        height: 52,
        borderRadius: radius.round,
        backgroundColor: colors.text,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        zIndex: 20,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 40, 0.45)',
        justifyContent: 'flex-end',
        padding: spacing.lg,
    },
    modalPanel: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    modalList: {
        gap: spacing.xs,
    },
    accountOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    accountOptionActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(239, 59, 78, 0.06)',
    },
    accountOptionMain: {
        flex: 1,
        marginRight: spacing.sm,
    },
    accountOptionTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.text,
    },
    accountOptionSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
});

