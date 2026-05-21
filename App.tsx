import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useGardenStore } from '@/store/gardenStore';
import {
  requestNotificationPermissions,
  scheduleDailyMaintenanceNotification,
} from '@/services/NotificationService';

const NotificationBootstrap = (): null => {
  const garden = useGardenStore((s) => s.garden);

  useEffect(() => {
    requestNotificationPermissions().then((granted) => {
      if (granted) scheduleDailyMaintenanceNotification(garden);
    });
  // Re-schedule whenever garden tasks change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden?.plants?.length, garden?.tasks?.length]);

  return null;
};

const App = (): React.JSX.Element => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <NotificationBootstrap />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
