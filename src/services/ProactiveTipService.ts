import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden } from '@/models';
import { gardenAssistantService } from './GardenAssistantService';
import * as Notifications from 'expo-notifications';

const TIP_CACHE_KEY_PREFIX = 'floramap_tip_cache_';
const TIP_INTERVAL_HOURS = 24;

interface TipCache {
  text: string;
  generatedAt: string; // ISO
}

export const getDailyTip = async (garden: Garden | null): Promise<string | null> => {
  if (!garden || garden.plants.length === 0) return null;

  const cacheKey = `${TIP_CACHE_KEY_PREFIX}${garden.id}`;

  // Check cache: if tip was generated < TIP_INTERVAL_HOURS ago, return cached
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const tipCache: TipCache = JSON.parse(cached);
      const ageHours = (Date.now() - new Date(tipCache.generatedAt).getTime()) / 3_600_000;
      if (ageHours < TIP_INTERVAL_HOURS) return tipCache.text;
    }
  } catch { /* ignore */ }

  // Generate new tip
  const plantNames = garden.plants.slice(0, 8).map((p) => p.commonName).join(', ');
  const currentMonth = new Date().toLocaleString('nl-NL', { month: 'long' });
  const prompt = `Geef één concrete tuintip voor deze maand (${currentMonth}) voor een tuinder met: ${plantNames}. Maximaal 2 zinnen. Geen markdown.`;

  try {
    const response = await gardenAssistantService.chat(prompt, null, [], []);
    const tip = response.text.trim();
    if (!tip) return null;

    await AsyncStorage.setItem(cacheKey, JSON.stringify({ text: tip, generatedAt: new Date().toISOString() }));
    return tip;
  } catch {
    return null;
  }
};

export const scheduleDailyTipNotification = async (tip: string): Promise<void> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-tip',
      content: {
        title: '🌿 FloraMap tuintip',
        body: tip,
        sound: true,
      },
      trigger: {
        hour: 10,
        minute: 0,
        repeats: false,
      } as Notifications.NotificationTriggerInput,
    });
  } catch { /* ignore */ }
};
