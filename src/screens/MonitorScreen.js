import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';

// Emergencias activas simuladas
const MOCK_ACTIVE = [
    { id: '1', tipo: 'Incendio', zona: 'San Isidro', hace: 'hace 5 min' },
    { id: '2', tipo: 'Accidente Vehicular', zona: 'Miraflores', hace: 'hace 12 min' },
    { id: '3', tipo: 'Fuga de Gas', zona: 'Surco', hace: 'hace 20 min' },
];

export default function MonitorScreen({ navigation }) {
    // 1. Estados dinámicos gestionados con useState
    const [emergencias, setEmergencias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 2. Función de carga simulando consulta a Supabase / WebSocket
    const cargarEmergencias = useCallback(() => {
        return setTimeout(() => {
            setEmergencias(MOCK_ACTIVE);
            setCargando(false);
            setRefreshing(false);
        }, 600);
    }, []);

    // 3. Efecto sincronizado al montar la vista con useEffect
    useEffect(() => {
        const timerId = cargarEmergencias();
        // Clean-up al desmontar la pantalla para evitar fugas de memoria
        return () => clearTimeout(timerId);
    }, [cargarEmergencias]);

    // 4. Manejo de evento pull-to-refresh
    const handleRefresh = () => {
        setRefreshing(true);
        cargarEmergencias();
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    };

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={globalStyles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Monitor</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Placeholder del mapa interactivo */}
                <View style={styles.mapPlaceholder}>
                    <MaterialCommunityIcons name="map-marker-radius" size={40} color={colors.success} />
                    <Text style={styles.mapPlaceholderText}>Mapa en tiempo real</Text>
                    <Text style={typography.caption}>Próximamente: integración con el mapa interactivo</Text>
                </View>

                <Text style={[typography.h2, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                    Emergencias activas
                </Text>

                {cargando ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[typography.caption, { marginTop: spacing.sm }]}>
                            Buscando alertas activas...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={emergencias}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
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
                )}
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
    centerContainer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
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
