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
  weatherData?: { rainExpected: boolean; droughtDays: number; tempMax: number },
): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!garden) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString();

  let dueTodayCount = 0;
  let overdueCount = 0;
  const harvestAlerts: string[] = [];
  const droughtWaterPlants: string[] = [];

  const currentMonth = new Date().getMonth();
  const isActiveDrought = (weatherData?.droughtDays ?? 0) >= 3 && (weatherData?.tempMax ?? 0) >= 20;

  for (const plant of garden.plants) {
    if (plant.harvestMonths?.includes(currentMonth)) {
      harvestAlerts.push(plant.commonName);
    }
    for (const task of plant.maintenanceTasks) {
      if (task.completedDate) continue;
      const taskDate = task.dueDate.slice(0, 10);
      if (taskDate < todayStr) overdueCount++;
      else if (taskDate === todayStr) dueTodayCount++;

      // Collect water tasks due within 3 days for drought alert
      if (isActiveDrought && task.type === 'water' && task.dueDate <= in3DaysStr) {
        droughtWaterPlants.push(plant.commonName);
      }
    }
  }

  const totalDue = dueTodayCount + overdueCount;
  if (totalDue === 0 && harvestAlerts.length === 0 && droughtWaterPlants.length === 0) return;

  let body = '';

  // Drought alert takes priority
  if (isActiveDrought && droughtWaterPlants.length > 0) {
    const plantNames = [...new Set(droughtWaterPlants)];
    body = `🔥 ${weatherData!.droughtDays} droge dagen — begiet vandaag: ${plantNames.join(', ')}`;
  } else if (totalDue > 0) {
    body = totalDue === 1
      ? 'Je hebt 1 onderhoudstaak die aandacht nodig heeft.'
      : `Je hebt ${totalDue} onderhoudstaken die aandacht nodig hebben.`;
  }

  // Rain advisory
  if (weatherData?.rainExpected) {
    const rainMsg = '🌧️ Regen verwacht — begieten overslaan!';
    body = body ? `${body} ${rainMsg}` : rainMsg;
  }

  if (harvestAlerts.length > 0) {
    const names = harvestAlerts.slice(0, 2).join(', ');
    const extra = harvestAlerts.length > 2 ? ` en ${harvestAlerts.length - 2} meer` : '';
    const harvestMsg = `🍓 Oogstmaand: controleer ${names}${extra}.`;
    body = body ? `${body} ${harvestMsg}` : harvestMsg;
  }

  if (!body) return;

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

export const checkAndScheduleWeatherAlerts = async (): Promise<void> => {
  // 1. Request permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // 2. Get location
  const loc = await getCachedLocation();

  // 3. Fetch Open-Meteo: daily for 3 days + hourly for frost detection
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
    `&daily=temperature_2m_max,windspeed_10m_max,precipitation_sum` +
    `&hourly=temperature_2m` +
    `&forecast_days=3&forecast_hours=72&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return;
  const data = await res.json();

  const maxTemps: number[] = data.daily?.temperature_2m_max ?? [];
  const windSpeeds: number[] = data.daily?.windspeed_10m_max ?? [];
  const hourlyTemps: number[] = data.hourly?.temperature_2m ?? [];

  const todayMax = Math.round(maxTemps[0] ?? 0);
  const tomorrowMax = Math.round(maxTemps[1] ?? 0);
  const todayWind = Math.round(windSpeeds[0] ?? 0);

  // Night temperatures: hours 20-24 and 0-8 (first 48h)
  const nightTemps = hourlyTemps.filter((_, i) => {
    const h = i % 24;
    return h >= 20 || h < 8;
  });
  const minTemp = nightTemps.length > 0 ? Math.min(...nightTemps) : 99;

  // Cancel specific alert notifications before rescheduling
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alertIds = scheduled
    .filter((n) =>
      n.identifier === 'frost-alert' ||
      n.identifier === 'heat-alert' ||
      n.identifier === 'storm-alert',
    )
    .map((n) => n.identifier);
  for (const id of alertIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  // ── Vorstmelding (≤ 2°C at night) ──
  if (minTemp <= 2) {
    const tonight20 = new Date();
    tonight20.setHours(20, 0, 0, 0);
    if (tonight20 < new Date()) tonight20.setDate(tonight20.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: 'frost-alert',
      content: {
        title: '❄️ Vorstmelding FloraMap',
        body: `❄️ Vorstmelding: ${Math.round(minTemp)}°C verwacht — dek gevoelige planten af!`,
        sound: true,
      },
      trigger: { date: tonight20 },
    });
  }

  // ── Hittegolf (tempMax > 30°C today AND tomorrow) ──
  if (todayMax > 30 && tomorrowMax > 30) {
    const today14 = new Date();
    today14.setHours(14, 0, 0, 0);
    if (today14 < new Date()) today14.setDate(today14.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: 'heat-alert',
      content: {
        title: '🌡️ Hittegolf FloraMap',
        body: `🌡️ Hittegolf: ${todayMax}°C vandaag — geef extra water en bescherm gevoelige planten!`,
        sound: true,
      },
      trigger: { date: today14 },
    });
  }

  // ── Storm (windspeed > 60 km/h today) ──
  if (todayWind > 60) {
    const inOneHour = new Date();
    inOneHour.setTime(inOneHour.getTime() + 60 * 60 * 1000);

    await Notifications.scheduleNotificationAsync({
      identifier: 'storm-alert',
      content: {
        title: '🌪️ Stormwaarschuwing FloraMap',
        body: `🌪️ Zware wind verwacht (${todayWind} km/h) — zet balkon- en kasplanten naar binnen!`,
        sound: true,
      },
      trigger: { date: inOneHour },
    });
  }
};

// Backward compatibility: checkAndScheduleFrostAlert delegates to checkAndScheduleWeatherAlerts
export const checkAndScheduleFrostAlert = async (): Promise<void> => {
  return checkAndScheduleWeatherAlerts();
};
