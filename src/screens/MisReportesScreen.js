import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Image,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { getStoredReports, cacheUserReports } from '../services/reportStorage';
import { supabase } from '../services/supabaseClient';
import { dispararNotificacionLocal } from '../services/notificationService';
import { useUser } from '../context/UserContext';

const STATUS_STYLES = {
    Pendiente: { bg: '#FEF0C7', color: '#B54708' },
    Asignado: { bg: '#E0E7FF', color: '#3730A3' },
    'En Proceso': { bg: '#D1E9FF', color: '#175CD3' },
    Culminado: { bg: '#D1FADF', color: '#027A48' },
    'Falsa Alarma': { bg: '#FEE4E2', color: '#B42318' },
};

function normalizarEstado(estado) {
    if (!estado) return 'Pendiente';
    const clave = String(estado).trim().toLowerCase().replace(/\s+/g, '_');
    const mapa = {
        pendiente: 'Pendiente',
        asignado: 'Asignado',
        en_proceso: 'En Proceso',
        en_camino: 'En Proceso',
        en_atencion: 'En Proceso',
        culminado: 'Culminado',
        resuelto_campo: 'Culminado',
        cerrado: 'Culminado',
        falsa_alarma: 'Falsa Alarma',
    };
    return mapa[clave] || estado;
}

