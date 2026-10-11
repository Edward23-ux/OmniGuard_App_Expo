import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { saveNewReport } from '../services/reportStorage';

export const iconoTipo = {
    'Incendio': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </Svg>
    ),
    'Accidente Vehicular': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <Circle cx="7" cy="17" r="2" />
            <Circle cx="17" cy="17" r="2" />
            <Path d="M9 17h6" />
        </Svg>
    ),
    'Fuga de Gas': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06D6A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </Svg>
    ),
    'Rescate': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF006E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Path d="m4.93 4.93 4.24 4.24" />
            <Path d="m14.83 9.17 4.24-4.24" />
            <Path d="m14.83 14.83 4.24 4.24" />
            <Path d="m9.17 14.83-4.24 4.24" />
            <Circle cx="12" cy="12" r="4" />
        </Svg>
    ),
    'Derrumbe': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FB8500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Path d="M9 22V12h6v10" />
            <Path d="m11 5 2 5-4 2 2 3" />
        </Svg>
    ),
    'Inundación': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M2 6c.6 0 1.2-.2 1.6-.6L5 4l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L11 4l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L17 4l1.4 1.4c.4.4 1 .6 1.6.6" />
            <Path d="M2 12c.6 0 1.2-.2 1.6-.6L5 10l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L11 10l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L17 10l1.4 1.4c.4.4 1 .6 1.6.6" />
            <Path d="M2 18c.6 0 1.2-.2 1.6-.6L5 16l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L11 16l1.4 1.4c.4.4 1 .6 1.6.6s1.2-.2 1.6-.6L17 16l1.4 1.4c.4.4 1 .6 1.6.6" />
        </Svg>
    ),
    'Explosión': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="m12 3-1.912 5.886L4.2 8.878l4.757 4.107-1.818 6.015L12 15.275l4.86 3.725-1.817-6.015 4.756-4.107-5.888-.008z" />
        </Svg>
    ),
    'Otro': (
        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8338EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="8" x2="12" y2="12" />
            <Line x1="12" y1="16" x2="12.01" y2="16" />
        </Svg>
    ),
};

const EMERGENCY_TYPES = [
    { id: 'incendio', label: 'Incendio' },
    { id: 'accidente', label: 'Accidente Vehicular' },
    { id: 'fuga_gas', label: 'Fuga de Gas' },
    { id: 'rescate', label: 'Rescate' },
    { id: 'derrumbe', label: 'Derrumbe' },
    { id: 'inundacion', label: 'Inundación' },
    { id: 'explosion', label: 'Explosión' },
    { id: 'otro', label: 'Otro' },
];

export default function ReportEmergencyScreen({ navigation }) {
    const [selected, setSelected] = useState(null);

    const handleReport = async () => {
        const tipo = EMERGENCY_TYPES.find((t) => t.id === selected);
        if (!tipo) return;

        try {
            await saveNewReport(tipo.label);
            if (Platform.OS === 'web') {
                alert(`Se registró tu emergencia de tipo "${tipo.label}". Un bombero revisará tu reporte.`);
                navigation.navigate('MainTabs', { screen: 'MisReportes' });
            } else {
                Alert.alert(
                    'Reporte enviado',
                    `Se registró tu emergencia de tipo "${tipo.label}". Un bombero revisará tu reporte.`,
                    [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'MisReportes' }) }]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar el reporte en la memoria local.');
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
                                <View style={styles.iconContainer}>
                                    {iconoTipo[type.label]}
                                </View>
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
                    <Ionicons name="alert-circle" size={20} color={colors.surface} style={{ marginRight: 8 }} />
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
    iconContainer: { marginBottom: spacing.sm },
    typeLabel: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    typeLabelSelected: { color: colors.primaryDark },
    submitButton: { flexDirection: 'row', marginBottom: spacing.lg },
});
