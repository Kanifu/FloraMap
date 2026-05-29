import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, SectionList,
  TouchableOpacity, ScrollView, FlatList, Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useGardenStore } from '@/store/gardenStore';
import { MaintenanceTask, MaintenanceTaskType, Plant, GardenTask } from '@/models';
import { MaintenanceStackParamList } from '@/navigation/AppNavigator';
import { relativeDueLabel } from '@/utils/dateUtils';
import { generateICS } from '@/utils/icsExport';
import { checkAndScheduleWeatherAlerts, scheduleDailyMaintenanceNotification } from '@/services/NotificationService';
import { plantDatabase } from '@/data/plantDatabase';
import { useWeather, WeatherData, DailyForecast, EMPTY_WEATHER } from '@/hooks/useWeather';
import { FeedbackModal } from '@/components/FeedbackModal';

type MaintenanceNavProp = StackNavigationProp<MaintenanceStackParamList, 'Maintenance'>;
type Tab = 'taken' | 'planning' | 'zaai' | 'geschiedenis';

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

// WeatherData types and fetching are in @/hooks/useWeather

interface FlatTask {
  task: MaintenanceTask;
  plant: Plant;
  isOverdue: boolean;
  isRecurring: boolean;
  isBroughtForward: boolean;  // water task moved forward due to drought
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
    // Droogtetaken worden al in de "vandaag"-bucket geplaatst, ook als ze later gepland staan
    if (dueDateStr <= todayStr || ft.isBroughtForward) today.push(ft);
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
  droughtDays: number;
}

