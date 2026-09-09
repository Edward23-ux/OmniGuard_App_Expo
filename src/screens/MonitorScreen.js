import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';

// Emergencias activas simuladas — en la versión real vendrán de Supabase
// Realtime, filtradas por zona/compañía de bomberos.
const MOCK_ACTIVE = [
    { id: '1', tipo: 'Incendio', zona: 'San Isidro', hace: 'hace 5 min' },
    { id: '2', tipo: 'Accidente Vehicular', zona: 'Miraflores', hace: 'hace 12 min' },
    { id: '3', tipo: 'Fuga de Gas', zona: 'Surco', hace: 'hace 20 min' },
];

export default function MonitorScreen({ navigation }) {
    return (
        <SafeAreaView style={globalStyles.screen}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Monitor</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Placeholder del mapa interactivo (se integrará react-native-maps) */}
                <View style={styles.mapPlaceholder}>
                    <MaterialCommunityIcons name="map-marker-radius" size={40} color={colors.success} />
                    <Text style={styles.mapPlaceholderText}>Mapa en tiempo real</Text>
                    <Text style={typography.caption}>Próximamente: integración con el mapa interactivo</Text>
                </View>

                <Text style={[typography.h2, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                    Emergencias activas
                </Text>

                <FlatList
                    data={MOCK_ACTIVE}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                    renderItem={({ item }) => (
                        <View style={[globalStyles.card, styles.itemCard]}>
                            <View style={styles.dot} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemTitle}>{item.tipo}</Text>
                                <Text style={typography.caption}>{item.zona}</Text>
                            </View>
                            <Text style={typography.caption}>{item.hace}</Text>
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
    mapPlaceholder: {
        height: 180,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    mapPlaceholderText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.xs,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: radius.round,
        backgroundColor: colors.danger,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
});
