import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { MaintenanceTask, MaintenanceTaskType, Plant, GardenTask } from '@/models';
import { MaintenanceStackParamList } from '@/navigation/AppNavigator';

type MaintenanceNavProp = StackNavigationProp<MaintenanceStackParamList, 'Maintenance'>;

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

interface WeatherData {
  rainExpected: boolean;
  rainMm: number;
  loaded: boolean;
}

const fetchWeather = async (): Promise<WeatherData> => {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.89&hourly=precipitation&forecast_days=2&timezone=Europe%2FAmsterdam';
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

interface Section {
  title: string;
  data: FlatTask[];
}

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
  if (today.length > 0) sections.push({ title: 'Vandaag', data: today });
  if (thisWeek.length > 0) sections.push({ title: 'Deze week', data: thisWeek });
  if (later.length > 0) sections.push({ title: 'Later', data: later });
  return sections;
};

interface TaskItemProps {
  flatTask: FlatTask;
  onComplete: (plantId: string, taskId: string) => void;
  onNavigate: (plantId: string) => void;
  rainExpected: boolean;
}

const TaskItem = ({ flatTask, onComplete, onNavigate, rainExpected }: TaskItemProps): React.JSX.Element => {
  const { task, plant, isOverdue, isRecurring } = flatTask;
  const isWateringInRain = task.type === 'water' && rainExpected;

  const dueDate = new Date(task.dueDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });

  return (
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
          {isRecurring && (
            <Text style={styles.recurringBadge}>↺ herhalend</Text>
          )}
        </View>
        <Text style={styles.taskType}>{TASK_LABELS[task.type]}</Text>
        {isWateringInRain ? (
          <Text style={styles.skipText}>🌧️ Regen verwacht — begieten overslaan?</Text>
        ) : (
          <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>{dueDate}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.klaarButton, isWateringInRain && styles.klaarButtonMuted]}
        onPress={() => onComplete(plant.id, task.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.klaarButtonText}>✓ Klaar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const URGENCY_LABELS: Record<string, string> = {
  high: '⚡ Vandaag',
  medium: '📅 Binnen 3 dagen',
  low: '🗓️ Binnen een week',
};

interface GardenTaskItemProps {
  task: GardenTask;
  onComplete: (taskId: string) => void;
}

const GardenTaskItem = ({ task, onComplete }: GardenTaskItemProps): React.JSX.Element => {
  const isOverdue = !task.completedDate && task.dueDate < new Date().toISOString();
  return (
    <View style={[styles.taskRow, isOverdue && styles.taskRowOverdue, task.completedDate ? { opacity: 0.5 } : null]}>
      <Text style={styles.taskIcon}>🌿</Text>
      <View style={styles.taskBody}>
        <Text style={[styles.taskPlantName, isOverdue && styles.textOverdue]}>
          {task.plantName ?? 'Tuin'}
        </Text>
        <Text style={styles.taskType}>{task.description}</Text>
        <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>
          {URGENCY_LABELS[task.urgency] ?? ''}
        </Text>
      </View>
      {!task.completedDate && (
        <TouchableOpacity
          style={styles.klaarButton}
          onPress={() => onComplete(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.klaarButtonText}>✓ Klaar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const MaintenanceScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MaintenanceNavProp>();
  const garden = useGardenStore((s) => s.garden);
  const completeMaintenanceTask = useGardenStore((s) => s.completeMaintenanceTask);
  const completeGardenTask = useGardenStore((s) => s.completeGardenTask);
  const [weather, setWeather] = useState<WeatherData>({ rainExpected: false, rainMm: 0, loaded: false });

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const seasonalTip = SEASONAL_TIPS[currentMonth];

  useEffect(() => {
    fetchWeather().then(setWeather);
  }, []);

  // Plants that have a harvest alert this month
  const harvestAlerts = useMemo(() => {
    if (!garden) return [];
    return garden.plants.filter((p) => p.harvestMonths?.includes(currentMonth));
  }, [garden, currentMonth]);

  const sections = useMemo((): Section[] => {
    if (!garden) return [];
    const nowStr = now.toISOString();
    const flatTasks: FlatTask[] = [];

    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) continue;
        const isOverdue = task.dueDate < nowStr;
        flatTasks.push({ task, plant, isOverdue, isRecurring: !!task.intervalDays });
      }
    }

    flatTasks.sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
    return groupTasks(flatTasks, now);
  }, [garden, now]);

  const handleComplete = useCallback(
    (plantId: string, taskId: string) => {
      completeMaintenanceTask(plantId, taskId);
    },
    [completeMaintenanceTask],
  );

  const handleNavigate = useCallback(
    (plantId: string) => {
      navigation.navigate('PlantCard', { plantId });
    },
    [navigation],
  );

  const activeGardenTasks = useMemo(
    () => (garden?.tasks ?? []).filter((t) => !t.completedDate),
    [garden],
  );

  const hasActiveTasks = sections.length > 0 || activeGardenTasks.length > 0;

  const listHeader = (
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

  const gardenTasksFooter = activeGardenTasks.length > 0 ? (
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Onderhoud</Text>
        <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.infoBtn}>
          <Text style={styles.infoBtnText}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {weather.rainExpected && (
        <View style={styles.rainBanner}>
          <Text style={styles.rainBannerText}>
            🌧️ Regen verwacht ({weather.rainMm} mm in 48u) — begietentaken worden aangegeven
          </Text>
        </View>
      )}

      {!hasActiveTasks && harvestAlerts.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyText}>Geen openstaande taken</Text>
          </View>
          {listHeader}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.plant.id}-${item.task.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListFooterComponent={gardenTasksFooter}
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
  infoBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  infoBtnText: { fontSize: 22 },
  rainBanner: {
    backgroundColor: '#cce5ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#b8d4f0',
  },
  rainBannerText: { fontSize: 13, color: '#0d3a6e', fontWeight: '600' },
  listContent: { padding: 12, gap: 4 },
  emptyScroll: { flexGrow: 1, padding: 12 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4 },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  taskRowOverdue: { borderColor: '#e63946', backgroundColor: '#fff5f5' },
  taskRowSkip: { borderColor: '#cce5ff', backgroundColor: '#f0f7ff' },
  taskIcon: { fontSize: 22 },
  taskBody: { flex: 1, gap: 2 },
  taskNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskPlantName: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  recurringBadge: {
    fontSize: 10,
    color: '#2d6a4f',
    backgroundColor: '#d8f3dc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    overflow: 'hidden',
  },
  taskType: { fontSize: 13, color: '#6b705c' },
  taskDue: { fontSize: 13, fontWeight: '500', color: '#6b705c' },
  textOverdue: { color: '#e63946' },
  skipText: { fontSize: 12, color: '#0d3a6e', fontStyle: 'italic' },
  klaarButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  klaarButtonMuted: { backgroundColor: '#6b705c' },
  klaarButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  gardenTasksSection: { marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#aaa', fontStyle: 'italic' },
  seasonCard: {
    backgroundColor: '#f1f8f3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b7e4c7',
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  seasonTitle: { fontSize: 12, fontWeight: '700', color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: 0.6 },
  seasonText: { fontSize: 14, color: '#1b4332', lineHeight: 20 },
  harvestCard: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe08a',
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  harvestTitle: { fontSize: 13, fontWeight: '700', color: '#7c5a00' },
  harvestItem: { fontSize: 13, color: '#5a4000', lineHeight: 20 },
});

export default MaintenanceScreen;
