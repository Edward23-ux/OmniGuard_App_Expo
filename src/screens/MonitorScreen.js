import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { globalStyles, colors, spacing, typography, radius } from '../styles/globalStyles';

const HEAT_ZONES = [
    {
        id: 'z1',
        zona: 'Zona Centro',
        nivel: 'Alta incidencia',
        color: colors.danger,
        lat: -12.0695,
        lng: -77.0358,
        radius: 500,
    },
    {
        id: 'z2',
        zona: 'Zona Sur-Centro',
        nivel: 'Incidencia media',
        color: colors.warning,
        lat: -12.0942,
        lng: -77.0285,
        radius: 420,
    },
    {
        id: 'z3',
        zona: 'Zona Oeste',
        nivel: 'Incidencia moderada',
        color: colors.info,
        lat: -12.0772,
        lng: -77.0465,
        radius: 380,
    },
];

export default function MonitorScreen({ navigation }) {
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
        var map = L.map('map', {
            center: [-12.0805, -77.0365],
            zoom: 13,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var zones = ${JSON.stringify(HEAT_ZONES)};
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
    </script>
</body>
</html>
        `,
        []
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
                                title="Mapa de Calor Ciudadano"
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
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#EDF2F7',
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
