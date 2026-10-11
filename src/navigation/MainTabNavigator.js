import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/globalStyles';

import HomeScreen from '../screens/HomeScreen';
import MonitorScreen from '../screens/MonitorScreen';
import MisReportesScreen from '../screens/MisReportesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
    const tabHeight = 60 + (insets.bottom > 0 ? insets.bottom : 8);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: tabHeight,
                    paddingBottom: bottomPadding,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 2,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Monitor') {
                        iconName = focused ? 'map' : 'map-outline';
                    } else if (route.name === 'MisReportes') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Inicio' }}
            />
            <Tab.Screen
                name="Monitor"
                component={MonitorScreen}
                options={{ tabBarLabel: 'Monitor' }}
            />
            <Tab.Screen
                name="MisReportes"
                component={MisReportesScreen}
                options={{ tabBarLabel: 'Mis Reportes' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Perfil' }}
            />
        </Tab.Navigator>
    );
}
