import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '@/screens/MapScreen';
import AssistantScreen from '@/screens/AssistantScreen';
import MaintenanceScreen from '@/screens/MaintenanceScreen';
import PlantCardScreen from '@/screens/PlantCardScreen';
import AboutScreen from '@/screens/AboutScreen';
import SeedInventoryScreen from '@/screens/SeedInventoryScreen';

export type RootStackParamList = {
  Map: undefined;
  PlantCard: { plantId: string };
  SeedInventory: undefined;
  About: undefined;
  Assistant: undefined;
  Maintenance: undefined;
};

// Keep old type aliases so existing imports in other screens still compile
export type MapStackParamList = RootStackParamList;
export type AssistantStackParamList = RootStackParamList;
export type MaintenanceStackParamList = RootStackParamList;

const RootStack = createStackNavigator<RootStackParamList>();

export const AppNavigator = (): React.JSX.Element => (
  <NavigationContainer>
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Map" component={MapScreen} />
      <RootStack.Screen name="PlantCard" component={PlantCardScreen} />
      <RootStack.Screen name="SeedInventory" component={SeedInventoryScreen} />
      <RootStack.Screen name="About" component={AboutScreen} />
      <RootStack.Screen name="Assistant" component={AssistantScreen} />
      <RootStack.Screen name="Maintenance" component={MaintenanceScreen} />
    </RootStack.Navigator>
  </NavigationContainer>
);
