import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import LoginScreen from '../screens/LoginScreen';
import ScanDniScreen from '../screens/ScanDniScreen';
import MainTabNavigator from './MainTabNavigator';
import ReportEmergencyScreen from '../screens/ReportEmergencyScreen';
import CitizenReportDetailScreen from '../screens/CitizenReportDetailScreen';
import BomberoLoginScreen from '../bombero/screens/BomberoLoginScreen';
import BomberoStackNavigator from '../bombero/navigation/BomberoStackNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const navigation = useNavigation();

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response?.notification?.request?.content?.data || {};
            if (data?.role === 'bombero') {
                navigation.navigate('BomberoStack', { screen: 'BomberoTabs' });
            } else {
                navigation.navigate('MainTabs', { screen: 'MisReportes' });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [navigation]);

    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
                name="ScanDni"
                component={ScanDniScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
                name="ReportEmergency"
                component={ReportEmergencyScreen}
                options={{
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="CitizenReportDetail"
                component={CitizenReportDetailScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen
                name="BomberoLogin"
                component={BomberoLoginScreen}
                options={{
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen
                name="BomberoStack"
                component={BomberoStackNavigator}
            />
        </Stack.Navigator>
    );
}
