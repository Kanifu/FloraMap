import { MMKV } from 'react-native-mmkv';
import { Garden } from '@/models';

const storage = new MMKV({ id: 'floramap-data' });

const GARDEN_KEY = 'active_garden';

export class StorageService {
  saveGarden(garden: Garden): void {
    storage.set(GARDEN_KEY, JSON.stringify(garden));
  }

  loadGarden(): Garden | null {
    const raw = storage.getString(GARDEN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Garden;
    } catch {
      return null;
    }
  }

  clearGarden(): void {
    storage.delete(GARDEN_KEY);
  }
}

export const storageService = new StorageService();