function formatearFecha(isoString) {
    if (!isoString) return 'Reciente';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return String(isoString);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} · ${horas}:${minutos}`;
}

function StatusBadge({ estado }) {
    const estadoNormalizado = normalizarEstado(estado);
    const style = STATUS_STYLES[estadoNormalizado] ?? STATUS_STYLES.Pendiente;
    return (
        <View style={[globalStyles.badge, { backgroundColor: style.bg }]}>
            <Text style={[globalStyles.badgeText, { color: style.color }]}>{estadoNormalizado}</Text>
        </View>
    );
}

export default function MisReportesScreen({ navigation }) {
    const { user } = useUser();
    // 1. Estados dinámicos gestionados con useState
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    // 2. Consulta a Supabase filtrada por usuario_id con respaldo de caché por usuario
    const cargarReportes = useCallback(
        async (isRefresh = false) => {
            if (!user?.id) {
                setReports([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (!isRefresh) setLoading(true);
            try {
                const { data: remoteRows, error: remoteError } = await supabase
                    .from('emergencias')
                    .select('*')
                    .eq('usuario_id', user.id)
                    .order('creado_en', { ascending: false });

                if (remoteError) {
                    throw remoteError;
                }

                let companiasMap = {};
                const companiaIds = Array.from(
                    new Set(
                        (remoteRows || [])
                            .map((r) => r.compania_asignada_id || r.compania_id)
                            .filter(Boolean)
                    )
                );

                if (companiaIds.length > 0) {
                    try {
                        const { data: companiasData } = await supabase
                            .from('companias_bomberos')
                            .select('id, nombre')
                            .in('id', companiaIds);
                        if (Array.isArray(companiasData)) {
                            companiasMap = companiasData.reduce((acc, c) => {
                                acc[c.id] = c.nombre;
                                return acc;
                            }, {});
                        }
                    } catch {
                        // Mantener mapa vacío si falla la consulta de compañías
                    }
                }

                const mapped = (remoteRows || []).map((row) => {
                    const compId = row.compania_asignada_id || row.compania_id;
                    const coordsTexto =
                        row.latitud != null && row.longitud != null
                            ? `Lat: ${Number(row.latitud).toFixed(5)}, Lng: ${Number(row.longitud).toFixed(5)}`
                            : null;

                    return {
                        id: String(row.id),
                        usuario_id: row.usuario_id,
                        tipo: row.tipo || 'Emergencia',
                        fecha: formatearFecha(row.creado_en),
                        estado: normalizarEstado(row.estado),
                        companiaAsignada: (compId && companiasMap[compId]) || row.compania_nombre || null,
                        descripcion: row.descripcion || row.referencia || null,
                        direccion: row.direccion || coordsTexto,
                        fotoUrl: row.foto_url || null,
                        informeBombero: row.informe_bombero || null,
                        fotoCierreUrl: row.foto_cierre_url || null,
                    };
                });

                await cacheUserReports(user.id, mapped);
                setReports(mapped);
            } catch (error) {
                console.warn('[MisReportesScreen] Error al consultar Supabase, usando caché local:', error.message);
                try {
                    const cached = await getStoredReports(user.id);
                    setReports(
                        (cached || []).map((item) => ({
                            ...item,
                            estado: normalizarEstado(item.estado),
                        }))
                    );
                } catch (cacheError) {
                    console.error('Error al cargar reportes:', cacheError);
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [user?.id]
    );

    // 3. Sincronización con useFocusEffect: se ejecuta cada vez que la pestaña gana foco
    useFocusEffect(
        useCallback(() => {
            cargarReportes();
        }, [cargarReportes])
    );

    // 4. Suscripción Realtime filtrada estrictamente por usuario_id
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`emergencias-ciudadano-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'emergencias',
                    filter: `usuario_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload?.new?.usuario_id !== user.id) return;

                    const updatedId = String(payload?.new?.id || '');
                    const rawEstado = payload?.new?.estado;
                    if (rawEstado) {
                        const estadoNormalizado = normalizarEstado(rawEstado);
                        setReports((prev) =>
                            prev.map((item) =>
                                String(item.id) === updatedId
                                    ? {
                                          ...item,
                                          estado: estadoNormalizado,
                                          informeBombero: payload?.new?.informe_bombero ?? item.informeBombero,
                                          fotoCierreUrl: payload?.new?.foto_cierre_url ?? item.fotoCierreUrl,
                                      }
                                    : item
                            )
                        );
                        setSelectedReport((prev) =>
                            prev && String(prev.id) === updatedId
                                ? {
                                      ...prev,
                                      estado: estadoNormalizado,
                                      informeBombero: payload?.new?.informe_bombero ?? prev.informeBombero,
                                      fotoCierreUrl: payload?.new?.foto_cierre_url ?? prev.fotoCierreUrl,
                                  }
                                : prev
                        );
                        dispararNotificacionLocal(
                            'Actualización de Reporte',
                            'Tu reporte pasó a estado: ' + estadoNormalizado
                        ).catch((err) => {
                            console.warn('[MisReportesScreen] Error al disparar notificación:', err);
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

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
                            <TouchableOpacity
                                style={[globalStyles.card, styles.reportCard]}
                                activeOpacity={0.78}
                                onPress={() => setSelectedReport(item)}
                            >
                                <View style={{ flex: 1, marginRight: spacing.sm }}>
                                    <Text style={styles.reportTitle}>{item.tipo}</Text>
                                    <Text style={typography.caption}>{item.fecha}</Text>
                                </View>
                                <StatusBadge estado={item.estado} />
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>

            <Modal
                visible={Boolean(selectedReport)}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedReport(null)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setSelectedReport(null)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={typography.h2}>Detalle del Reporte</Text>
                            <TouchableOpacity onPress={() => setSelectedReport(null)} hitSlop={10}>
                                <Ionicons name="close" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedReport && (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalBody}
                            >
                                <View style={styles.detailTopRow}>
                                    <Text style={styles.detailTitle}>{selectedReport.tipo}</Text>
                                    <StatusBadge estado={selectedReport.estado} />
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Fecha y hora de creación</Text>
                                    <Text style={styles.detailValue}>{selectedReport.fecha}</Text>
                                </View>

                                {Boolean(selectedReport.companiaAsignada) && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Compañía de bomberos asignada</Text>
                                        <Text style={styles.detailValue}>{selectedReport.companiaAsignada}</Text>
                                    </View>
                                )}

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Dirección aproximada reportada</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedReport.direccion ||
                                            (selectedReport.coordenadas
                                                ? `Lat: ${Number(selectedReport.coordenadas.lat).toFixed(5)}, Lng: ${Number(
                                                      selectedReport.coordenadas.lng
                                                  ).toFixed(5)}`
                                                : 'Ubicación GPS registrada')}
                                    </Text>
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Descripción</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedReport.descripcion ||
                                            `Alerta de emergencia de tipo ${selectedReport.tipo} enviada desde la plataforma ciudadana.`}
                                    </Text>
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Evidencia fotográfica enviada</Text>
                                    {selectedReport.fotoUrl || selectedReport.imageUri ? (
                                        <Image
                                            source={{ uri: selectedReport.fotoUrl || selectedReport.imageUri }}
                                            style={styles.evidenceImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Text style={typography.caption}>Sin fotografía adjunta</Text>
                                    )}
                                </View>

                                {(selectedReport.estado === 'Culminado' ||
                                    selectedReport.estado === 'Falsa Alarma') &&
                                    Boolean(selectedReport.informeBombero || selectedReport.fotoCierreUrl) && (
                                        <View style={styles.unitResponseBox}>
                                            <Text style={styles.unitResponseTitle}>Respuesta de la Unidad</Text>
                                            {Boolean(selectedReport.informeBombero) && (
                                                <Text style={styles.detailValue}>
                                                    {selectedReport.informeBombero}
                                                </Text>
                                            )}
                                            {Boolean(selectedReport.fotoCierreUrl) && (
                                                <Image
                                                    source={{ uri: selectedReport.fotoCierreUrl }}
                                                    style={[styles.evidenceImage, { marginTop: spacing.sm }]}
                                                    resizeMode="cover"
                                                />
                                            )}
                                        </View>
                                    )}
                            </ScrollView>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 40, 0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        maxHeight: '85%',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalBody: {
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    detailTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        flex: 1,
    },
    detailSection: {
        gap: 4,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    detailValue: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    evidenceImage: {
        width: '100%',
        height: 200,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        marginTop: 4,
    },
    unitResponseBox: {
        backgroundColor: colors.background,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    unitResponseTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.text,
    },
});
