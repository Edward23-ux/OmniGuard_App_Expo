import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { useUser } from '../../context/UserContext';
import { getBomberoEmergencies } from '../services/bomberoService';

const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };
const ESTADOS_ACTIVOS = new Set([
    'pendiente',
    'asignado',
    'en_proceso',
    'en proceso',
    'en_camino',
    'en_atencion',
]);

function esIncidenciaActiva(estado) {
    const normalizado = String(estado || '').trim().toLowerCase();
    return ESTADOS_ACTIVOS.has(normalizado);
}

function mapEmergencyToHeatZone(item) {
    const color =
        item.estado === 'Pendiente' || item.estado === 'Asignado'
            ? colors.danger
            : item.estado === 'En Proceso'
                ? colors.warning
                : colors.info;
    const nivel =
        item.estado === 'Pendiente' || item.estado === 'Asignado'
            ? 'Crítico'
            : item.estado === 'En Proceso'
                ? 'En Proceso'
                : item.estado;

    return {
        id: item.id,
        zona: item.direccion || item.tipo,
        nivel,
        color,
        reportes: item.testigosCount || 1,
        lat: Number(item.coordenadas?.lat ?? DEFAULT_CENTER.lat),
        lng: Number(item.coordenadas?.lng ?? DEFAULT_CENTER.lng),
        radius: 360,
        principal: `${item.tipo} · ${item.fechaCorta || item.fecha}`,
    };
}

export default function BomberoHeatmapScreen({ navigation }) {
    const { user } = useUser();
    const webViewRef = useRef(null);
    const [emergencies, setEmergencies] = useState([]);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const [isTouchingMap, setIsTouchingMap] = useState(false);
    const [locating, setLocating] = useState(false);
    const [myLocation, setMyLocation] = useState(null);

    useEffect(() => {
        getBomberoEmergencies(user?.compania_id, user?.unidad_asignada_id).then((list) => {
            const activas = (list || []).filter((item) => esIncidenciaActiva(item.estado));
            setEmergencies(activas);
            if (activas.length > 0) {
                setSelectedZoneId(activas[0].id);
            }
        });
    }, [user?.compania_id, user?.unidad_asignada_id]);

    const handleMiUbicacion = async () => {
        if (locating) return;
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso requerido', 'Habilita el acceso a la ubicación para centrar el mapa en tu posición.');
                return;
            }

            let coords = null;
            try {
                const current = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                coords = current?.coords || null;
            } catch {
                try {
                    const lastKnown = await Location.getLastKnownPositionAsync();
                    coords = lastKnown?.coords || null;
                } catch {
                    coords = null;
                }
            }

            if (!coords) {
                Alert.alert('Ubicación no disponible', 'No se pudo obtener tu posición GPS actual.');
                return;
            }

            const nuevaPos = { lat: coords.latitude, lng: coords.longitude };
            setMyLocation(nuevaPos);

            if (Platform.OS !== 'web' && webViewRef.current) {
                const js = `
                    (function() {
                        if (typeof window.setMyLocationMarker === 'function') {
                            window.setMyLocationMarker(${nuevaPos.lat}, ${nuevaPos.lng});
                        }
                    })();
                    true;
                `;
                webViewRef.current.injectJavaScript(js);
            }
        } finally {
            setLocating(false);
        }
    };

    const heatZones = useMemo(() => emergencies.map(mapEmergencyToHeatZone), [emergencies]);
    const selectedZone = useMemo(
        () => heatZones.find((z) => z.id === selectedZoneId) || heatZones[0] || DEFAULT_CENTER,
        [heatZones, selectedZoneId]
    );

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
            center: [${selectedZone.lat}, ${selectedZone.lng}],
            zoom: 14,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var zones = ${JSON.stringify(heatZones)};
        zones.forEach(function(z) {
            var circle = L.circle([z.lat, z.lng], {
                color: z.color,
                weight: 2,
                fillColor: z.color,
                fillOpacity: 0.28,
                radius: z.radius
            }).addTo(map);
            circle.bindPopup('<b>' + z.zona + '</b><br/>' + z.reportes + ' alertas (' + z.nivel + ')');
        });
        var myMarker = null;
        window.setMyLocationMarker = function(lat, lng) {
            if (myMarker) {
                map.removeLayer(myMarker);
            }
            myMarker = L.circleMarker([lat, lng], {
                radius: 9,
                color: '#FFFFFF',
                weight: 3,
                fillColor: '#2563EB',
                fillOpacity: 1
            }).addTo(map);
            myMarker.bindPopup('<b>Mi Ubicación</b>').openPopup();
            map.setView([lat, lng], 15);
        };

        var initialMyLocation = ${JSON.stringify(myLocation)};
        if (initialMyLocation && typeof initialMyLocation.lat === 'number' && typeof initialMyLocation.lng === 'number') {
            window.setMyLocationMarker(initialMyLocation.lat, initialMyLocation.lng);
        }
    </script>
