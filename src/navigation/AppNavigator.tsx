import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import MapScreen from '@/screens/MapScreen';
import ScanScreen from '@/screens/ScanScreen';
import MaintenanceScreen from '@/screens/MaintenanceScreen';
import PlantCardScreen from '@/screens/PlantCardScreen';

export type RootTabParamList = {
  MapTab: undefined;
  ScanTab: undefined;
  MaintenanceTab: undefined;
};

export type MapStackParamList = {
  Map: undefined;
  PlantCard: { plantId: string };
};

export type ScanStackParamList = {
  Scan: undefined;
};

export type MaintenanceStackParamList = {
  Maintenance: undefined;
  PlantCard: { plantId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const MapStack = createStackNavigator<MapStackParamList>();
const ScanStack = createStackNavigator<ScanStackParamList>();
const MaintenanceStack = createStackNavigator<MaintenanceStackParamList>();

const MapStackNavigator = (): React.JSX.Element => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="Map" component={MapScreen} />
    <MapStack.Screen name="PlantCard" component={PlantCardScreen} />
  </MapStack.Navigator>
);

const ScanStackNavigator = (): React.JSX.Element => (
  <ScanStack.Navigator screenOptions={{ headerShown: false }}>
    <ScanStack.Screen name="Scan" component={ScanScreen} />
  </ScanStack.Navigator>
);

const MaintenanceStackNavigator = (): React.JSX.Element => (
  <MaintenanceStack.Navigator screenOptions={{ headerShown: false }}>
    <MaintenanceStack.Screen name="Maintenance" component={MaintenanceScreen} />
    <MaintenanceStack.Screen name="PlantCard" component={PlantCardScreen} />
  </MaintenanceStack.Navigator>
);

export const AppNavigator = (): React.JSX.Element => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2d6a4f',
        tabBarInactiveTintColor: '#aaa',
      }}>
      <Tab.Screen
        name="MapTab"
        component={MapStackNavigator}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanStackNavigator}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={MaintenanceStackNavigator}
        options={{
          tabBarLabel: 'Maintenance',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text>,
        }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);
