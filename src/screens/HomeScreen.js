import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { globalStyles, colors, spacing, radius } from '../styles/globalStyles';
import { useUser } from '../context/UserContext';
import { supabase } from '../services/supabaseClient';

function calcularDistanciaHaversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const radioTierraKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radioTierraKm * c;
}

function encontrarCompaniaMasCercana(lat, lng, companias) {
    let mejorCompania = null;
    let menorDistancia = Infinity;

    for (const compania of companias) {
        const cLat = Number(compania.latitud);
        const cLng = Number(compania.longitud);
        if (Number.isNaN(cLat) || Number.isNaN(cLng)) continue;

        const distancia = calcularDistanciaHaversineKm(lat, lng, cLat, cLng);
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            mejorCompania = compania;
        }
    }

    return mejorCompania;
}

export default function HomeScreen({ navigation }) {
    const { user } = useUser();
    const [centralCercana, setCentralCercana] = useState(null);

    useEffect(() => {
        let mounted = true;
        let watchSub = null;

        const obtenerCentralCercana = async () => {
            try {
                // 1. Consultar compañías y solicitar permiso de ubicación en paralelo
                const [companiasRes, permRes] = await Promise.all([
                    supabase
                        .from('companias_bomberos')
                        .select('id, nombre, latitud, longitud')
                        .eq('activa', true),
                    Location.requestForegroundPermissionsAsync(),
                ]);

                if (!mounted) return;

                if (permRes.status !== 'granted') {
                    setCentralCercana('Central 116');
                    return;
                }

                const companias = !companiasRes.error && Array.isArray(companiasRes.data)
                    ? companiasRes.data
                    : [];

                if (companias.length === 0) {
                    setCentralCercana('Central 116');
                    return;
                }

                const actualizarConCoords = (lat, lng) => {
                    if (!mounted || typeof lat !== 'number' || typeof lng !== 'number') return false;
                    const mejor = encontrarCompaniaMasCercana(lat, lng, companias);
                    if (mejor?.nombre) {
                        setCentralCercana(mejor.nombre);
                        return true;
                    }
                    return false;
                };

                // 2. Lectura instantánea (< 20ms) de la última posición en caché del dispositivo
                let resuelto = false;
                try {
                    const lastKnown = await Location.getLastKnownPositionAsync({
                        maxAge: 600000,
                    });
                    if (lastKnown?.coords) {
                        resuelto = actualizarConCoords(
                            lastKnown.coords.latitude,
                            lastKnown.coords.longitude
                        );
                    }
                } catch {
                    // Continuar con lectura activa
                }

                // 3. Refinar con lectura actual acotada a 4s (evita que quede cargando indefinidamente)
                try {
                    const currentPromise = Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Low,
                    });
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('GPS_TIMEOUT')), 4000)
                    );
                    const location = await Promise.race([currentPromise, timeoutPromise]);
                    if (location?.coords) {
                        resuelto = actualizarConCoords(
                            location.coords.latitude,
                            location.coords.longitude
                        );
                    }
                } catch {
                    // Si excedió 4s, escuchar el siguiente evento GPS automáticamente sin bloquear
                }

                // 4. Suscripción ligera para actualizar automáticamente si el usuario se mueve o el GPS tardó en fijar
                try {
                    watchSub = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.Balanced,
                            timeInterval: 10000,
                            distanceInterval: 50,
                        },
                        (loc) => {
                            if (loc?.coords) {
                                actualizarConCoords(loc.coords.latitude, loc.coords.longitude);
                            }
                        }
                    );
                } catch {
                    if (!resuelto && mounted) {
                        setCentralCercana('Central 116');
                    }
                }
            } catch (err) {
                console.warn('[HomeScreen] No se pudo calcular la central cercana:', err?.message || err);
                if (mounted) {
                    setCentralCercana((prev) => prev || 'Central 116');
                }
            }
        };

        obtenerCentralCercana();

        return () => {
            mounted = false;
            if (watchSub) {
                watchSub.remove();
            }
        };
    }, []);

    // Obtener primer nombre del usuario formateado
    const rawNombre =
        user?.datosReniec?.first_name?.trim()?.split(/\s+/)[0] ||
        user?.nombre?.trim()?.split(/\s+/)[0] ||
        '';
    const primerNombre = rawNombre
        ? rawNombre.charAt(0).toUpperCase() + rawNombre.slice(1).toLowerCase()
        : '';

    const pregunta = primerNombre ? `¿Necesitas ayuda ${primerNombre}?` : '¿Necesitas ayuda?';

    const llamarEmergencia = (numero, servicio) => {
        const url = `tel:${numero}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Llamada rápida', `Llama directamente marcando al ${numero} (${servicio}).`);
                }
            })
            .catch(() => {
                Alert.alert('Llamada rápida', `Llama directamente marcando al ${numero} (${servicio}).`);
            });
    };

    return (
        <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                {/* 1. Header con espaciado generoso e indicador de estado */}
                <View style={styles.header}>
                    <View style={styles.statusPill}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>
                            OmniGuard Activo · {centralCercana || 'Buscando central cercana...'}
                        </Text>
                    </View>

                    <Text style={styles.title}>{pregunta}</Text>
                    <Text style={styles.subtitle}>
                        Envía una alerta geolocalizada a los bomberos o contacta líneas de auxilio en tiempo real.
                    </Text>
                </View>

                {/* 2. ThumbZone: Botón Principal de Emergencia ergonómico */}
                <View style={styles.thumbZone}>
                    <TouchableOpacity
                        style={styles.emergencyCard}
                        activeOpacity={0.88}
                        onPress={() => navigation.navigate('ReportEmergency')}
                    >
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="alert-octagon" size={46} color={colors.surface} />
                        </View>
                        <Text style={styles.emergencyTitle}>REPORTAR EMERGENCIA</Text>
                        <Text style={styles.emergencySubtitle}>
                            Toca aquí para enviar auxilio inmediato
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 3. Accesos de alta utilidad: Marcado rápido de auxilio */}
                <View style={styles.supportSection}>
                    <Text style={styles.supportLabel}>Llamadas directas de emergencia</Text>
                    <View style={styles.supportRow}>
                        <TouchableOpacity
                            style={styles.callCard}
                            activeOpacity={0.8}
                            onPress={() => llamarEmergencia('116', 'Bomberos')}
                        >
                            <View style={[styles.callIconWrap, { backgroundColor: '#FEE4E2' }]}>
                                <MaterialCommunityIcons name="fire-truck" size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.callNumber}>116</Text>
                            <Text style={styles.callName}>Bomberos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.callCard}
                            activeOpacity={0.8}
                            onPress={() => llamarEmergencia('105', 'Policía')}
                        >
                            <View style={[styles.callIconWrap, { backgroundColor: '#E0EAFF' }]}>
                                <MaterialCommunityIcons name="shield-check" size={24} color="#3538CD" />
                            </View>
                            <Text style={styles.callNumber}>105</Text>
                            <Text style={styles.callName}>Policía</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.callCard}
                            activeOpacity={0.8}
                            onPress={() => llamarEmergencia('106', 'SAMU')}
                        >
                            <View style={[styles.callIconWrap, { backgroundColor: '#D1FADF' }]}>
                                <MaterialCommunityIcons name="ambulance" size={24} color="#027A48" />
                            </View>
                            <Text style={styles.callNumber}>106</Text>
                            <Text style={styles.callName}>SAMU</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    header: {
        marginTop: spacing.sm,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(18, 183, 106, 0.12)',
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        maxWidth: '100%',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: radius.round,
        backgroundColor: colors.success,
        marginRight: spacing.xs + 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success,
        flexShrink: 1,
        lineHeight: 16,
    },
    title: {
        fontSize: 27,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 21,
    },
    thumbZone: {
        marginVertical: spacing.lg,
    },
    emergencyCard: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg + 4,
        paddingVertical: spacing.xl + 4,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.38,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: radius.round,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    emergencyTitle: {
        color: colors.surface,
        fontSize: 19,
        fontWeight: '900',
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    emergencySubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
    },
    supportSection: {
        marginBottom: spacing.xs,
    },
    supportLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: spacing.sm + 2,
    },
    supportRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    callCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    callIconWrap: {
        width: 44,
        height: 44,
        borderRadius: radius.round,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    callNumber: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    callName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        marginTop: 1,
    },
});
