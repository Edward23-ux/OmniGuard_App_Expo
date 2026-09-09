import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';

const EMERGENCY_TYPES = [
    { id: 'incendio', label: 'Incendio', emoji: '🔥' },
    { id: 'accidente', label: 'Accidente Vehicular', emoji: '🚗' },
    { id: 'fuga_gas', label: 'Fuga de Gas', emoji: '💨' },
    { id: 'rescate', label: 'Rescate', emoji: '🆘' },
    { id: 'derrumbe', label: 'Derrumbe', emoji: '🏚️' },
    { id: 'inundacion', label: 'Inundación', emoji: '🌊' },
    { id: 'explosion', label: 'Explosión', emoji: '💥' },
    { id: 'otro', label: 'Otro', emoji: '📍' },
];

export default function ReportEmergencyScreen({ navigation }) {
    const [selected, setSelected] = useState(null);

    const handleReport = () => {
        const tipo = EMERGENCY_TYPES.find((t) => t.id === selected);
        if (Platform.OS === 'web') {
            alert(`Se registró tu emergencia de tipo "${tipo?.label}". Un bombero revisará tu reporte.`);
            navigation.navigate('Home');
        } else {
            Alert.alert(
                'Reporte enviado',
                `Se registró tu emergencia de tipo "${tipo?.label}". Un bombero revisará tu reporte.`,
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
            );
        }
    };

    return (
        <SafeAreaView style={globalStyles.screen}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
                        <Ionicons name="arrow-back" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reportar Emergencia</Text>
                    <View style={{ width: 26 }} />
                </View>

                <Text style={styles.question}>¿Qué está pasando?</Text>
                <Text style={styles.hint}>Selecciona el tipo de emergencia</Text>

                <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
                    {EMERGENCY_TYPES.map((type) => {
                        const isSelected = selected === type.id;
                        return (
                            <TouchableOpacity
                                key={type.id}
                                style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                                activeOpacity={0.8}
                                onPress={() => setSelected(type.id)}
                            >
                                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                                <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <TouchableOpacity
                    style={[
                        globalStyles.primaryButton,
                        styles.submitButton,
                        !selected && globalStyles.primaryButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={!selected}
                    onPress={handleReport}
                >
                    <Ionicons name="flame" size={18} color={colors.surface} style={{ marginRight: 8 }} />
                    <Text style={typography.buttonText}>REPORTAR AHORA</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const CARD_GAP = spacing.md;

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    question: { color: colors.text, fontSize: 20, fontWeight: '700' },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: spacing.lg },
    typeButton: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: CARD_GAP,
    },
    typeButtonSelected: { borderColor: colors.primary, backgroundColor: 'rgba(239,59,78,0.08)' },
    typeEmoji: { fontSize: 30, marginBottom: spacing.sm },
    typeLabel: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    typeLabelSelected: { color: colors.primaryDark },
    submitButton: { flexDirection: 'row', marginBottom: spacing.lg },
});