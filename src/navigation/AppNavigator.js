import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportEmergencyScreen from '../screens/ReportEmergencyScreen';
import MisReportesScreen from '../screens/MisReportesScreen';
import MonitorScreen from '../screens/MonitorScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false }} // cada pantalla dibuja su propio header
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ReportEmergency" component={ReportEmergencyScreen} />
            <Stack.Screen name="MisReportes" component={MisReportesScreen} />
            <Stack.Screen name="Monitor" component={MonitorScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
    );
}
