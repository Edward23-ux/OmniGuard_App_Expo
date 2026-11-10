import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BomberoDashboardScreen from '../screens/BomberoDashboardScreen';
import BomberoEmergencyDetailScreen from '../screens/BomberoEmergencyDetailScreen';
import BomberoProfileScreen from '../screens/BomberoProfileScreen';
import BomberoHeatmapScreen from '../screens/BomberoHeatmapScreen';

const Stack = createNativeStackNavigator();

export default function BomberoStackNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="BomberoPendientes"
            screenOptions={{ headerShown: false }}
        >
            {/* Pantallas de estados de emergencia en Stack Navigation */}
            <Stack.Screen
                name="BomberoPendientes"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'Pendiente' }}
                options={{ animation: 'fade' }}
            />
            <Stack.Screen
                name="BomberoEnProceso"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'En Proceso' }}
                options={{ animation: 'fade' }}
            />
            <Stack.Screen
                name="BomberoCulminados"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'Culminado' }}
                options={{ animation: 'fade' }}
            />
            <Stack.Screen
                name="BomberoFalsas"
                component={BomberoDashboardScreen}
                initialParams={{ statusFilter: 'Falsa Alarma' }}
                options={{ animation: 'fade' }}
            />

            {/* Pantalla de Mapa de Calor en Stack Navigation */}
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
