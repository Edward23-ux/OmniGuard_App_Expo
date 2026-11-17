import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';
import { supabase } from '../services/supabaseClient';

function mapEstadoAZona(row) {
    const estadoClave = String(row.estado || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

    if (estadoClave === 'pendiente' || estadoClave === 'asignado') {
        return {
            color: colors.danger,
            nivel: 'Alta incidencia',
            radius: 450,
        };
    }
    if (estadoClave === 'en_proceso' || estadoClave === 'en_camino' || estadoClave === 'en_atencion') {
        return {
            color: colors.warning,
            nivel: 'Incidencia media',
            radius: 400,
        };
    }
    return {
        color: colors.info,
        nivel: 'Incidencia moderada',
        radius: 350,
    };
}

export default function MonitorScreen({ navigation }) {
    const [zones, setZones] = useState([]);
    const [userCoords, setUserCoords] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(true);
    const [gpsStatusText, setGpsStatusText] = useState('Detectando ubicación del dispositivo...');
    const webViewRef = useRef(null);
    const iframeRef = useRef(null);
    const watchSubRef = useRef(null);

    const enviarUbicacionAlMapa = useCallback((lat, lng, shouldFly = true) => {
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        if (Platform.OS === 'web') {
            iframeRef.current?.contentWindow?.postMessage(
                { type: 'CENTER_USER', lat, lng, shouldFly },
                '*'
            );
        } else {
            const jsCode = `if (window.centrarEnUsuario) { window.centrarEnUsuario(${lat}, ${lng}, ${shouldFly}); } true;`;
            webViewRef.current?.injectJavaScript(jsCode);
        }
    }, []);

    const actualizarUbicacionDispositivo = useCallback(
        async (mostrarAlertaPermiso = false) => {
            setGpsLoading(true);
            setGpsStatusText('Sincronizando señal GPS...');

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setGpsStatusText('Permiso de ubicación no concedido');
                    if (mostrarAlertaPermiso) {
                        Alert.alert(
                            'Permiso de ubicación requerido',
                            'Habilita el acceso al GPS para visualizar tu Latitud y Longitud en tiempo real.',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
                            ]
                        );
                    }
                    return;
                }

                // PASO 1: Lectura instantánea (< 20ms) de la caché del sistema operativo
                let yaTieneCoordenadas = false;
                try {
                    const lastKnown = await Location.getLastKnownPositionAsync({
                        maxAge: 600000,
                    });
                    if (lastKnown?.coords) {
                        const lat = lastKnown.coords.latitude;
                        const lng = lastKnown.coords.longitude;
                        setUserCoords({ lat, lng });
                        setGpsStatusText('Ubicación GPS activa');
                        enviarUbicacionAlMapa(lat, lng, true);
                        yaTieneCoordenadas = true;
                        setGpsLoading(false);
                    }
                } catch {
                    // Continuar con lectura de hardware
                }

                // PASO 2: Lectura fresca acotada a máximo 3.5 segundos para no bloquear la UI
                const positionPromise = Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('GPS_TIMEOUT')), 3500)
                );

                const position = await Promise.race([positionPromise, timeoutPromise]);
                if (position?.coords) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setUserCoords({ lat, lng });
                    setGpsStatusText('Ubicación GPS actualizada en tiempo real');
                    enviarUbicacionAlMapa(lat, lng, !yaTieneCoordenadas);
                }
            } catch (err) {
                if (!userCoords) {
                    setGpsStatusText('Señal GPS débil. Reintenta en un lugar despejado.');
                }
            } finally {
                setGpsLoading(false);
            }
        },
        [enviarUbicacionAlMapa, userCoords]
    );

    // Suscripción automática al montar la pantalla para actualizar Lat/Lng apenas se conceda el permiso
    useEffect(() => {
        let isMounted = true;

        const iniciarMonitoreoGps = async () => {
            await actualizarUbicacionDispositivo(false);

            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted' && isMounted) {
                    watchSubRef.current = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.Balanced,
                            timeInterval: 8000,
                            distanceInterval: 10,
                        },
                        (loc) => {
                            if (!isMounted || !loc?.coords) return;
                            const lat = loc.coords.latitude;
                            const lng = loc.coords.longitude;
                            setUserCoords((prev) => {
                                const esPrimeraVez = !prev;
                                enviarUbicacionAlMapa(lat, lng, esPrimeraVez);
                                return { lat, lng };
                            });
                            setGpsStatusText('Ubicación GPS en tiempo real');
                            setGpsLoading(false);
                        }
                    );
                }
            } catch {
                // Ignorar si watchPositionAsync no está soportado en entorno específico
            }
        };

        iniciarMonitoreoGps();

        return () => {
            isMounted = false;
            if (watchSubRef.current) {
                watchSubRef.current.remove();
                watchSubRef.current = null;
            }
        };
    }, []);

    const cargarZonasReales = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('emergencias')
                .select('id, tipo, estado, latitud, longitud')
                .in('estado', [
                    'pendiente',
                    'asignado',
                    'en_proceso',
                    'culminado',
                    'Pendiente',
                    'Asignado',
                    'En Proceso',
                    'Culminado',
                ]);

            if (error) {
                throw error;
            }

            const mapped = (data || [])
                .filter((row) => row.latitud != null && row.longitud != null)
                .map((row) => {
                    const lat = Number(row.latitud);
                    const lng = Number(row.longitud);
                    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
                    const estilo = mapEstadoAZona(row);
                    return {
                        id: String(row.id),
                        zona: row.tipo || 'Zona de Incidencia',
                        nivel: estilo.nivel,
                        color: estilo.color,
                        lat,
                        lng,
                        radius: estilo.radius,
                    };
                })
                .filter(Boolean);

            setZones(mapped);
        } catch (err) {
            console.warn('[MonitorScreen] Error cargando zonas reales:', err.message);
            setZones([]);
        }
    }, []);

    useEffect(() => {
        cargarZonasReales();

        const channel = supabase
            .channel(`monitor-emergencias-${Date.now()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'emergencias' },
                () => {
                    cargarZonasReales();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [cargarZonasReales]);

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    };

    // IMPORTANTE: No incluimos userCoords en las dependencias del HTML para evitar recargar el WebView completo
    const heatmapHtml = useMemo(
        () => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; overflow: hidden; touch-action: none; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {
            center: [-12.0805, -77.0365],
            zoom: 13,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var zones = ${JSON.stringify(zones)};
        zones.forEach(function(z) {
            var circle = L.circle([z.lat, z.lng], {
                color: z.color,
                weight: 2,
                fillColor: z.color,
                fillOpacity: 0.30,
                radius: z.radius
            }).addTo(map);
            circle.bindPopup('<b>' + z.zona + '</b><br/>' + z.nivel);
        });

        var userMarker = null;
        window.centrarEnUsuario = function(lat, lng, shouldFly) {
            if (shouldFly !== false) {
                map.setView([lat, lng], 15, { animate: true });
            }
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
            } else {
                userMarker = L.circleMarker([lat, lng], {
                    radius: 9,
                    color: '#FFFFFF',
                    weight: 3,
                    fillColor: '#2E90FA',
                    fillOpacity: 1
                }).addTo(map);
                userMarker.bindPopup('Tu ubicación actual');
            }
        };

        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'CENTER_USER') {
                window.centrarEnUsuario(event.data.lat, event.data.lng, event.data.shouldFly);
            }
        });
    </script>
</body>
</html>
        `,
        [zones]
    );

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={globalStyles.container}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Monitor de Emergencias</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Tarjeta compacta de GPS en tiempo real (Latitud y Longitud del usuario) */}
                <View style={styles.gpsCard}>
                    <View style={styles.gpsInfoRow}>
                        <Ionicons name="location-sharp" size={18} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.gpsTitle}>{gpsStatusText}</Text>
                            <Text style={styles.gpsCoords}>
                                {userCoords
                                    ? `Lat: ${userCoords.lat.toFixed(5)} | Lng: ${userCoords.lng.toFixed(5)}`
                                    : 'Obteniendo coordenadas de tu dispositivo...'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.gpsRefreshBtn}
                            activeOpacity={0.75}
                            onPress={() => actualizarUbicacionDispositivo(true)}
                            disabled={gpsLoading}
                        >
                            {gpsLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.gpsRefreshText}>Actualizar GPS</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Contenedor del Mapa de Calor Interactivo */}
                <View style={styles.mapCard}>
                    <View style={styles.mapHeader}>
                        <View>
                            <Text style={styles.mapTitle}>Zonas de Incidencia Activa</Text>
                            <Text style={typography.caption}>Desliza o haz zoom para explorar el mapa</Text>
                        </View>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>EN VIVO</Text>
                        </View>
                    </View>

                    <View style={styles.mapContainer}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                ref={iframeRef}
                                title="Mapa de Calor Ciudadano"
                                srcDoc={heatmapHtml}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                onLoad={() => {
                                    if (userCoords) {
                                        enviarUbicacionAlMapa(userCoords.lat, userCoords.lng, true);
                                    }
                                }}
                            />
                        ) : (
                            <WebView
                                ref={webViewRef}
                                originWhitelist={['*']}
                                source={{ html: heatmapHtml }}
                                style={{ flex: 1 }}
                                scrollEnabled={false}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                onLoadEnd={() => {
                                    if (userCoords) {
                                        enviarUbicacionAlMapa(userCoords.lat, userCoords.lng, true);
                                    }
                                }}
                            />
                        )}

                        <TouchableOpacity
                            style={styles.locateButton}
                            activeOpacity={0.85}
                            onPress={() => actualizarUbicacionDispositivo(true)}
                            disabled={gpsLoading}
                        >
                            {gpsLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="locate" size={22} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Leyenda del mapa de calor */}
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                            <Text style={styles.legendLabel}>Alta</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                            <Text style={styles.legendLabel}>Media</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                            <Text style={styles.legendLabel}>Moderada</Text>
                        </View>
                    </View>
                </View>
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
    gpsCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    gpsInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    gpsTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.text,
    },
    gpsCoords: {
        fontSize: 11.5,
        color: colors.textMuted,
        marginTop: 2,
    },
    gpsRefreshBtn: {
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    gpsRefreshText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: colors.primary,
    },
    mapCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
    },
    mapHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm + 2,
    },
    mapTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEE4E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.round,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.danger,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.danger,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#EDF2F7',
    },
    locateButton: {
        position: 'absolute',
        bottom: 14,
        right: 14,
        width: 44,
        height: 44,
        borderRadius: radius.round,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
        zIndex: 10,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: spacing.sm + 2,
        marginTop: spacing.xs,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
    },
});