</body>
</html>
        `,
        [selectedZone, heatZones, myLocation]
    );

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            {/* Header Stack Navigation */}
            <View style={styles.headerBar}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={10}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={typography.h2}>Mapa de Calor</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isTouchingMap}
            >
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Concentración de Emergencias</Text>
                            <Text style={typography.caption}>
                                {user?.compania || 'Central de Bomberos'} ({emergencies.length} registros)
                            </Text>
                        </View>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>EN VIVO</Text>
                        </View>
                    </View>

                    {/* Mapa Interactivo Leaflet + OpenStreetMap */}
                    <View
                        style={styles.mapContainer}
                        onTouchStart={() => setIsTouchingMap(true)}
                        onTouchEnd={() => setIsTouchingMap(false)}
                        onTouchCancel={() => setIsTouchingMap(false)}
                    >
                        {Platform.OS === 'web' ? (
                            <iframe
                                title="Mapa de Calor"
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
                            style={styles.myLocationFab}
                            activeOpacity={0.85}
                            onPress={handleMiUbicacion}
                            disabled={locating}
                        >
                            {locating ? (
                                <ActivityIndicator size="small" color={colors.surface} />
                            ) : (
                                <Ionicons name="locate" size={20} color={colors.surface} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Zonas críticas detectadas */}
                <Text style={styles.sectionHeader}>SECTORES MONITOREADOS (TOCA PARA ENFOCAR)</Text>
                {heatZones.length === 0 ? (
                    <View style={styles.zoneCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.zoneTitle}>Sin emergencias registradas</Text>
                            <Text style={styles.zoneSubtitle}>
                                No hay incidentes activos en la tabla emergencias para esta compañía.
                            </Text>
                        </View>
                    </View>
                ) : (
                    heatZones.map((zone) => {
                        const isSelected = selectedZone.id === zone.id;
                        return (
                            <TouchableOpacity
                                key={zone.id}
                                style={[
                                    styles.zoneCard,
                                    isSelected && { borderColor: zone.color, borderWidth: 1.5 },
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setSelectedZoneId(zone.id)}
                            >
                                <View style={[styles.zoneIndicator, { backgroundColor: zone.color }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.zoneTitle}>{zone.zona}</Text>
                                    <Text style={styles.zoneSubtitle}>{zone.principal}</Text>
                                </View>
                                <View style={styles.zoneRight}>
                                    <Text style={[styles.zoneCount, { color: zone.color }]}>
                                        {zone.reportes} alertas
                                    </Text>
                                    <Text style={styles.zoneLevel}>{zone.nivel}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        width: 60,
    },
    backText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
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
        position: 'relative',
        height: 250,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#EDF2F7',
    },
    myLocationFab: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: 42,
        height: 42,
        borderRadius: radius.round,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#101828',
        shadowOpacity: 0.22,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    sectionHeader: {
        fontSize: 11.5,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 0.6,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    zoneCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm + 2,
    },
    zoneIndicator: {
        width: 10,
        height: 38,
        borderRadius: 5,
    },
    zoneTitle: {
        fontSize: 14.5,
        fontWeight: '800',
        color: colors.text,
    },
    zoneSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    zoneRight: {
        alignItems: 'flex-end',
    },
    zoneCount: {
        fontSize: 14,
        fontWeight: '800',
    },
    zoneLevel: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 2,
    },
});
