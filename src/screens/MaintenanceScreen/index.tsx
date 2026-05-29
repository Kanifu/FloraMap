import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, SectionList,
  TouchableOpacity, ScrollView, FlatList, Alert, Modal, TextInput,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useGardenStore } from '@/store/gardenStore';
import { MaintenanceTask, MaintenanceTaskType, Plant, GardenTask, SoilProfile, SoilAmendment, SoilType } from '@/models';
import { MaintenanceStackParamList } from '@/navigation/AppNavigator';
import { relativeDueLabel } from '@/utils/dateUtils';
import { generateICS } from '@/utils/icsExport';
import { generateGardenHTML } from '@/utils/pdfExport';
import * as Print from 'expo-print';
import Constants from 'expo-constants';
import { getCachedLocation } from '@/utils/location';
import { useTheme } from '@/hooks/useTheme';
import { getMoonInfo } from '@/utils/moonPhase';
import { ACHIEVEMENTS } from '@/data/achievements';

type MaintenanceNavProp = StackNavigationProp<MaintenanceStackParamList, 'Maintenance'>;
type Tab = 'taken' | 'planning' | 'geschiedenis' | 'bodem';

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Begieten',
  prune: 'Snoeien',
  fertilize: 'Bemesten',
  repot: 'Verpotten',
  treat: 'Behandelen',
};

const TASK_ICONS: Record<MaintenanceTaskType, string> = {
  water: '💧',
  prune: '✂️',
  fertilize: '🌱',
  repot: '🪴',
  treat: '🩹',
};

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

const DAY_NAMES = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

const SEASONAL_TIPS: Record<number, string> = {
  0: '❄️ Januari: Controleer planten op vorstschade. Snoeiseizoen voor appel- en perenbomen.',
  1: '❄️ Februari: Begin met het snoeien van rozen. Zaai tomaten en paprika binnen op.',
  2: '🌱 Maart: Start met bemesten. Plant vroege groenten buiten als het niet meer vriest.',
  3: '🌸 April: Plant zomerbollen. Pas op voor nachtvorst bij gevoelige planten.',
  4: '☀️ Mei: Regelmatig water geven. Onkruid wieden voor het zich zaait.',
  5: '☀️ Juni: Dagelijks water geven bij warm weer. Snijd verbloeide bloemen af.',
  6: '🌞 Juli: Intensief water geven. Oogst groenten regelmatig voor extra productie.',
  7: '🌞 Augustus: Droogteperiode — extra water geven. Begin met oogsten van najaarsfruit.',
  8: '🍂 September: Verzamel zaden voor volgend jaar. Maai het gazon lager.',
  9: '🍂 Oktober: Plant voorjaarsbollen. Verwijder afgestorven planten.',
  10: '🍁 November: Snoei klimplanten en struiken. Mulch kwetsbare wortels voor de winter.',
  11: '❄️ December: Rust voor de tuin. Maak gereedschap schoon en plan volgend jaar.',
};

// ── Soil health constants ─────────────────────────────────────────────────────

const PH_PRESETS = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0];

const SOIL_TYPES: { value: SoilType; label: string }[] = [
  { value: 'loam', label: 'Leem' },
  { value: 'clay', label: 'Klei' },
  { value: 'sand', label: 'Zand' },
  { value: 'peat', label: 'Veen' },
];

const SOIL_TYPE_LABELS: Record<SoilType, string> = {
  loam: 'Leem', clay: 'Klei', sand: 'Zand', peat: 'Veen',
};

const AMENDMENT_PRESETS = ['Kalk', 'Compost', 'Tuinzwavel', 'Bloedmeel', 'Wormenhumus', 'Kunstmest'];

const PLANT_PH_NEEDS: Record<string, { min: number; max: number }> = {
  'tomaat': { min: 6.0, max: 6.8 }, 'tomaten': { min: 6.0, max: 6.8 },
  'aardappel': { min: 5.0, max: 6.5 }, 'aardappelen': { min: 5.0, max: 6.5 },
  'wortel': { min: 6.0, max: 6.8 }, 'wortelen': { min: 6.0, max: 6.8 },
  'sla': { min: 6.0, max: 7.0 }, 'spinazie': { min: 6.5, max: 7.5 },
  'kool': { min: 6.5, max: 7.5 }, 'spruitjes': { min: 6.5, max: 7.5 },
  'ui': { min: 6.0, max: 7.0 }, 'uien': { min: 6.0, max: 7.0 },
  'prei': { min: 6.5, max: 7.5 }, 'aardbei': { min: 5.5, max: 6.5 },
  'aardbeien': { min: 5.5, max: 6.5 }, 'blauwe bes': { min: 4.5, max: 5.5 },
  'frambozen': { min: 5.5, max: 6.5 }, 'framboos': { min: 5.5, max: 6.5 },
  'roos': { min: 6.0, max: 7.0 }, 'rozen': { min: 6.0, max: 7.0 },
  'lavendel': { min: 6.5, max: 7.5 }, 'zonnebloem': { min: 6.0, max: 7.5 },
  'komkommer': { min: 6.0, max: 7.0 }, 'courgette': { min: 6.0, max: 7.0 },
  'paprika': { min: 6.0, max: 6.8 }, 'basilicum': { min: 6.0, max: 7.5 },
  'peterselie': { min: 6.0, max: 7.0 }, 'munt': { min: 6.0, max: 7.0 },
  'tijm': { min: 6.0, max: 8.0 }, 'boon': { min: 6.0, max: 7.0 },
  'bonen': { min: 6.0, max: 7.0 }, 'erwt': { min: 6.0, max: 7.5 },
  'erwten': { min: 6.0, max: 7.5 },
};