const TaskItem = ({ flatTask, onComplete, onNavigate, rainExpected, droughtDays }: TaskItemProps): React.JSX.Element => {
  const { task, plant, isOverdue, isRecurring, isBroughtForward } = flatTask;
  const swipeableRef = useRef<Swipeable>(null);
  const isWateringInRain    = task.type === 'water' && rainExpected;
  const isWateringInDrought = task.type === 'water' && isBroughtForward;

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
          isOverdue && !isWateringInRain && !isWateringInDrought && styles.taskRowOverdue,
          isWateringInRain    && styles.taskRowSkip,
          isWateringInDrought && styles.taskRowDrought,
        ]}
        onPress={() => onNavigate(plant.id)}
        activeOpacity={0.7}>
        <Text style={styles.taskIcon}>{TASK_ICONS[task.type]}</Text>
        <View style={styles.taskBody}>
          <View style={styles.taskNameRow}>
            <Text style={[
              styles.taskPlantName,
              isOverdue && !isWateringInRain && !isWateringInDrought && styles.textOverdue,
              isWateringInDrought && styles.textDrought,
            ]}>
              {plant.commonName}
            </Text>
            {isRecurring && <Text style={styles.recurringBadge}>↺ herhalend</Text>}
          </View>
          <Text style={styles.taskType}>{TASK_LABELS[task.type]}</Text>
          {task.notes ? <Text style={styles.taskNotes}>{task.notes}</Text> : null}
          {isWateringInRain
            ? <Text style={styles.skipText}>🌧️ Regen verwacht — begieten overslaan?</Text>
            : isWateringInDrought
            ? <Text style={styles.droughtText}>🔥 {droughtDays} droge dagen — nu begieten aanbevolen</Text>
            : <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>
                {relativeDueLabel(task.dueDate)}
              </Text>}
        </View>
        <TouchableOpacity
          style={[
            styles.klaarButton,
            isWateringInRain && styles.klaarButtonMuted,
            isWateringInDrought && styles.klaarButtonDrought,
          ]}
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
  const navigation = useNavigation<MaintenanceNavProp>();
  const garden = useGardenStore((s) => s.garden);
  const completeMaintenanceTask = useGardenStore((s) => s.completeMaintenanceTask);
  const completeGardenTask = useGardenStore((s) => s.completeGardenTask);
  const recordTaskCompletion = useGardenStore((s) => s.recordTaskCompletion);
  const gardenStats = useGardenStore((s) => s.gardenStats);
  const weather                              = useWeather();
  const [activeTab, setActiveTab]           = useState<Tab>('taken');
  const [exporting, setExporting]           = useState(false);
  const [showAllTasks, setShowAllTasks]     = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Track badge count to detect new badges
  const prevBadgeCountRef = useRef(gardenStats.badges.length);

  const currentMonth = new Date().getMonth();

  // Schedule notifications when weather loads
  useEffect(() => {
    if (!weather.loaded) return;
    scheduleDailyMaintenanceNotification(garden, {
      rainExpected: weather.rainExpected,
      droughtDays: weather.droughtDays,
      tempMax: weather.tempMax,
    }).catch(() => {});
    checkAndScheduleWeatherAlerts().catch(() => {});
  }, [weather.loaded]);

  // Show toast when a new badge is earned
  useEffect(() => {
    const currentCount = gardenStats.badges.length;
    if (currentCount > prevBadgeCountRef.current) {
      const newBadge = gardenStats.badges[gardenStats.badges.length - 1];
      if (newBadge) {
        setToast(`${newBadge.emoji} Badge verdiend: ${newBadge.name}!`);
        setTimeout(() => setToast(null), 4000);
      }
    }
    prevBadgeCountRef.current = currentCount;
  }, [gardenStats.badges]);

  const harvestAlerts = useMemo(() => {
    if (!garden) return [];
    return garden.plants.filter((p) => p.harvestMonths?.includes(currentMonth));
  }, [garden, currentMonth]);

  // ── Taken tab data ────────────────────────────────────────────────────────
  const sections = useMemo((): Section[] => {
    if (!garden) return [];
    const now = new Date();
    const nowStr = now.toISOString();
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString();

    const isActiveDrought = weather.droughtDays >= 3 && weather.tempMax >= 20;

    const flatTasks: FlatTask[] = [];
    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) continue;
        const isOverdue = task.dueDate < nowStr;
        const isRecurring = !!task.intervalDays;
        const isBroughtForward =
          !isOverdue &&
          task.type === 'water' &&
          isActiveDrought &&
          task.dueDate <= in3DaysStr;
        flatTasks.push({ task, plant, isOverdue, isRecurring, isBroughtForward });
      }
    }
    flatTasks.sort((a, b) => {
      if (a.isBroughtForward && !b.isBroughtForward) return -1;
      if (!a.isBroughtForward && b.isBroughtForward) return 1;
      return a.task.dueDate.localeCompare(b.task.dueDate);
    });
    return groupTasks(flatTasks, now);
  }, [garden, weather.droughtDays, weather.tempMax]);

  // ── Planning tab data ─────────────────────────────────────────────────────
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
        const entry: FlatTask = { task, plant, isOverdue: task.dueDate < nowStr, isRecurring: !!task.intervalDays, isBroughtForward: false };
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
    recordTaskCompletion();
    if (task?.intervalDays) {
      const msg = `✓ ${TASK_LABELS[task.type]} klaar · volgende beurt over ${task.intervalDays} dagen`;
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  }, [completeMaintenanceTask, recordTaskCompletion, garden]);

  const handleGardenTaskComplete = useCallback((taskId: string) => {
    completeGardenTask(taskId);
    recordTaskCompletion();
  }, [completeGardenTask, recordTaskCompletion]);

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

  // ── Shared header pieces ──────────────────────────────────────────────────
  const seasonalTip = SEASONAL_TIPS[currentMonth];

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
        <GardenTaskItem key={t.id} task={t} onComplete={handleGardenTaskComplete} />
      ))}
    </View>
  ) : null;

  // ── Zaai tab data ─────────────────────────────────────────────────────────
  const sowingThisMonth = useMemo(
    () => plantDatabase.filter((p) => p.sowMonths?.includes(currentMonth)),
    [currentMonth],
  );

  const gardenHarvestMonths = useMemo(() => {
    if (!garden) return [] as { name: string; months: number[] }[];
    return garden.plants
      .filter((p) => p.harvestMonths && p.harvestMonths.length > 0)
      .map((p) => ({ name: p.commonName, months: p.harvestMonths! }));
  }, [garden]);

  // ── Streak / badge row ────────────────────────────────────────────────────
  const earnedBadges = gardenStats.badges;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => navigation.navigate('Map')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Tuin</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Onderhoud</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleExportICS}
            style={styles.headerIconBtn}
            disabled={exporting || !garden}>
            <Text style={styles.headerIconText}>{exporting ? '⏳' : '📅'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFeedback(true)} style={styles.headerIconBtn}>
            <Text style={styles.headerIconText}>🐛</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.headerIconBtn}>
            <Text style={styles.headerIconText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Streak & badges row — always visible */}
      <View style={styles.streakRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
          {gardenStats.currentStreak > 0 ? (
            <Text style={styles.streakText}>🔥 {gardenStats.currentStreak} dagen streak</Text>
          ) : (
            <Text style={[styles.streakText, { color: '#52b788' }]}>🌱 Begin je streak — rond een taak af!</Text>
          )}
          {gardenStats.totalTasksCompleted > 0 && (
            <Text style={{ fontSize: 11, color: '#2d6a4f' }}>{gardenStats.totalTasksCompleted} taken ✓</Text>
          )}
        </View>
        {earnedBadges.length > 0 ? (
          <Text style={styles.badgeEmojis}>{earnedBadges.map((b) => b.emoji).join('  ')}</Text>
        ) : (
          <Text style={{ fontSize: 11, color: '#aaa' }}>🏆 Badges: —</Text>
        )}
      </View>

      {/* Rain banner */}
      {weather.rainExpected && (
        <View style={styles.rainBanner}>
          <Text style={styles.rainBannerText}>
            🌧️ Regen verwacht ({weather.rainMm} mm in 48u) — begietentaken worden aangegeven
          </Text>
        </View>
      )}

      {/* Drought banner */}
      {!weather.rainExpected && weather.droughtDays >= 3 && weather.tempMax >= 20 && (
        <View style={styles.droughtBanner}>
          <Text style={styles.droughtBannerText}>
            🔥 {weather.droughtDays} droge dagen · {weather.tempMax}° — watertaken naar voren gehaald
          </Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['taken', 'planning', 'zaai', 'geschiedenis'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'taken' ? 'Taken'
                : tab === 'planning' ? 'Planning'
                : tab === 'zaai' ? 'Zaaikal.'
                : 'Log'}
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
                  droughtDays={weather.droughtDays}
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

      {/* ── Zaaikalender tab ── */}
      {activeTab === 'zaai' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Dit seizoen card */}
          <View style={styles.zaaiSeizoenCard}>
            <Text style={styles.zaaiSeizoenTitle}>🗓️ Dit seizoen — {MONTH_NAMES[currentMonth]}</Text>
            {sowingThisMonth.length === 0 ? (
              <Text style={styles.zaaiEmptyText}>Geen zaaiadvies voor deze maand</Text>
            ) : (
              sowingThisMonth.map((p) => (
                <Text key={p.species} style={styles.zaaiSeizoenItem}>
                  {p.emoji} {p.commonName} — zaaien nu
                </Text>
              ))
            )}
          </View>

          {/* 12-month grid */}
          {MONTH_NAMES.map((monthName, monthIdx) => {
            const isCurrentMonth = monthIdx === currentMonth;
            const sowPlants = plantDatabase.filter((p) => p.sowMonths?.includes(monthIdx));
            const harvestPlants = gardenHarvestMonths.filter((p) => p.months.includes(monthIdx));
            if (sowPlants.length === 0 && harvestPlants.length === 0) {
              return (
                <View
                  key={monthIdx}
                  style={[styles.zaaiMonthCard, isCurrentMonth && styles.zaaiMonthCardCurrent]}>
                  <Text style={[styles.zaaiMonthName, isCurrentMonth && styles.zaaiMonthNameCurrent]}>
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                  </Text>
                  <Text style={styles.zaaiEmptyText}>Geen activiteit</Text>
                </View>
              );
            }
            return (
              <View
                key={monthIdx}
                style={[styles.zaaiMonthCard, isCurrentMonth && styles.zaaiMonthCardCurrent]}>
                <Text style={[styles.zaaiMonthName, isCurrentMonth && styles.zaaiMonthNameCurrent]}>
                  {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                </Text>
                {sowPlants.length > 0 && (
                  <View style={styles.zaaiRow}>
                    <Text style={styles.zaaiRowLabel}>🌱 Zaaien:</Text>
                    <Text style={styles.zaaiRowValue}>
                      {sowPlants.map((p) => `${p.emoji} ${p.commonName}`).join(', ')}
                    </Text>
                  </View>
                )}
                {harvestPlants.length > 0 && (
                  <View style={styles.zaaiRow}>
                    <Text style={styles.zaaiRowLabel}>🍓 Oogsten:</Text>
                    <Text style={styles.zaaiRowValue}>
                      {harvestPlants.map((p) => p.name).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Stats tab removed — use 📊 Statistieken in the drawer (StatsModal) */}
      {(activeTab as string) === 'stats' && (() => {
        const PLANT_EMOJI_HINTS: Record<string, string> = {
          tomaat: '🍅', komkommer: '🥒', paprika: '🫑', sla: '🥬', wortel: '🥕',
          aardappel: '🥔', ui: '🧅', courgette: '🥒', basilicum: '🌿', aardbei: '🍓',
        };
        const getPlantEmoji = (name: string): string => {
          const lower = name.toLowerCase();
          for (const [key, emoji] of Object.entries(PLANT_EMOJI_HINTS)) {
            if (lower.includes(key)) return emoji;
          }
          return '🌿';
        };

        const plants = garden?.plants ?? [];
        const totalPlants = plants.length;
        const totalCompleted = plants.reduce(
          (sum, p) => sum + p.maintenanceTasks.filter((t) => !!t.completedDate).length,
          0,
        );
        const activeTasks = plants.reduce(
          (sum, p) => sum + p.maintenanceTasks.filter((t) => !t.completedDate).length,
          0,
        );
        const totalHarvestGrams = plants.reduce((sum, p) => {
          return sum + (p.harvestLog ?? []).reduce((s, e) => s + (e.amountGrams ?? 0), 0);
        }, 0);

        // Top 5 harvest plants
        const harvestRanking = plants
          .map((p) => ({
            id: p.id,
            name: p.commonName,
            emoji: getPlantEmoji(p.commonName),
            totalGrams: (p.harvestLog ?? []).reduce((s, e) => s + (e.amountGrams ?? 0), 0),
          }))
          .filter((p) => p.totalGrams > 0)
          .sort((a, b) => b.totalGrams - a.totalGrams)
          .slice(0, 5);

        // Task counts per type (completed)
        const taskTypeCounts: Record<string, number> = {};
        for (const p of plants) {
          for (const t of p.maintenanceTasks) {
            if (t.completedDate) {
              taskTypeCounts[t.type] = (taskTypeCounts[t.type] ?? 0) + 1;
            }
          }
        }
        const taskTypeEntries = Object.entries(taskTypeCounts).sort((a, b) => b[1] - a[1]);
        const maxTaskCount = taskTypeEntries.length > 0 ? taskTypeEntries[0][1] : 1;
        const taskTypeIconLabel: Record<string, { icon: string; label: string }> = {
          water: { icon: '💧', label: 'Begieten' },
          fertilize: { icon: '🌱', label: 'Bemesten' },
          prune: { icon: '✂️', label: 'Snoeien' },
          repot: { icon: '🪴', label: 'Verpotten' },
          treat: { icon: '🩹', label: 'Behandelen' },
        };

        const earnedBadgesList = gardenStats.badges;

        return (
          <ScrollView contentContainerStyle={styles.listContent}>
            {/* Section 1: Tuin overzicht */}
            <View style={statsStyles.section}>
              <Text style={statsStyles.sectionTitle}>🌳 Tuin overzicht</Text>
              <View style={statsStyles.statRow}>
                <View style={statsStyles.statCard}>
                  <Text style={statsStyles.statValue}>{totalPlants}</Text>
                  <Text style={statsStyles.statLabel}>Planten</Text>
                </View>
                <View style={statsStyles.statCard}>
                  <Text style={statsStyles.statValue}>{totalCompleted}</Text>
                  <Text style={statsStyles.statLabel}>Taken afgerond</Text>
                </View>
                <View style={statsStyles.statCard}>
                  <Text style={statsStyles.statValue}>{activeTasks}</Text>
                  <Text style={statsStyles.statLabel}>Open taken</Text>
                </View>
              </View>
              <View style={statsStyles.harvestRow}>
                <Text style={statsStyles.harvestLabel}>🍓 Totale oogst</Text>
                <Text style={statsStyles.harvestValue}>
                  {totalHarvestGrams > 0 ? `${totalHarvestGrams}g` : 'Nog niets geoogst'}
                </Text>
              </View>
            </View>

            {/* Section 2: Streak & badges */}
            <View style={statsStyles.section}>
              <Text style={statsStyles.sectionTitle}>🔥 Streak & badges</Text>
              <View style={statsStyles.streakCard}>
                <Text style={statsStyles.streakMain}>
                  {gardenStats.currentStreak > 0 ? '🔥 ' : ''}{gardenStats.currentStreak} {gardenStats.currentStreak === 1 ? 'dag actief' : 'dagen actief'}
                </Text>
                <Text style={statsStyles.streakSub}>
                  Record: {gardenStats.longestStreak} dagen
                </Text>
                <Text style={statsStyles.streakSub}>
                  {gardenStats.totalTasksCompleted} taken afgerond
                </Text>
              </View>
              {earnedBadgesList.length > 0 ? (
                <View style={statsStyles.badgesWrap}>
                  {earnedBadgesList.map((b) => (
                    <View key={b.id} style={statsStyles.badgeChip}>
                      <Text style={statsStyles.badgeChipEmoji}>{b.emoji}</Text>
                      <Text style={statsStyles.badgeChipName}>{b.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={statsStyles.emptyHint}>Nog geen badges — rond je eerste taken af!</Text>
              )}
            </View>

            {/* Section 3: Oogstranking */}
            {harvestRanking.length > 0 && (
              <View style={statsStyles.section}>
                <Text style={statsStyles.sectionTitle}>🏆 Oogstranking</Text>
                {harvestRanking.map((item, idx) => (
                  <View key={item.id} style={statsStyles.rankRow}>
                    <Text style={statsStyles.rankNum}>#{idx + 1}</Text>
                    <Text style={statsStyles.rankEmoji}>{item.emoji}</Text>
                    <Text style={statsStyles.rankName}>{item.name}</Text>
                    <Text style={statsStyles.rankGrams}>{item.totalGrams}g</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Section 4: Taken per type */}
            {taskTypeEntries.length > 0 && (
              <View style={statsStyles.section}>
                <Text style={statsStyles.sectionTitle}>📊 Taken per type (afgerond)</Text>
                {taskTypeEntries.map(([type, count]) => {
                  const info = taskTypeIconLabel[type] ?? { icon: '🔧', label: type };
                  const pct = count / maxTaskCount;
                  return (
                    <View key={type} style={statsStyles.barRow}>
                      <Text style={statsStyles.barIcon}>{info.icon}</Text>
                      <Text style={statsStyles.barLabel}>{info.label}</Text>
                      <View style={statsStyles.barTrack}>
                        <View style={[statsStyles.barFill, { flex: pct }]} />
                        <View style={{ flex: 1 - pct }} />
                      </View>
                      <Text style={statsStyles.barCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        );
      })()}

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

      {/* Toast voor herhalende taken / badges */}
      {toast !== null && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
      <FeedbackModal visible={showFeedback} onClose={() => setShowFeedback(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
  backBtn: { paddingVertical: 2, marginBottom: 2 },
  backBtnText: { fontSize: 13, color: '#2d6a4f', fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { fontSize: 22 },
  // Streak row
  streakRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0faf4', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#b7e4c7',
  },
  streakText: { fontSize: 13, fontWeight: '700', color: '#1b4332' },
  badgeEmojis: { fontSize: 16, letterSpacing: 2 },
  rainBanner: {
    backgroundColor: '#cce5ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#b8d4f0',
  },
  rainBannerText: { fontSize: 13, color: '#0d3a6e', fontWeight: '600' },
  droughtBanner: {
    backgroundColor: '#fff3cd', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f4a261',
  },
  droughtBannerText: { fontSize: 13, color: '#7c3d00', fontWeight: '600' },
  taskRowDrought: { borderColor: '#f4a261', backgroundColor: '#fff9f0' },
  textDrought: { color: '#c05600' },
  droughtText: { fontSize: 12, color: '#c05600', fontWeight: '600', fontStyle: 'italic' },
  klaarButtonDrought: { backgroundColor: '#e76f00' },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#2d6a4f' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  tabLabelActive: { color: '#2d6a4f' },
  listContent: { padding: 12, gap: 4, paddingBottom: 32 },
  emptyScroll: { flexGrow: 1, padding: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12, flex: 1 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#aaa', fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 24 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4 },
  sectionHeaderText: {
    fontSize: 13, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 14, marginBottom: 8, gap: 10,
  },
  taskRowOverdue: { borderColor: '#e63946', backgroundColor: '#fff5f5' },
  taskRowSkip: { borderColor: '#cce5ff', backgroundColor: '#f0f7ff' },
  taskIcon: { fontSize: 22 },
  taskBody: { flex: 1, gap: 2 },
  taskNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskPlantName: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  recurringBadge: {
    fontSize: 10, color: '#2d6a4f', backgroundColor: '#d8f3dc',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    fontWeight: '600', overflow: 'hidden',
  },
  taskType: { fontSize: 13, color: '#6b705c' },
  taskNotes: { fontSize: 12, color: '#95a590', fontStyle: 'italic' },
  taskDue: { fontSize: 13, fontWeight: '500', color: '#6b705c' },
  textOverdue: { color: '#e63946' },
  skipText: { fontSize: 12, color: '#0d3a6e', fontStyle: 'italic' },
  klaarButton: {
    backgroundColor: '#2d6a4f', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginLeft: 8,
  },
  klaarButtonMuted: { backgroundColor: '#6b705c' },
  klaarButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  swipeComplete: {
    backgroundColor: '#40916c', justifyContent: 'center', alignItems: 'center',
    width: 72, borderRadius: 12, marginBottom: 8,
  },
  swipeCompleteText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  gardenTasksSection: { marginTop: 4 },
  seasonCard: {
    backgroundColor: '#f1f8f3', borderRadius: 12, borderWidth: 1, borderColor: '#b7e4c7',
    padding: 14, gap: 6, marginBottom: 12,
  },
  seasonTitle: { fontSize: 12, fontWeight: '700', color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: 0.6 },
  seasonText: { fontSize: 14, color: '#1b4332', lineHeight: 20 },
  harvestCard: {
    backgroundColor: '#fff9e6', borderRadius: 12, borderWidth: 1, borderColor: '#ffe08a',
    padding: 14, gap: 6, marginBottom: 12,
  },
  harvestTitle: { fontSize: 13, fontWeight: '700', color: '#7c5a00' },
  harvestItem: { fontSize: 13, color: '#5a4000', lineHeight: 20 },
  // Planning tab
  planningDayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 4, marginTop: 4,
  },
  planningDayLabel: { fontSize: 14, fontWeight: '700', color: '#1b4332', flex: 1 },
  planningDayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planningDayTemp:  { fontSize: 13, fontWeight: '600', color: '#2d6a4f' },
  planningDayCount: { fontSize: 12, color: '#aaa' },
  planningRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6, gap: 10,
  },
  planningRowOverdue: { borderColor: '#e63946', backgroundColor: '#fff5f5' },
  planningIcon: { fontSize: 18 },
  // Geschiedenis tab
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6, gap: 10, opacity: 0.85,
  },
  historyIcon: { fontSize: 18 },
  historyMeta: { alignItems: 'flex-end', gap: 2 },
  historyDate: { fontSize: 12, fontWeight: '600', color: '#6b705c' },
  historyTime: { fontSize: 11, color: '#aaa' },
  // Weather card
  weatherCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#b7e4c7',
    padding: 14, gap: 8, marginBottom: 12,
  },
  weatherCardDry: { borderColor: '#f4a261', backgroundColor: '#fff9f4' },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherEmoji: { fontSize: 36 },
  weatherInfo: { flex: 1, gap: 2 },
  weatherTemp: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  weatherDesc: { fontSize: 13, color: '#6b705c' },
  weatherDryAlert: {
    fontSize: 13, fontWeight: '600', color: '#c05600',
    backgroundColor: '#fff4e6', borderRadius: 8, padding: 8, textAlign: 'center',
  },
  // Show more tasks
  showMoreBtn: {
    backgroundColor: '#f1f8f3', borderRadius: 10, borderWidth: 1, borderColor: '#b7e4c7',
    padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  showMoreText: { fontSize: 14, fontWeight: '600', color: '#2d6a4f' },
  // Zaaikalender tab
  zaaiSeizoenCard: {
    backgroundColor: '#d8f3dc', borderRadius: 12, borderWidth: 1, borderColor: '#74c69d',
    padding: 14, gap: 6, marginBottom: 16,
  },
  zaaiSeizoenTitle: { fontSize: 14, fontWeight: '700', color: '#1b4332', marginBottom: 4 },
  zaaiSeizoenItem: { fontSize: 14, color: '#1b4332', lineHeight: 22 },
  zaaiMonthCard: {
    backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
    padding: 12, marginBottom: 8, gap: 4,
  },
  zaaiMonthCardCurrent: {
    borderColor: '#40916c', backgroundColor: '#f1f8f3',
  },
  zaaiMonthName: {
    fontSize: 14, fontWeight: '700', color: '#6b705c', marginBottom: 4,
  },
  zaaiMonthNameCurrent: { color: '#1b4332' },
  zaaiRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' },
  zaaiRowLabel: { fontSize: 13, fontWeight: '600', color: '#2d6a4f', minWidth: 80 },
  zaaiRowValue: { fontSize: 13, color: '#1b4332', flex: 1, flexWrap: 'wrap' },
  zaaiEmptyText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  // Toast
  toast: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#1b4332', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 4, elevation: 6,
  },
  toastText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
});

const statsStyles = StyleSheet.create({
  section: {
    backgroundColor: '#f8f9fa', borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
    padding: 14, marginBottom: 12, gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1b4332', marginBottom: 4 },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#e9ecef', padding: 12, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#2d6a4f' },
  statLabel: { fontSize: 11, color: '#6b705c', fontWeight: '600', textAlign: 'center' },
  harvestRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff9e6', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#ffe08a',
  },
  harvestLabel: { fontSize: 14, fontWeight: '600', color: '#7c5a00' },
  harvestValue: { fontSize: 14, fontWeight: '700', color: '#7c5a00' },
  streakCard: {
    backgroundColor: '#d8f3dc', borderRadius: 10, padding: 12, gap: 4,
  },
  streakMain: { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  streakSub: { fontSize: 13, color: '#2d6a4f' },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#b7e4c7',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeChipEmoji: { fontSize: 16 },
  badgeChipName: { fontSize: 12, fontWeight: '700', color: '#1b4332' },
  emptyHint: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#e9ecef',
  },
  rankNum: { fontSize: 13, fontWeight: '700', color: '#aaa', width: 24 },
  rankEmoji: { fontSize: 20 },
  rankName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1b4332' },
  rankGrams: { fontSize: 14, fontWeight: '700', color: '#2d6a4f' },
  barRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  barIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  barLabel: { fontSize: 12, fontWeight: '600', color: '#6b705c', width: 72 },
  barTrack: {
    flex: 1, height: 10, borderRadius: 5,
    backgroundColor: '#e9ecef', flexDirection: 'row', overflow: 'hidden',
  },
  barFill: { backgroundColor: '#2d6a4f', borderRadius: 5 },
  barCount: { fontSize: 13, fontWeight: '700', color: '#1b4332', width: 28, textAlign: 'right' },
});

export default MaintenanceScreen;
