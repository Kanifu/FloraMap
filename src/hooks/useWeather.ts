import { useState, useEffect, useRef } from 'react';
import { getCachedLocation } from '@/utils/location';

export interface DailyForecast {
  date: string;
  rainMm: number;
  tempMax: number;
  emoji: string;
}

export interface WeatherData {
  loaded: boolean;
  rainExpected: boolean;
  rainMm: number;
  tempMax: number;
  tempMin: number;
  isDry: boolean;
  droughtDays: number;   // consecutive days ahead with <2mm rain
  weatherEmoji: string;
  dailyForecast: DailyForecast[];
}

export const EMPTY_WEATHER: WeatherData = {
  loaded: false, rainExpected: false, rainMm: 0,
  tempMax: 0, tempMin: 0, isDry: false, droughtDays: 0,
  weatherEmoji: '🌡️', dailyForecast: [],
};

const CACHE_MS = 30 * 60 * 1000; // 30 minutes
let cachedData: WeatherData | null = null;
let cachedAt = 0;

export const weatherCodeToEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if (code <= 3)  return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  return '⛈️';
};

export const fetchWeatherData = async (): Promise<WeatherData> => {
  // Return cached data if fresh
  if (cachedData && Date.now() - cachedAt < CACHE_MS) return cachedData;

  try {
    const loc = await getCachedLocation();
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
      `&hourly=precipitation&forecast_days=7&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return { ...EMPTY_WEATHER, loaded: true };
    const data = await res.json();

    const hourlyPrecip: number[] = data.hourly?.precipitation ?? [];
    const totalMm = Math.round(
      hourlyPrecip.slice(0, 48).reduce((s: number, v: number) => s + v, 0) * 10,
    ) / 10;

    const dates: string[]    = data.daily?.time ?? [];
    const maxTemps: number[] = data.daily?.temperature_2m_max ?? [];
    const minTemps: number[] = data.daily?.temperature_2m_min ?? [];
    const rainSums: number[] = data.daily?.precipitation_sum ?? [];
    const wCodes: number[]   = data.daily?.weathercode ?? [];

    const dailyForecast: DailyForecast[] = dates.map((date, i) => ({
      date,
      rainMm: Math.round((rainSums[i] ?? 0) * 10) / 10,
      tempMax: Math.round(maxTemps[i] ?? 0),
      emoji: weatherCodeToEmoji(wCodes[i] ?? 0),
    }));

    const todayMax  = Math.round(maxTemps[0] ?? 0);
    const todayMin  = Math.round(minTemps[0] ?? 0);
    const next3Rain = (rainSums.slice(0, 3) as number[]).reduce((s, v) => s + v, 0);

    const droughtDays = (() => {
      let count = 0;
      for (const r of rainSums) { if ((r ?? 0) < 2) count++; else break; }
      return count;
    })();

    const result: WeatherData = {
      loaded: true,
      rainExpected: totalMm > 4,
      rainMm: totalMm,
      tempMax: todayMax,
      tempMin: todayMin,
      isDry: next3Rain < 2 && todayMax >= 20,
      droughtDays,
      weatherEmoji: weatherCodeToEmoji(wCodes[0] ?? 0),
      dailyForecast,
    };

    cachedData = result;
    cachedAt = Date.now();
    return result;
  } catch {
    return { ...EMPTY_WEATHER, loaded: true };
  }
};

/** Hook that fetches weather once on mount, cached 30 min across components */
export const useWeather = (): WeatherData => {
  const [weather, setWeather] = useState<WeatherData>(
    cachedData && Date.now() - cachedAt < CACHE_MS ? cachedData : EMPTY_WEATHER
  );
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchWeatherData().then(setWeather);
  }, []);

  return weather;
};
