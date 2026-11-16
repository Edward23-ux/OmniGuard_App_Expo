import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { globalStyles, colors, spacing, typography, radius } from '../../styles/globalStyles';
import { getBomberoEmergencies } from '../services/bomberoService';

const HEAT_ZONES = [
    {
        id: 'z1',
        zona: 'Santa Beatriz / Cercado de Lima',
        nivel: 'Crítico',
        color: colors.danger,
        reportes: 4,
        lat: -12.0695,
        lng: -77.0358,
        radius: 450,
        principal: 'Incendio estructural y cables eléctricos',
    },
    {
        id: 'z2',
        zona: 'San Isidro / Vía Expresa',
        nivel: 'Medio',
        color: colors.warning,
        reportes: 2,
        lat: -12.0942,
        lng: -77.0285,
        radius: 380,
        principal: 'Accidente Vehicular y Rescate',
    },
    {
        id: 'z3',
        zona: 'Jesús María / Lince',
        nivel: 'Moderado',
        color: colors.info,
        reportes: 2,
        lat: -12.0772,
        lng: -77.0465,
        radius: 340,
        principal: 'Fuga de Gas GLP comercial',
    },
];

export default function BomberoHeatmapScreen({ navigation }) {
    const [emergencies, setEmergencies] = useState([]);
    const [selectedZone, setSelectedZone] = useState(HEAT_ZONES[0]);
    const [isTouchingMap, setIsTouchingMap] = useState(false);

    useEffect(() => {
        getBomberoEmergencies().then(setEmergencies);
    }, []);

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

        var zones = ${JSON.stringify(HEAT_ZONES)};
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
    </script>
</body>
</html>
        `,
        [selectedZone]
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
                    <Text style={styles.backText}>Central</Text>
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
                                Jurisdicción Cía. Cap. José A. Quiñonez N° 108 ({emergencies.length} registros)
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
                                originWhitelist={['*']}
                                source={{ html: heatmapHtml }}
                                style={{ flex: 1 }}
                                scrollEnabled={false}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                            />
                        )}
                    </View>
                </View>

                {/* Zonas críticas detectadas */}
                <Text style={styles.sectionHeader}>SECTORES MONITOREADOS (TOCA PARA ENFOCAR)</Text>
                {HEAT_ZONES.map((zone) => {
                    const isSelected = selectedZone.id === zone.id;
                    return (
                        <TouchableOpacity
                            key={zone.id}
                            style={[
                                styles.zoneCard,
                                isSelected && { borderColor: zone.color, borderWidth: 1.5 },
                            ]}
                            activeOpacity={0.8}
                            onPress={() => setSelectedZone(zone)}
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
                })}
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
        height: 250,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#EDF2F7',
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
