import * as Notifications from 'expo-notifications';
import { Garden } from '@/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleDailyMaintenanceNotification = async (
  garden: Garden | null,
): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!garden) return;

  const todayStr = new Date().toISOString().slice(0, 10);

  let dueTodayCount = 0;
  let overdueCount = 0;
  const harvestAlerts: string[] = [];

  const currentMonth = new Date().getMonth();

  for (const plant of garden.plants) {
    if (plant.harvestMonths?.includes(currentMonth)) {
      harvestAlerts.push(plant.commonName);
    }
    for (const task of plant.maintenanceTasks) {
      if (task.completedDate) continue;
      const taskDate = task.dueDate.slice(0, 10);
      if (taskDate < todayStr) overdueCount++;
      else if (taskDate === todayStr) dueTodayCount++;
    }
  }

  const totalDue = dueTodayCount + overdueCount;
  if (totalDue === 0 && harvestAlerts.length === 0) return;

  let body = '';
  if (totalDue > 0) {
    body = totalDue === 1
      ? 'Je hebt 1 onderhoudstaak die aandacht nodig heeft.'
      : `Je hebt ${totalDue} onderhoudstaken die aandacht nodig hebben.`;
  }
  if (harvestAlerts.length > 0) {
    const names = harvestAlerts.slice(0, 2).join(', ');
    const extra = harvestAlerts.length > 2 ? ` en ${harvestAlerts.length - 2} meer` : '';
    const harvestMsg = `🍓 Oogstmaand: controleer ${names}${extra}.`;
    body = body ? `${body} ${harvestMsg}` : harvestMsg;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌿 FloraMap — Tuin update',
      body,
      sound: true,
    },
    trigger: {
      type: 'daily',
      hour: 8,
      minute: 0,
    } as Notifications.DailyTriggerInput,
  });
};
