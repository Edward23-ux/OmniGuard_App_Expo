import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    const [locating, setLocating] = useState(false);
    const webViewRef = useRef(null);
    const iframeRef = useRef(null);

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

    const handleCenterMyLocation = async () => {
        if (locating) return;
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permiso de ubicación requerido',
                    'Habilita el acceso al GPS para centrar el mapa en tu ubicación actual.'
                );
                return;
            }

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const lat = position?.coords?.latitude;
            const lng = position?.coords?.longitude;
            if (typeof lat !== 'number' || typeof lng !== 'number') return;

            setUserCoords({ lat, lng });

            if (Platform.OS === 'web') {
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'CENTER_USER', lat, lng },
                    '*'
                );
            } else {
                const jsCode = `if (window.centrarEnUsuario) { window.centrarEnUsuario(${lat}, ${lng}); } true;`;
                webViewRef.current?.injectJavaScript(jsCode);
            }
        } catch (err) {
            console.warn('[MonitorScreen] No se pudo obtener la ubicación actual:', err.message);
            Alert.alert('Ubicación no disponible', 'No se pudo obtener tu posición GPS actual.');
        } finally {
            setLocating(false);
        }
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    };

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
        var initialCenter = ${JSON.stringify(
            userCoords ? [userCoords.lat, userCoords.lng] : [-12.0805, -77.0365]
        )};
        var map = L.map('map', {
            center: initialCenter,
            zoom: ${userCoords ? 15 : 13},
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
        window.centrarEnUsuario = function(lat, lng) {
            map.setView([lat, lng], 15, { animate: true });
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

        var savedUser = ${JSON.stringify(userCoords)};
        if (savedUser) {
            window.centrarEnUsuario(savedUser.lat, savedUser.lng);
        }

        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'CENTER_USER') {
                window.centrarEnUsuario(event.data.lat, event.data.lng);
            }
        });
    </script>
</body>
</html>
        `,
        [zones, userCoords]
    );

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={globalStyles.container}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} hitSlop={10}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={typography.h2}>Monitor · Mapa de Calor</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Aviso de privacidad e integridad */}
                <View style={styles.privacyBanner}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
                    <Text style={styles.privacyText}>
                        Por integridad y protección de datos sensibles, las emergencias se muestran únicamente mediante zonas de calor anónimas.
                    </Text>
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
                            />
                        )}

                        <TouchableOpacity
                            style={styles.locateButton}
                            activeOpacity={0.85}
                            onPress={handleCenterMyLocation}
                            disabled={locating}
                        >
                            {locating ? (
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
    privacyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: '#FDA29B',
        borderRadius: radius.md,
        padding: spacing.sm + 4,
        marginBottom: spacing.md,
    },
    privacyText: {
        flex: 1,
        fontSize: 12.5,
        color: colors.text,
        lineHeight: 18,
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
