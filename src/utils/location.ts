import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'floramap_gps_cache';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 uur

export interface Coords { latitude: number; longitude: number; }

// Fallback: Amsterdam
const FALLBACK: Coords = { latitude: 52.37, longitude: 4.89 };

export async function getCachedLocation(): Promise<Coords> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const { coords, ts } = JSON.parse(raw);
      if (Date.now() - ts < TTL_MS) return coords;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return FALLBACK;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const coords: Coords = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ coords, ts: Date.now() }));
    return coords;
  } catch {
    return FALLBACK;
  }
}
