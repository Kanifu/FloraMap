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
import { getCachedLocation } from '@/utils/location';

type MaintenanceNavProp = StackNavigationProp<MaintenanceStackParamList, 'Maintenance'>;
type Tab = 'taken' | 'planning' | 'geschiedenis';

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

interface WeatherData { rainExpected: boolean; rainMm: number; loaded: boolean; }

const fetchWeather = async (): Promise<WeatherData> => {
  try {
    const loc = await getCachedLocation();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=precipitation&forecast_days=2&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return { rainExpected: false, rainMm: 0, loaded: true };
    const data = await res.json();
    const precipitation: number[] = data.hourly?.precipitation ?? [];
    const totalMm = precipitation.reduce((sum: number, v: number) => sum + v, 0);
    return { rainExpected: totalMm > 4, rainMm: Math.round(totalMm * 10) / 10, loaded: true };
  } catch {
    return { rainExpected: false, rainMm: 0, loaded: true };
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
  const { task, plant, isOverdue, isRecurring } = flatTask;
  const swipeableRef = useRef<Swipeable>(null);
  const isWateringInRain = task.type === 'water' && rainExpected;

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
  const [weather, setWeather] = useState<WeatherData>({ rainExpected: false, rainMm: 0, loaded: false });
  const [activeTab, setActiveTab] = useState<Tab>('taken');
  const [exporting, setExporting] = useState(false);

  const currentMonth = new Date().getMonth();

  useEffect(() => { fetchWeather().then(setWeather); }, []);

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
    completeMaintenanceTask(plantId, taskId);
  }, [completeMaintenanceTask]);

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
        {(['taken', 'planning', 'geschiedenis'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'taken' ? 'Taken' : tab === 'planning' ? 'Planning' : 'Geschiedenis'}
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
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => `${item.plant.id}-${item.task.id}`}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={infoHeader}
            ListFooterComponent={gardenTasksSection}
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
        )
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
            {planningGroups.map(({ dateKey, label, tasks }) => (
              <View key={dateKey}>
                <View style={styles.planningDayHeader}>
                  <Text style={styles.planningDayLabel}>{label}</Text>
                  <Text style={styles.planningDayCount}>{tasks.length} {tasks.length === 1 ? 'taak' : 'taken'}</Text>
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
            ))}
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
  headerActions: { flexDirection: 'row', gap: 4 },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { fontSize: 22 },
  rainBanner: {
    backgroundColor: '#cce5ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#b8d4f0',
  },
  rainBannerText: { fontSize: 13, color: '#0d3a6e', fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#2d6a4f' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#aaa' },
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
  planningDayLabel: { fontSize: 14, fontWeight: '700', color: '#1b4332' },
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
});

export default MaintenanceScreen;
