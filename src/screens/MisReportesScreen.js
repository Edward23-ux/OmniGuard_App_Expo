import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';

// Historial simulado — al conectar Supabase, reemplazar por una consulta
// filtrada por el DNI del usuario autenticado.
const MOCK_REPORTS = [
    { id: '1', tipo: 'Incendio', fecha: '05/09/2026 · 18:42', estado: 'En Proceso' },
    { id: '2', tipo: 'Accidente Vehicular', fecha: '02/09/2026 · 09:10', estado: 'Culminado' },
    { id: '3', tipo: 'Fuga de Gas', fecha: '28/08/2026 · 21:05', estado: 'Falsa Alarma' },
    { id: '4', tipo: 'Inundación', fecha: '20/08/2026 · 07:33', estado: 'Culminado' },
];

const STATUS_STYLES = {
    Pendiente: { bg: '#FEF0C7', color: '#B54708' },
    'En Proceso': { bg: '#D1E9FF', color: '#175CD3' },
    Culminado: { bg: '#D1FADF', color: '#027A48' },
    'Falsa Alarma': { bg: '#FEE4E2', color: '#B42318' },
};

function StatusBadge({ estado }) {
    const style = STATUS_STYLES[estado] ?? STATUS_STYLES.Pendiente;
    return (
        <View style={[globalStyles.badge, { backgroundColor: style.bg }]}>
            <Text style={[globalStyles.badgeText, { color: style.color }]}>{estado}</Text>
        </View>
    );
}

export default function MisReportesScreen({ navigation }) {
    return (
        <SafeAreaView style={globalStyles.screen}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Mis Reportes</Text>
                    <View style={{ width: 24 }} />
                </View>

                <FlatList
                    data={MOCK_REPORTS}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: spacing.lg }}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                    ListEmptyComponent={
                        <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.xl }]}>
                            Aún no has reportado ninguna emergencia.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View style={[globalStyles.card, styles.reportCard]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.reportTitle}>{item.tipo}</Text>
                                <Text style={typography.caption}>{item.fecha}</Text>
                            </View>
                            <StatusBadge estado={item.estado} />
                        </View>
                    )}
                />
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
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reportTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
});
