import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garden } from '@/models';

const GARDEN_KEY = 'active_garden';

export class StorageService {
  async saveGarden(garden: Garden): Promise<void> {
    await AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(garden));
  }

  async loadGarden(): Promise<Garden | null> {
    try {
      const raw = await AsyncStorage.getItem(GARDEN_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Garden;
    } catch {
      return null;
    }
  }

  async clearGarden(): Promise<void> {
    await AsyncStorage.removeItem(GARDEN_KEY);
  }
}

export const storageService = new StorageService();
