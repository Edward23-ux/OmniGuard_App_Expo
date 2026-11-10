import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import { colors } from '../../styles/globalStyles';

import BomberoDashboardScreen from '../screens/BomberoDashboardScreen';
import BomberoEmergencyDetailScreen from '../screens/BomberoEmergencyDetailScreen';
import BomberoProfileScreen from '../screens/BomberoProfileScreen';
import BomberoHeatmapScreen from '../screens/BomberoHeatmapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function StatusTabIcon({ routeName, color, focused }) {
    const strokeWidth = focused ? 2.3 : 1.9;

    if (routeName === 'BomberoPendientes') {
        // Reloj minimalista (En espera / Pendientes)
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
                <Polyline
                    points="12 7 12 12 15.5 14"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }

    if (routeName === 'BomberoEnProceso') {
        // Unidad / Despacho en curso minimalista
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }

    if (routeName === 'BomberoCulminados') {
        // Escudo / Check de emergencia culminada
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <Polyline
                    points="9 12 11 14 15 10"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }

    // Falsa Alarma: Octágono / Círculo con X minimalista
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
            <Line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
            <Line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </Svg>
    );
}

function BomberoBottomTabs() {
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
    const tabHeight = 64 + (insets.bottom > 0 ? insets.bottom : 8);

    return (
        <Tab.Navigator
            initialRouteName="BomberoPendientes"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: [
                    styles.liquidGlassTabBar,
                    {
                        height: tabHeight,
                        paddingBottom: bottomPadding,
                    },
                ],
                tabBarBackground: () => (
                    <View style={styles.liquidGlassLayer}>
                        <View style={styles.specularTopHighlight} />
                    </View>
                ),
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ focused, color }) => (
                    <StatusTabIcon
                        routeName={route.name}
                        color={color}
                        focused={focused}
                    />
                ),
            })}
        >
            <Tab.Screen
                name="BomberoPendientes"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'Pendiente' }}
                options={{ tabBarLabel: 'Pendientes' }}
            />
            <Tab.Screen
                name="BomberoEnProceso"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'En Proceso' }}
                options={{ tabBarLabel: 'En Proceso' }}
            />
            <Tab.Screen
                name="BomberoCulminados"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'Culminado' }}
                options={{ tabBarLabel: 'Culminados' }}
            />
            <Tab.Screen
                name="BomberoFalsas"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'Falsa Alarma' }}
                options={{ tabBarLabel: 'Falsas' }}
            />
        </Tab.Navigator>
    );
}

export default function BomberoStackNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="BomberoTabs"
            screenOptions={{ headerShown: false }}
        >
            {/* Navegador inferior Liquid Glass con los 4 estados de emergencia */}
            <Stack.Screen name="BomberoTabs" component={BomberoBottomTabs} />

            {/* Pantalla de Mapa de Calor */}
            <Stack.Screen
                name="BomberoHeatmap"
                component={BomberoHeatmapScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />

            {/* Pantalla de Detalle de Emergencia */}
            <Stack.Screen
                name="BomberoEmergencyDetail"
                component={BomberoEmergencyDetailScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />

            {/* Pantalla de Mi Perfil del Bombero */}
            <Stack.Screen
                name="BomberoProfile"
                component={BomberoProfileScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    liquidGlassTabBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.86)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(228, 231, 236, 0.85)',
        paddingTop: 8,
        shadowColor: '#101828',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }
            : {}),
    },
    liquidGlassLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.84)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(228, 231, 236, 0.75)',
    },
    specularTopHighlight: {
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        width: '100%',
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
});
