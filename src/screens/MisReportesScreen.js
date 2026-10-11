import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography } from '../styles/globalStyles';
import { getStoredReports } from '../services/reportStorage';

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

    // 2. Consulta asíncrona a AsyncStorage
    const cargarReportes = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const data = await getStoredReports();
            setReports(data);
        } catch (error) {
            console.error('Error al cargar reportes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // 3. Sincronización con useFocusEffect: se ejecuta cada vez que la pestaña gana foco
    useFocusEffect(
        useCallback(() => {
            cargarReportes();
        }, [cargarReportes])
    );

    // 4. Evento de usuario: Pull-to-refresh
    const handleRefresh = () => {
        setRefreshing(true);
        cargarReportes(true);
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
