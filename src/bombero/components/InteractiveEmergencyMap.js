import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../../styles/globalStyles';

/**
 * Mapa interactivo en tiempo real basado en Leaflet + OpenStreetMap.
 * Permite al bombero desplazarse (pan), hacer zoom con gestos o botones,
 * visualizar el radio de emergencia y recentrar la ubicación sin salir de la app.
 */
export default function InteractiveEmergencyMap({
    lat = -12.0689,
    lng = -77.0361,
    titulo = 'Emergencia',
    direccion = 'Lima, Perú',
    onMapTouchStart,
    onMapTouchEnd,
}) {
    const safeTitle = String(titulo).replace(/['"\\]/g, '');
    const safeAddress = String(direccion).replace(/['"\\]/g, '');

    const leafletHtml = useMemo(
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
        html, body, #map {
            width: 100%;
            height: 100%;
            background: #EDF2F7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            touch-action: none;
        }
        .recenter-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: #FFFFFF;
            color: #101828;
            border: 1px solid #D0D5DD;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(0,0,0,0.12);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .recenter-btn:active {
            background: #F2F4F7;
        }
        .coords-bar {
            position: absolute;
            bottom: 6px;
            left: 8px;
            z-index: 999;
            background: rgba(255, 255, 255, 0.92);
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            color: #101828;
            border: 1px solid #E4E7EC;
            pointer-events: none;
        }
        .pulse-pin {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #2E90FA;
            border: 3px solid #FFFFFF;
            box-shadow: 0 0 0 rgba(239, 59, 78, 0.6), 0 2px 6px rgba(0,0,0,0.35);
            animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 59, 78, 0.55); }
            70% { box-shadow: 0 0 0 14px rgba(239, 59, 78, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 59, 78, 0); }
        }
        .leaflet-popup-content-wrapper {
            border-radius: 10px;
            font-size: 12px;
        }
        .popup-title {
            font-weight: 800;
            color: #EF3B4E;
            font-size: 13px;
            margin-bottom: 2px;
        }
        .popup-addr {
            color: #344054;
            font-size: 11.5px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <button class="recenter-btn" onclick="recenterMap()">
        <span>🎯 Centrar</span>
    </button>
    <div class="coords-bar">
        GPS: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}
    </div>

    <script>
        var targetLat = ${Number(lat)};
        var targetLng = ${Number(lng)};

        var map = L.map('map', {
            center: [targetLat, targetLng],
            zoom: 16,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Círculo de radio de emergencia
        L.circle([targetLat, targetLng], {
            color: '#EF3B4E',
            weight: 1.5,
            fillColor: '#EF3B4E',
            fillOpacity: 0.16,
            radius: 90
        }).addTo(map);

        // Marcador principal con ícono y popup informativo
        var marker = L.marker([targetLat, targetLng]).addTo(map);
        marker.bindPopup(
            '<div class="popup-title">${safeTitle}</div><div class="popup-addr">${safeAddress}</div>'
        ).openPopup();

        function recenterMap() {
            map.flyTo([targetLat, targetLng], 16, { duration: 0.6 });
            marker.openPopup();
        }
    </script>
</body>
</html>
        `,
        [lat, lng, safeTitle, safeAddress]
    );

    if (Platform.OS === 'web') {
        return (
            <View style={styles.mapContainer}>
                <iframe
                    title="Mapa de emergencia"
                    srcDoc={leafletHtml}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </View>
        );
    }

    return (
        <View
            style={styles.mapContainer}
            onTouchStart={onMapTouchStart}
            onTouchEnd={onMapTouchEnd}
            onTouchCancel={onMapTouchEnd}
        >
            <WebView
                originWhitelist={['*']}
                source={{ html: leafletHtml }}
                style={styles.webview}
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                javaScriptEnabled={true}
                domStorageEnabled={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mapContainer: {
        height: 230,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#EDF2F7',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});

