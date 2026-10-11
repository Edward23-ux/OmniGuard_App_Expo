import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';

// Historial simulado — base de datos mock conectada con el ciclo de vida
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
    // 1. Estados dinámicos gestionados con useState
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 2. Función de sincronización asíncrona
    const cargarReportes = useCallback(() => {
        return setTimeout(() => {
            setReports(MOCK_REPORTS);
            setLoading(false);
            setRefreshing(false);
        }, 800);
    }, []);

    // 3. Efecto sincronizado con useEffect (Ciclo de vida y Clean-up)
    useEffect(() => {
        const timerId = cargarReportes();
        // Función de limpieza para prevenir fugas de memoria si la pantalla se desmonta
        return () => clearTimeout(timerId);
    }, [cargarReportes]);

    // 4. Manejo de evento de usuario: Pull-to-refresh
    const handleRefresh = () => {
        setRefreshing(true);
        cargarReportes();
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
                    <Text style={typography.h2}>Mis Reportes</Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[typography.caption, { marginTop: spacing.md }]}>
                            Cargando tus reportes...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={reports}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: spacing.lg }}
                        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
