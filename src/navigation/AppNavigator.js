import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import ReportEmergencyScreen from '../screens/ReportEmergencyScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
                name="ReportEmergency"
                component={ReportEmergencyScreen}
                options={{
                    animation: 'slide_from_bottom',
                }}
            />
        </Stack.Navigator>
    );
}
