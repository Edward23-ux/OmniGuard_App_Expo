import { StyleSheet } from 'react-native';

/**
 * Paleta y estilos globales de OmniGuard.
 * Un solo archivo de estilos para toda la app (sin theming por ahora).
 */
export const colors = {
    primary: '#EF3B4E',       // Rojo principal (botón "Reportar Emergencia")
    primaryDark: '#C4293A',
    background: '#F4F6F9',    // Fondo claro (Home / Mis Reportes / Monitor)
    backgroundDark: '#121316',// Fondo oscuro (Reportar Emergencia)
    surface: '#FFFFFF',
    surfaceDark: '#1E1F24',
    border: '#E4E7EC',
    borderDark: '#2C2D33',
    text: '#101828',
    textDark: '#FFFFFF',
    textMuted: '#667085',
    textMutedDark: '#9AA0A9',
    success: '#12B76A',
    warning: '#F79009',
    info: '#2E90FA',
    danger: '#EF3B4E',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const radius = {
    sm: 8,
    md: 14,
    lg: 20,
    round: 999,
};

export const typography = StyleSheet.create({
    h1: { fontSize: 26, fontWeight: '700', color: colors.text },
    h2: { fontSize: 20, fontWeight: '700', color: colors.text },
    body: { fontSize: 15, fontWeight: '400', color: colors.text },
    caption: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
    buttonText: { fontSize: 16, fontWeight: '700', color: colors.surface },
});

export const globalStyles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    screenDark: {
        flex: 1,
        backgroundColor: colors.backgroundDark,
    },
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    primaryButtonDisabled: {
        backgroundColor: '#F1AEB6',
        shadowOpacity: 0,
        elevation: 0,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: radius.round,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: colors.surface,
        fontWeight: '700',
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 20,
        letterSpacing: 4,
        color: colors.text,
        backgroundColor: colors.surface,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.round,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
