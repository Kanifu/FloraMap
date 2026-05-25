import * as Notifications from 'expo-notifications';
import { Garden } from '@/models';
import { getCachedLocation } from '@/utils/location';

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
      hour: 8,
      minute: 0,
      repeats: true,
    },
  });
};

export const checkAndScheduleFrostAlert = async (): Promise<void> => {
  // 1. Vraag permissie (expo-notifications, al aanwezig)
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // 2. Haal locatie op via getCachedLocation()
  const loc = await getCachedLocation();

  // 3. Open-Meteo: hourly temperatuur komende 48u
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m&forecast_hours=48&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  const temps: number[] = data.hourly?.temperature_2m ?? [];

  // 4. Laagste nachttemperatuur (uur 20:00-08:00)
  const nightTemps = temps.filter((_, i) => { const h = i % 24; return h >= 20 || h < 8; });
  if (nightTemps.length === 0) return;
  const minTemp = Math.min(...nightTemps);

  // 5. Bij vorst (≤ 2°C): schedule een notificatie voor 20:00 die avond
  if (minTemp <= 2) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const tonight20 = new Date();
    tonight20.setHours(20, 0, 0, 0);
    if (tonight20 < new Date()) tonight20.setDate(tonight20.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❄️ Vorstmelding FloraMap',
        body: `Vannacht vorst verwacht (${Math.round(minTemp)}°C) — dek gevoelige planten af!`,
        sound: true,
      },
      trigger: { date: tonight20 },
    });
  }
};