const getPHInfo = (ph: number): { label: string; color: string } => {
  if (ph < 5.5) return { label: 'Sterk zuur', color: '#e63946' };
  if (ph < 6.5) return { label: 'Licht zuur', color: '#ffb703' };
  if (ph < 7.5) return { label: 'Neutraal', color: '#2d6a4f' };
  return { label: 'Alkalisch', color: '#3a86ff' };
};

const getPlantAdvice = (ph: number, plants: Plant[]): string[] => {
  const seen = new Set<string>();
  const advice: string[] = [];
  for (const plant of plants) {
    const key = plant.commonName.toLowerCase();
    const needs = PLANT_PH_NEEDS[key];
    if (!needs || seen.has(key)) continue;
    seen.add(key);
    if (ph < needs.min - 0.2) {
      advice.push(`${plant.commonName} heeft pH ${needs.min}–${needs.max} nodig (bodem te zuur)`);
    } else if (ph > needs.max + 0.2) {
      advice.push(`${plant.commonName} heeft pH ${needs.min}–${needs.max} nodig (bodem te alkalisch)`);
    }
    if (advice.length >= 3) break;
  }
  return advice;
};

// ── SoilProfileCard ──────────────────────────────────────────────────────────

interface SoilProfileCardProps {
  profile: SoilProfile;
  plants: Plant[];
  onAddAmendment: (profileId: string) => void;
  onDelete: (profileId: string) => void;
}

