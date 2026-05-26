import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, useColorScheme } from 'react-native';
import MapScreen from '@/screens/MapScreen';
import AssistantScreen from '@/screens/AssistantScreen';
import MaintenanceScreen from '@/screens/MaintenanceScreen';
import PlantCardScreen from '@/screens/PlantCardScreen';
import AboutScreen from '@/screens/AboutScreen';
import { lightTheme, darkTheme } from '@/theme';

export type RootTabParamList = {
  MapTab: undefined;
  AssistantTab: undefined;
  MaintenanceTab: undefined;
};

export type MapStackParamList = {
  Map: undefined;
  PlantCard: { plantId: string };
};

export type AssistantStackParamList = {
  Assistant: undefined;
};

export type MaintenanceStackParamList = {
  Maintenance: undefined;
  PlantCard: { plantId: string };
  About: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const MapStack = createStackNavigator<MapStackParamList>();
const AssistantStack = createStackNavigator<AssistantStackParamList>();
const MaintenanceStack = createStackNavigator<MaintenanceStackParamList>();

const MapStackNavigator = (): React.JSX.Element => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="Map" component={MapScreen} />
    <MapStack.Screen name="PlantCard" component={PlantCardScreen} />
  </MapStack.Navigator>
);

const AssistantStackNavigator = (): React.JSX.Element => (
  <AssistantStack.Navigator screenOptions={{ headerShown: false }}>
    <AssistantStack.Screen name="Assistant" component={AssistantScreen} />
  </AssistantStack.Navigator>
);

const MaintenanceStackNavigator = (): React.JSX.Element => (
  <MaintenanceStack.Navigator screenOptions={{ headerShown: false }}>
    <MaintenanceStack.Screen name="Maintenance" component={MaintenanceScreen} />
    <MaintenanceStack.Screen name="PlantCard" component={PlantCardScreen} />
    <MaintenanceStack.Screen name="About" component={AboutScreen} />
  </MaintenanceStack.Navigator>
);

// Custom nav themes that align with the FloraMap colour palette
const FloraLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary:    lightTheme.primary,
    background: lightTheme.background,
    card:       lightTheme.card,
    text:       lightTheme.text,
    border:     lightTheme.border,
  },
};

const FloraDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:    darkTheme.primary,
    background: darkTheme.background,
    card:       darkTheme.card,
    text:       darkTheme.text,
    border:     darkTheme.border,
  },
};

export const AppNavigator = (): React.JSX.Element => {
  const scheme = useColorScheme();
  const navTheme = scheme === 'dark' ? FloraDarkTheme : FloraLightTheme;
  const t = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   t.primary,
          tabBarInactiveTintColor: t.textMuted,
          tabBarStyle: {
            backgroundColor: t.tabBarBg,
            borderTopColor:  t.tabBarBorder,
          },
        }}
      >
        <Tab.Screen
          name="MapTab"
          component={MapStackNavigator}
          options={{
            tabBarLabel: 'Tuin',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text>,
          }}
        />
        <Tab.Screen
          name="AssistantTab"
          component={AssistantStackNavigator}
          options={{
            tabBarLabel: 'Assistent',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🌿</Text>,
          }}
        />
        <Tab.Screen
          name="MaintenanceTab"
          component={MaintenanceStackNavigator}
          options={{
            tabBarLabel: 'Onderhoud',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