const SoilProfileCard = ({ profile, plants, onAddAmendment, onDelete }: SoilProfileCardProps): React.JSX.Element => {
  const theme = useTheme();
  const phInfo = profile.ph !== undefined ? getPHInfo(profile.ph) : null;
  const advice = profile.ph !== undefined ? getPlantAdvice(profile.ph, plants) : [];
  const recentAmendments = [...profile.amendments].reverse().slice(0, 3);

  const s = StyleSheet.create({
    card: { backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12, gap: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    zoneName: { fontSize: 16, fontWeight: '700', color: theme.primaryDark, flex: 1 },
    badgeRow: { flexDirection: 'row', gap: 6 },
    phBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    phBadgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    stBadge: { backgroundColor: theme.primaryBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: theme.borderLight },
    stBadgeText: { fontSize: 12, color: theme.primary, fontWeight: '600' },
    subText: { fontSize: 11, color: theme.textMuted },
    divider: { height: 1, backgroundColor: theme.border },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
    adviceRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
    adviceText: { fontSize: 12, color: theme.text, flex: 1, lineHeight: 18 },
    okText: { fontSize: 12, color: theme.primary, fontStyle: 'italic' },
    amendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    amendText: { fontSize: 12, color: theme.text, flex: 1 },
    amendDate: { fontSize: 11, color: theme.textMuted },
    btnRow: { flexDirection: 'row', gap: 8 },
    addBtn: { flex: 1, backgroundColor: theme.primaryBg, borderRadius: 8, borderWidth: 1, borderColor: theme.borderLight, padding: 10, alignItems: 'center' },
    addBtnText: { fontSize: 13, fontWeight: '600', color: theme.primary },
    delBtn: { backgroundColor: theme.dangerLight, borderRadius: 8, borderWidth: 1, borderColor: theme.danger, padding: 10, paddingHorizontal: 14, alignItems: 'center' },
    delBtnText: { fontSize: 15 },
  });

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.zoneName}>{profile.zoneName}</Text>
        <View style={s.badgeRow}>
          {phInfo && (
            <View style={[s.phBadge, { backgroundColor: phInfo.color }]}>
              <Text style={s.phBadgeText}>pH {profile.ph?.toFixed(1)}</Text>
            </View>
          )}
          {profile.soilType && (
            <View style={s.stBadge}>
              <Text style={s.stBadgeText}>{SOIL_TYPE_LABELS[profile.soilType]}</Text>
            </View>
          )}
        </View>
      </View>

      {phInfo && (
        <Text style={s.subText}>
          {phInfo.label}
          {profile.lastTestedDate
            ? ` · getest: ${new Date(profile.lastTestedDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : ' · testdatum onbekend'}
        </Text>
      )}

      <View style={s.divider} />

      <Text style={s.sectionLabel}>🧪 Advies</Text>
      {profile.ph === undefined ? (
        <Text style={s.okText}>Voer een pH-waarde in voor automatisch advies</Text>
      ) : advice.length === 0 ? (
        <Text style={s.okText}>✅ pH is geschikt voor je planten</Text>
      ) : (
        advice.map((tip, i) => (
          <View key={i} style={s.adviceRow}>
            <Text>⚠️</Text>
            <Text style={s.adviceText}>{tip}</Text>
          </View>
        ))
      )}

      {recentAmendments.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Recente toevoegingen</Text>
          {recentAmendments.map((a) => (
            <View key={a.id} style={s.amendRow}>
              <Text style={s.amendText}>🧴 {a.type}{a.notes ? ` — ${a.notes}` : ''}</Text>
              <Text style={s.amendDate}>{new Date(a.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</Text>
            </View>
          ))}
        </>
      )}

      <View style={s.btnRow}>
        <TouchableOpacity style={s.addBtn} onPress={() => onAddAmendment(profile.id)}>
          <Text style={s.addBtnText}>+ Toevoeging</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.delBtn} onPress={() => onDelete(profile.id)}>
          <Text style={s.delBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface DailyForecast { date: string; rainMm: number; tempMax: number; emoji: string; }
interface WeatherData {
  loaded: boolean;
  rainExpected: boolean;
  rainMm: number;
  tempMax: number;
  tempMin: number;
  isDry: boolean;
  weatherEmoji: string;
  dailyForecast: DailyForecast[];
}

const EMPTY_WEATHER: WeatherData = {
  loaded: false, rainExpected: false, rainMm: 0,
  tempMax: 0, tempMin: 0, isDry: false, weatherEmoji: '🌡️', dailyForecast: [],
};

const weatherCodeToEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if (code <= 3)  return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  return '⛈️';
};

const fetchWeather = async (): Promise<WeatherData> => {
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

    return {
      loaded: true,
      rainExpected: totalMm > 4,
      rainMm: totalMm,
      tempMax: todayMax,
      tempMin: todayMin,
      isDry: next3Rain < 2 && todayMax >= 20,
      weatherEmoji: weatherCodeToEmoji(wCodes[0] ?? 0),
      dailyForecast,
    };
  } catch {
    return { ...EMPTY_WEATHER, loaded: true };
  }
};

interface FlatTask {
  task: MaintenanceTask;
  plant: Plant;
  isOverdue: boolean;
  isRecurring: boolean;
}

interface Section { title: string; data: FlatTask[]; }

const startOfDay = (dateStr: string): string => dateStr.slice(0, 10);

const groupTasks = (flatTasks: FlatTask[], now: Date): Section[] => {
  const todayStr = startOfDay(now.toISOString());
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = startOfDay(weekEnd.toISOString());
  const today: FlatTask[] = [];
  const thisWeek: FlatTask[] = [];
  const later: FlatTask[] = [];
  for (const ft of flatTasks) {
    const dueDateStr = startOfDay(ft.task.dueDate);
    if (dueDateStr <= todayStr) today.push(ft);
    else if (dueDateStr <= weekEndStr) thisWeek.push(ft);
    else later.push(ft);
  }
  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: 'Vandaag & achterstallig', data: today });
  if (thisWeek.length > 0) sections.push({ title: 'Deze week', data: thisWeek });
  if (later.length > 0) sections.push({ title: 'Later', data: later });
  return sections;
};

const formatDateLabel = (dateKey: string, todayStr: string): string => {
  if (dateKey === todayStr) return 'Vandaag';
  const tomorrowDate = new Date(todayStr);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dateKey === tomorrowDate.toISOString().slice(0, 10)) return 'Morgen';
  const d = new Date(dateKey);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
};

// ── SwipeableTaskItem ──────────────────────────────────────────────────────────

interface TaskItemProps {
  flatTask: FlatTask;
  onComplete: (plantId: string, taskId: string) => void;
  onNavigate: (plantId: string) => void;
  rainExpected: boolean;
}

const TaskItem = ({ flatTask, onComplete, onNavigate, rainExpected }: TaskItemProps): React.JSX.Element => {
  const theme = useTheme();
  const { task, plant, isOverdue, isRecurring } = flatTask;
  const swipeableRef = useRef<Swipeable>(null);
  const isWateringInRain = task.type === 'water' && rainExpected;
  const styles = StyleSheet.create({
    swipeComplete: {
      backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
      width: 72, borderRadius: 12, marginBottom: 8,
    },
    swipeCompleteText: { color: theme.card, fontWeight: '700', fontSize: 13, textAlign: 'center' },
    taskRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.cardAlt, borderRadius: 12,
      borderWidth: 1, borderColor: theme.border,
      padding: 14, marginBottom: 8, gap: 10,
    },
    taskRowOverdue: { borderColor: theme.danger, backgroundColor: theme.dangerLight },
    taskRowSkip: { borderColor: theme.info, backgroundColor: theme.infoLight },
    taskIcon: { fontSize: 22 },
    taskBody: { flex: 1, gap: 2 },
    taskNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    taskPlantName: { fontSize: 15, fontWeight: '600', color: theme.primaryDark },
    recurringBadge: {
      fontSize: 10, color: theme.primary, backgroundColor: theme.primaryLight,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
      fontWeight: '600', overflow: 'hidden',
    },
    taskType: { fontSize: 13, color: theme.textSecondary },
    taskNotes: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' },
    taskDue: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    textOverdue: { color: theme.danger },
    skipText: { fontSize: 12, color: theme.primaryDark, fontStyle: 'italic' },
    klaarButton: {
      backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 8, marginLeft: 8,
    },
    klaarButtonMuted: { backgroundColor: theme.textSecondary },
    klaarButtonText: { color: theme.card, fontWeight: '700', fontSize: 13 },
  });

  const handleComplete = () => {
    swipeableRef.current?.close();
    onComplete(plant.id, task.id);
  };

  const renderRightActions = () => (
    <TouchableOpacity style={styles.swipeComplete} onPress={handleComplete} activeOpacity={0.85}>
      <Text style={styles.swipeCompleteText}>✓{'\n'}Klaar</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      overshootRight={false}
      friction={2}>
      <TouchableOpacity
        style={[
          styles.taskRow,
          isOverdue && !isWateringInRain && styles.taskRowOverdue,
          isWateringInRain && styles.taskRowSkip,
        ]}
        onPress={() => onNavigate(plant.id)}
        activeOpacity={0.7}>
        <Text style={styles.taskIcon}>{TASK_ICONS[task.type]}</Text>
        <View style={styles.taskBody}>
          <View style={styles.taskNameRow}>
            <Text style={[styles.taskPlantName, isOverdue && !isWateringInRain && styles.textOverdue]}>
              {plant.commonName}
            </Text>
            {isRecurring && <Text style={styles.recurringBadge}>↺ herhalend</Text>}
          </View>
          <Text style={styles.taskType}>{TASK_LABELS[task.type]}</Text>
          {task.notes ? <Text style={styles.taskNotes}>{task.notes}</Text> : null}
          {isWateringInRain
            ? <Text style={styles.skipText}>🌧️ Regen verwacht — begieten overslaan?</Text>
            : <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>
                {relativeDueLabel(task.dueDate)}
              </Text>}
        </View>
        <TouchableOpacity
          style={[styles.klaarButton, isWateringInRain && styles.klaarButtonMuted]}
          onPress={handleComplete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.klaarButtonText}>✓</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );
};

const URGENCY_LABELS: Record<string, string> = {
  high: '⚡ Vandaag', medium: '📅 Binnen 3 dagen', low: '🗓️ Binnen een week',
};

interface GardenTaskItemProps { task: GardenTask; onComplete: (taskId: string) => void; }
const GardenTaskItem = ({ task, onComplete }: GardenTaskItemProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = StyleSheet.create({
    taskRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.cardAlt, borderRadius: 12,
      borderWidth: 1, borderColor: theme.border,
      padding: 14, marginBottom: 8, gap: 10,
    },
    taskRowOverdue: { borderColor: theme.danger, backgroundColor: theme.dangerLight },
    taskIcon: { fontSize: 22 },
    taskBody: { flex: 1, gap: 2 },
    taskPlantName: { fontSize: 15, fontWeight: '600', color: theme.primaryDark },
    taskType: { fontSize: 13, color: theme.textSecondary },
    taskDue: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    textOverdue: { color: theme.danger },
    klaarButton: {
      backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 8, marginLeft: 8,
    },
    klaarButtonText: { color: theme.card, fontWeight: '700', fontSize: 13 },
  });
  const isOverdue = !task.completedDate && task.dueDate < new Date().toISOString();
  return (
    <View style={[styles.taskRow, isOverdue && styles.taskRowOverdue, task.completedDate ? { opacity: 0.5 } : null]}>
      <Text style={styles.taskIcon}>🌿</Text>
      <View style={styles.taskBody}>
        <Text style={[styles.taskPlantName, isOverdue && styles.textOverdue]}>{task.plantName ?? 'Tuin'}</Text>
        <Text style={styles.taskType}>{task.description}</Text>
        <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>{URGENCY_LABELS[task.urgency] ?? ''}</Text>
      </View>
      {!task.completedDate && (
        <TouchableOpacity style={styles.klaarButton} onPress={() => onComplete(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.klaarButtonText}>✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

const MaintenanceScreen = (): React.JSX.Element => {
  const theme = useTheme();
  const navigation = useNavigation<MaintenanceNavProp>();
  const garden = useGardenStore((s) => s.garden);
  const completeMaintenanceTask = useGardenStore((s) => s.completeMaintenanceTask);
  const completeGardenTask = useGardenStore((s) => s.completeGardenTask);
  const setSoilProfile = useGardenStore((s) => s.setSoilProfile);
  const addSoilAmendment = useGardenStore((s) => s.addSoilAmendment);
  const deleteSoilProfile = useGardenStore((s) => s.deleteSoilProfile);
  const soilProfiles = garden?.soilProfiles ?? [];
  const recentUnlockId = useGardenStore((s) => s.recentUnlockId);
  const clearRecentUnlock = useGardenStore((s) => s.clearRecentUnlock);

  const [weather, setWeather]               = useState<WeatherData>(EMPTY_WEATHER);
  const [activeTab, setActiveTab]           = useState<Tab>('taken');
  const [exporting, setExporting]           = useState(false);
  const [exportingPDF, setExportingPDF]     = useState(false);
  const [showAllTasks, setShowAllTasks]     = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddSoilModal, setShowAddSoilModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZonePh, setNewZonePh] = useState(6.5);
  const [newZoneSoilType, setNewZoneSoilType] = useState<SoilType | undefined>(undefined);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendProfileId, setAmendProfileId] = useState<string | null>(null);
  const [amendType, setAmendType] = useState('');
  const [amendNotes, setAmendNotes] = useState('');

  const currentMonth = new Date().getMonth();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: theme.primaryDark },
    headerActions: { flexDirection: 'row', gap: 4 },
    headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerIconText: { fontSize: 22 },
    rainBanner: {
      backgroundColor: theme.infoLight, paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.info,
    },
    rainBannerText: { fontSize: 13, color: theme.primaryDark, fontWeight: '600' },
    tabBar: {
      flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    tabBtn: {
      flex: 1, paddingVertical: 12, alignItems: 'center',
      borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: theme.primary },
    tabLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    tabLabelActive: { color: theme.primary },
    listContent: { padding: 12, gap: 4, paddingBottom: 32 },
    emptyScroll: { flexGrow: 1, padding: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12, flex: 1 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 16, color: theme.textMuted, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 24 },
    sectionHeader: { paddingVertical: 8, paddingHorizontal: 4 },
    sectionHeaderText: {
      fontSize: 13, fontWeight: '700', color: theme.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    gardenTasksSection: { marginTop: 4 },
    seasonCard: {
      backgroundColor: theme.primaryBg, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight,
      padding: 14, gap: 6, marginBottom: 12,
    },
    seasonTitle: { fontSize: 12, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
    seasonText: { fontSize: 14, color: theme.primaryDark, lineHeight: 20 },
    harvestCard: {
      backgroundColor: theme.warningLight, borderRadius: 12, borderWidth: 1, borderColor: theme.warning,
      padding: 14, gap: 6, marginBottom: 12,
    },
    harvestTitle: { fontSize: 13, fontWeight: '700', color: theme.primaryDark },
    harvestItem: { fontSize: 13, color: theme.text, lineHeight: 20 },
    // Moon phase card
    moonCard: {
      backgroundColor: theme.cardAlt, borderRadius: 14, borderWidth: 1,
      borderColor: theme.border, padding: 14, gap: 8, marginBottom: 14,
    },
    moonCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    moonEmoji: { fontSize: 32 },
    moonPhaseLabel: { fontSize: 15, fontWeight: '700', color: theme.primaryDark },
    moonElementLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    moonTip: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', lineHeight: 18 },
    // Planning tab
    planningDayHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 8, paddingHorizontal: 4, marginTop: 4,
    },
    planningDayLabel: { fontSize: 14, fontWeight: '700', color: theme.primaryDark, flex: 1 },
    planningDayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    planningDayTemp:  { fontSize: 13, fontWeight: '600', color: theme.primary },
    planningDayCount: { fontSize: 12, color: theme.textMuted },
    planningRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.cardAlt, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 12, paddingVertical: 10,
      marginBottom: 6, gap: 10,
    },
    planningRowOverdue: { borderColor: theme.danger, backgroundColor: theme.dangerLight },
    planningIcon: { fontSize: 18 },
    taskBody: { flex: 1, gap: 2 },
    taskPlantName: { fontSize: 15, fontWeight: '600', color: theme.primaryDark },
    recurringBadge: {
      fontSize: 10, color: theme.primary, backgroundColor: theme.primaryLight,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
      fontWeight: '600', overflow: 'hidden',
    },
    taskType: { fontSize: 13, color: theme.textSecondary },
    textOverdue: { color: theme.danger },
    klaarButton: {
      backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 8, marginLeft: 8,
    },
    klaarButtonText: { color: theme.card, fontWeight: '700', fontSize: 13 },
    // Geschiedenis tab
    historyRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.cardAlt, borderRadius: 10,
      borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 12, paddingVertical: 10,
      marginBottom: 6, gap: 10, opacity: 0.85,
    },
    historyIcon: { fontSize: 18 },
    historyMeta: { alignItems: 'flex-end', gap: 2 },
    historyDate: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
    historyTime: { fontSize: 11, color: theme.textMuted },
    // Weather card
    weatherCard: {
      backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight,
      padding: 14, gap: 8, marginBottom: 12,
    },
    weatherCardDry: { borderColor: theme.warning, backgroundColor: theme.warningLight },
    weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    weatherEmoji: { fontSize: 36 },
    weatherInfo: { flex: 1, gap: 2 },
    weatherTemp: { fontSize: 20, fontWeight: '700', color: theme.primaryDark },
    weatherDesc: { fontSize: 13, color: theme.textSecondary },
    weatherDryAlert: {
      fontSize: 13, fontWeight: '600', color: theme.primaryDark,
      backgroundColor: theme.warningLight, borderRadius: 8, padding: 8, textAlign: 'center',
    },
    // Show more tasks
    showMoreBtn: {
      backgroundColor: theme.primaryBg, borderRadius: 10, borderWidth: 1, borderColor: theme.borderLight,
      padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 8,
    },
    showMoreText: { fontSize: 14, fontWeight: '600', color: theme.primary },
    // Toast
    toast: {
      position: 'absolute', bottom: 24, left: 16, right: 16,
      backgroundColor: theme.primaryDark, borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22, shadowRadius: 4, elevation: 6,
    },
    toastText: { color: theme.card, fontWeight: '600', fontSize: 14, textAlign: 'center' },
    // Soil tab
    addZoneBtn: {
      backgroundColor: theme.primaryBg, borderRadius: 10, borderWidth: 1, borderColor: theme.borderLight,
      padding: 14, alignItems: 'center', marginBottom: 12,
    },
    addZoneBtnText: { fontSize: 14, fontWeight: '700', color: theme.primary },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, gap: 14, paddingBottom: 32,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.primaryDark },
    modalLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
    modalInput: {
      backgroundColor: theme.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.text,
    },
    phPresetsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    phPresetBtn: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
      borderColor: theme.border, backgroundColor: theme.cardAlt,
    },
    phPresetBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    phPresetText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    phPresetTextActive: { color: theme.primaryDark },
    soilTypesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    soilTypeBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
      borderColor: theme.border, backgroundColor: theme.cardAlt,
    },
    soilTypeBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    soilTypeText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    soilTypeTextActive: { color: theme.primaryDark },
    amendPresetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    amendPresetBtn: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
      borderColor: theme.border, backgroundColor: theme.cardAlt,
    },
    amendPresetText: { fontSize: 12, color: theme.textSecondary },
    modalSaveBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
    modalSaveBtnText: { color: theme.card, fontWeight: '700', fontSize: 16 },
    modalCancelBtn: {
      backgroundColor: theme.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
      padding: 12, alignItems: 'center',
    },
    modalCancelBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
  });

  useEffect(() => { fetchWeather().then(setWeather); }, []);

  useEffect(() => {
    if (!recentUnlockId) return;
    const def = ACHIEVEMENTS.find((a) => a.id === recentUnlockId);
    if (def) {
      setToast(`${def.emoji} Prestatie ontgrendeld: ${def.title}!`);
      setTimeout(() => setToast(null), 4000);
    }
    clearRecentUnlock();
  }, [recentUnlockId, clearRecentUnlock]);

  const harvestAlerts = useMemo(() => {
    if (!garden) return [];
    return garden.plants.filter((p) => p.harvestMonths?.includes(currentMonth));
  }, [garden, currentMonth]);

  // ── Taken tab data ────────────────────────────────────────────────────────
  const sections = useMemo((): Section[] => {
    if (!garden) return [];
    const now = new Date();
    const nowStr = now.toISOString();
    const flatTasks: FlatTask[] = [];
    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) continue;
        flatTasks.push({ task, plant, isOverdue: task.dueDate < nowStr, isRecurring: !!task.intervalDays });
      }
    }
    flatTasks.sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
    return groupTasks(flatTasks, now);
  }, [garden]);

  // ── Planning tab data (next 30 days, grouped by date) ────────────────────
  const planningGroups = useMemo(() => {
    if (!garden) return [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowStr = now.toISOString();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 30);
    const limitStr = limit.toISOString().slice(0, 10);

    const map = new Map<string, FlatTask[]>();
    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) continue;
        const dateKey = task.dueDate.slice(0, 10);
        if (dateKey > limitStr) continue;
        const entry: FlatTask = { task, plant, isOverdue: task.dueDate < nowStr, isRecurring: !!task.intervalDays };
        const existing = map.get(dateKey) ?? [];
        existing.push(entry);
        map.set(dateKey, existing);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, tasks]) => ({ dateKey, label: formatDateLabel(dateKey, todayStr), tasks }));
  }, [garden]);

  // ── Geschiedenis tab data ─────────────────────────────────────────────────
  interface CompletedEntry { task: MaintenanceTask; plant: Plant; }
  const historyGroups = useMemo(() => {
    if (!garden) return [];
    const completed: CompletedEntry[] = [];
    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) completed.push({ task, plant });
      }
    }
    completed.sort((a, b) => (b.task.completedDate ?? '').localeCompare(a.task.completedDate ?? ''));
    const byMonth = new Map<string, CompletedEntry[]>();
    for (const entry of completed) {
      const d = new Date(entry.task.completedDate!);
      const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      const existing = byMonth.get(key) ?? [];
      existing.push(entry);
      byMonth.set(key, existing);
    }
    return Array.from(byMonth.entries()).map(([month, entries]) => ({ month, entries }));
  }, [garden]);

  const handleComplete = useCallback((plantId: string, taskId: string) => {
    const plant = garden?.plants.find((p) => p.id === plantId);
    const task  = plant?.maintenanceTasks.find((t) => t.id === taskId);
    completeMaintenanceTask(plantId, taskId);
    if (task?.intervalDays) {
      const msg = `✓ ${TASK_LABELS[task.type]} klaar · volgende beurt over ${task.intervalDays} dagen`;
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  }, [completeMaintenanceTask, garden]);

  const handleNavigate = useCallback((plantId: string) => {
    navigation.navigate('PlantCard', { plantId });
  }, [navigation]);

  const activeGardenTasks = useMemo(() => (garden?.tasks ?? []).filter((t) => !t.completedDate), [garden]);
  const hasActiveTasks = sections.length > 0 || activeGardenTasks.length > 0;

  // ── ICS export ────────────────────────────────────────────────────────────
  const handleExportICS = useCallback(async () => {
    if (!garden) return;
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Delen niet beschikbaar', 'Delen wordt niet ondersteund op dit apparaat.');
      return;
    }
    setExporting(true);
    try {
      const icsContent = generateICS(garden.plants);
      const fileUri = `${FileSystem.cacheDirectory}floramap-taken.ics`;
      await FileSystem.writeAsStringAsync(fileUri, icsContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/calendar',
        dialogTitle: 'FloraMap taken exporteren',
        UTI: 'public.calendar',
      });
    } catch {
      Alert.alert('Exporteren mislukt', 'Kon het kalenderbestand niet aanmaken.');
    } finally {
      setExporting(false);
    }
  }, [garden]);

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (!garden) return;
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Delen niet beschikbaar', 'Delen wordt niet ondersteund op dit apparaat.');
      return;
    }
    setExportingPDF(true);
    try {
      const version = (Constants.expoConfig?.version ?? '?') as string;
      const html = generateGardenHTML(garden, version);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `FloraMap — ${garden.name}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('PDF exporteren mislukt', 'Kon het PDF-bestand niet aanmaken.');
    } finally {
      setExportingPDF(false);
    }
  }, [garden]);

  // ── Soil handlers ────────────────────────────────────────────────────────
  const handleSaveSoilProfile = useCallback(() => {
    if (!newZoneName.trim()) return;
    const profile: SoilProfile = {
      id: `soil-${Date.now()}`,
      gardenId: garden?.id ?? '',
      zoneName: newZoneName.trim(),
      ph: newZonePh,
      soilType: newZoneSoilType,
      lastTestedDate: new Date().toISOString(),
      amendments: [],
    };
    setSoilProfile(profile);
    setShowAddSoilModal(false);
    setNewZoneName('');
    setNewZonePh(6.5);
    setNewZoneSoilType(undefined);
  }, [newZoneName, newZonePh, newZoneSoilType, garden, setSoilProfile]);

  const handleSaveAmendment = useCallback(() => {
    if (!amendType.trim() || !amendProfileId) return;
    const amendment: SoilAmendment = {
      id: `amend-${Date.now()}`,
      date: new Date().toISOString(),
      type: amendType.trim(),
      notes: amendNotes.trim() || undefined,
    };
    addSoilAmendment(amendProfileId, amendment);
    setShowAmendModal(false);
    setAmendType('');
    setAmendNotes('');
    setAmendProfileId(null);
  }, [amendType, amendNotes, amendProfileId, addSoilAmendment]);

  const handleDeleteSoilProfile = useCallback((profileId: string) => {
    Alert.alert('Zone verwijderen', 'Weet je zeker dat je dit bodemprofiel wilt verwijderen?', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => deleteSoilProfile(profileId) },
    ]);
  }, [deleteSoilProfile]);

  // ── Shared header pieces ──────────────────────────────────────────────────
  const seasonalTip = SEASONAL_TIPS[currentMonth];
  const moonInfo = getMoonInfo();

  const infoHeader = (
    <>
      {/* Weather card */}
      {weather.loaded && (
        <View style={[styles.weatherCard, weather.isDry && styles.weatherCardDry]}>
          <View style={styles.weatherMain}>
            <Text style={styles.weatherEmoji}>{weather.weatherEmoji}</Text>
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTemp}>
                {weather.tempMax}° / {weather.tempMin}°
              </Text>
              <Text style={styles.weatherDesc}>
                {weather.rainExpected
                  ? `🌧️ ${weather.rainMm} mm regen de komende 48u`
                  : weather.isDry
                  ? '☀️ Droog — extra begieten nodig!'
                  : 'Geen regen verwacht de komende tijd'}
              </Text>
            </View>
          </View>
          {weather.isDry && (
            <Text style={styles.weatherDryAlert}>
              💧 Droog en warm weer · Controleer of je planten genoeg water krijgen
            </Text>
          )}
        </View>
      )}

      {seasonalTip && (
        <View style={styles.seasonCard}>
          <Text style={styles.seasonTitle}>Seizoenstip</Text>
          <Text style={styles.seasonText}>{seasonalTip}</Text>
        </View>
      )}
      {harvestAlerts.length > 0 && (
        <View style={styles.harvestCard}>
          <Text style={styles.harvestTitle}>🍓 Oogstmaand — {MONTH_NAMES[currentMonth]}</Text>
          {harvestAlerts.map((p) => (
            <Text key={p.id} style={styles.harvestItem}>
              • {p.commonName}{p.species ? ` (${p.species})` : ''} — controleer op rijpe vruchten
            </Text>
          ))}
        </View>
      )}
    </>
  );

  const gardenTasksSection = activeGardenTasks.length > 0 ? (
    <View style={styles.gardenTasksSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Tuin taken</Text>
      </View>
      {activeGardenTasks.map((t) => (
        <GardenTaskItem key={t.id} task={t} onComplete={completeGardenTask} />
      ))}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Onderhoud</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleExportPDF}
            style={styles.headerIconBtn}
            disabled={exportingPDF || !garden}>
            <Text style={styles.headerIconText}>{exportingPDF ? '⏳' : '📄'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExportICS}
            style={styles.headerIconBtn}
            disabled={exporting || !garden}>
            <Text style={styles.headerIconText}>{exporting ? '⏳' : '📅'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.headerIconBtn}>
            <Text style={styles.headerIconText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rain banner */}
      {weather.rainExpected && (
        <View style={styles.rainBanner}>
          <Text style={styles.rainBannerText}>
            🌧️ Regen verwacht ({weather.rainMm} mm in 48u) — begietentaken worden aangegeven
          </Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['taken', 'planning', 'geschiedenis', 'bodem'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'taken' ? 'Taken' : tab === 'planning' ? 'Planning' : tab === 'geschiedenis' ? 'Logboek' : 'Bodem'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Taken tab ── */}
      {activeTab === 'taken' && (
        !hasActiveTasks && harvestAlerts.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyScroll}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🌿</Text>
              <Text style={styles.emptyText}>Geen openstaande taken</Text>
            </View>
            {infoHeader}
          </ScrollView>
        ) : (() => {
          const visibleSections = showAllTasks ? sections : sections.slice(0, 1);
          const hiddenCount = showAllTasks
            ? 0
            : sections.slice(1).reduce((n, s) => n + s.data.length, 0);
          return (
            <SectionList
              sections={visibleSections}
              keyExtractor={(item) => `${item.plant.id}-${item.task.id}`}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={infoHeader}
              ListFooterComponent={(
                <>
                  {hiddenCount > 0 && (
                    <TouchableOpacity
                      style={styles.showMoreBtn}
                      onPress={() => setShowAllTasks(true)}>
                      <Text style={styles.showMoreText}>
                        Toon {hiddenCount} meer {hiddenCount === 1 ? 'taak' : 'taken'} deze week →
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showAllTasks && sections.length > 1 && (
                    <TouchableOpacity
                      style={styles.showMoreBtn}
                      onPress={() => setShowAllTasks(false)}>
                      <Text style={styles.showMoreText}>Toon alleen vandaag ↑</Text>
                    </TouchableOpacity>
                  )}
                  {gardenTasksSection}
                </>
              )}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TaskItem
                  flatTask={item}
                  onComplete={handleComplete}
                  onNavigate={handleNavigate}
                  rainExpected={weather.rainExpected}
                />
              )}
            />
          );
        })()
      )}

      {/* ── Planning tab ── */}
      {activeTab === 'planning' && (
        planningGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Geen taken gepland voor de komende 30 dagen</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {/* Moon phase card */}
            <View style={styles.moonCard}>
              <View style={styles.moonCardLeft}>
                <Text style={styles.moonEmoji}>{moonInfo.emoji}</Text>
                <View>
                  <Text style={styles.moonPhaseLabel}>{moonInfo.phaseLabel}</Text>
                  <Text style={styles.moonElementLabel}>{moonInfo.elementLabel}</Text>
                </View>
              </View>
              <Text style={styles.moonTip}>{moonInfo.gardening}</Text>
            </View>
            {planningGroups.map(({ dateKey, label, tasks }) => {
              const dayWeather = weather.dailyForecast.find((d) => d.date === dateKey);
              return (
              <View key={dateKey}>
                <View style={styles.planningDayHeader}>
                  <Text style={styles.planningDayLabel}>
                    {dayWeather ? `${dayWeather.emoji} ` : ''}{label}
                  </Text>
                  <View style={styles.planningDayRight}>
                    {dayWeather && (
                      <Text style={styles.planningDayTemp}>{dayWeather.tempMax}°</Text>
                    )}
                    <Text style={styles.planningDayCount}>{tasks.length} {tasks.length === 1 ? 'taak' : 'taken'}</Text>
                  </View>
                </View>
                {tasks.map((ft) => (
                  <View key={`${ft.plant.id}-${ft.task.id}`} style={[styles.planningRow, ft.isOverdue && styles.planningRowOverdue]}>
                    <Text style={styles.planningIcon}>{TASK_ICONS[ft.task.type]}</Text>
                    <View style={styles.taskBody}>
                      <Text style={[styles.taskPlantName, ft.isOverdue && styles.textOverdue]}>{ft.plant.commonName}</Text>
                      <Text style={styles.taskType}>{TASK_LABELS[ft.task.type]}{ft.task.notes ? ` — ${ft.task.notes}` : ''}</Text>
                    </View>
                    {ft.isRecurring && <Text style={styles.recurringBadge}>↺</Text>}
                    <TouchableOpacity
                      style={styles.klaarButton}
                      onPress={() => handleComplete(ft.plant.id, ft.task.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.klaarButtonText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              );
            })}
          </ScrollView>
        )
      )}

      {/* ── Geschiedenis tab ── */}
      {activeTab === 'geschiedenis' && (
        historyGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Nog geen voltooide taken</Text>
          </View>
        ) : (
          <FlatList
            data={historyGroups}
            keyExtractor={(item) => item.month}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: group }) => (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{group.month}</Text>
                </View>
                {group.entries.map((entry) => {
                  const completedAt = new Date(entry.task.completedDate!);
                  const dateStr = completedAt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
                  const timeStr = completedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <View key={`${entry.plant.id}-${entry.task.id}`} style={styles.historyRow}>
                      <Text style={styles.historyIcon}>{TASK_ICONS[entry.task.type]}</Text>
                      <View style={styles.taskBody}>
                        <Text style={styles.taskPlantName}>{entry.plant.commonName}</Text>
                        <Text style={styles.taskType}>{TASK_LABELS[entry.task.type]}{entry.task.notes ? ` — ${entry.task.notes}` : ''}</Text>
                      </View>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                        <Text style={styles.historyTime}>{timeStr}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          />
        )
      )}

      {/* ── Bodem tab ── */}
      {activeTab === 'bodem' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <TouchableOpacity style={styles.addZoneBtn} onPress={() => setShowAddSoilModal(true)}>
            <Text style={styles.addZoneBtnText}>+ 🧪 Tuinzone toevoegen</Text>
          </TouchableOpacity>
          {soilProfiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧪</Text>
              <Text style={styles.emptyText}>
                Nog geen bodemprofielen.{'\n'}Voeg een tuinzone toe om pH en bodemtype bij te houden.
              </Text>
            </View>
          ) : (
            soilProfiles.map((profile) => (
              <SoilProfileCard
                key={profile.id}
                profile={profile}
                plants={garden?.plants ?? []}
                onAddAmendment={(id) => { setAmendProfileId(id); setShowAmendModal(true); }}
                onDelete={handleDeleteSoilProfile}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Add soil zone modal */}
      <Modal
        visible={showAddSoilModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSoilModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🧪 Tuinzone toevoegen</Text>
            <View>
              <Text style={styles.modalLabel}>Naam van de zone</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="bijv. Moestuin, Borders, Kas"
                placeholderTextColor={theme.textMuted}
                value={newZoneName}
                onChangeText={setNewZoneName}
              />
            </View>
            <View>
              <Text style={styles.modalLabel}>pH-waarde (huidige meting)</Text>
              <View style={styles.phPresetsRow}>
                {PH_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.phPresetBtn, Math.abs(newZonePh - p) < 0.01 && styles.phPresetBtnActive]}
                    onPress={() => setNewZonePh(p)}>
                    <Text style={[styles.phPresetText, Math.abs(newZonePh - p) < 0.01 && styles.phPresetTextActive]}>
                      {p.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={styles.modalLabel}>Bodemtype</Text>
              <View style={styles.soilTypesRow}>
                {SOIL_TYPES.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.soilTypeBtn, newZoneSoilType === value && styles.soilTypeBtnActive]}
                    onPress={() => setNewZoneSoilType(newZoneSoilType === value ? undefined : value)}>
                    <Text style={[styles.soilTypeText, newZoneSoilType === value && styles.soilTypeTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveSoilProfile}>
              <Text style={styles.modalSaveBtnText}>Opslaan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddSoilModal(false)}>
              <Text style={styles.modalCancelBtnText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add amendment modal */}
      <Modal
        visible={showAmendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAmendModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🧴 Toevoeging registreren</Text>
            <View>
              <Text style={styles.modalLabel}>Type toevoeging</Text>
              <View style={styles.amendPresetRow}>
                {AMENDMENT_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={styles.amendPresetBtn}
                    onPress={() => setAmendType(preset)}>
                    <Text style={styles.amendPresetText}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Of typ een andere toevoeging..."
                placeholderTextColor={theme.textMuted}
                value={amendType}
                onChangeText={setAmendType}
              />
            </View>
            <View>
              <Text style={styles.modalLabel}>Notities (optioneel)</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="bijv. hoeveelheid, reden..."
                placeholderTextColor={theme.textMuted}
                value={amendNotes}
                onChangeText={setAmendNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveAmendment}>
              <Text style={styles.modalSaveBtnText}>Opslaan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAmendModal(false)}>
              <Text style={styles.modalCancelBtnText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast voor herhalende taken */}
      {toast !== null && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default MaintenanceScreen;
