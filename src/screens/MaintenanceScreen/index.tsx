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
import { MaintenanceTask, MaintenanceTaskType, Plant } from '@/models';
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
    // Open-Meteo free API, no key needed. Default: Amsterdam, Netherlands.
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
  skipWatering: boolean;
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
    if (dueDateStr <= todayStr) {
      today.push(ft);
    } else if (dueDateStr <= weekEndStr) {
      thisWeek.push(ft);
    } else {
      later.push(ft);
    }
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
}

const TaskItem = ({ flatTask, onComplete, onNavigate }: TaskItemProps): React.JSX.Element => {
  const { task, plant, isOverdue, skipWatering } = flatTask;

  const dueDate = new Date(task.dueDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity
      style={[
        styles.taskRow,
        isOverdue && !skipWatering && styles.taskRowOverdue,
        skipWatering && styles.taskRowSkip,
      ]}
      onPress={() => onNavigate(plant.id)}
      activeOpacity={0.7}>
      <Text style={styles.taskIcon}>{TASK_ICONS[task.type]}</Text>
      <View style={styles.taskBody}>
        <Text style={[styles.taskPlantName, isOverdue && !skipWatering && styles.textOverdue]}>
          {plant.commonName}
        </Text>
        <Text style={styles.taskType}>{TASK_LABELS[task.type]}</Text>
        {skipWatering ? (
          <Text style={styles.skipText}>🌧️ Regen verwacht — overslaan</Text>
        ) : (
          <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>{dueDate}</Text>
        )}
      </View>
      {!skipWatering && (
        <TouchableOpacity
          style={styles.klaarButton}
          onPress={() => onComplete(plant.id, task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.klaarButtonText}>✓ Klaar</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const MaintenanceScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MaintenanceNavProp>();
  const garden = useGardenStore((s) => s.garden);
  const updatePlant = useGardenStore((s) => s.updatePlant);
  const [weather, setWeather] = useState<WeatherData>({ rainExpected: false, rainMm: 0, loaded: false });

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const seasonalTip = SEASONAL_TIPS[currentMonth];

  useEffect(() => {
    fetchWeather().then(setWeather);
  }, []);

  const sections = useMemo((): Section[] => {
    if (!garden) return [];
    const nowStr = now.toISOString();
    const flatTasks: FlatTask[] = [];

    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) continue;
        const isOverdue = task.dueDate < nowStr;
        const skipWatering = task.type === 'water' && weather.rainExpected;
        flatTasks.push({ task, plant, isOverdue, skipWatering });
      }
    }

    flatTasks.sort((a, b) => {
      if (a.skipWatering && !b.skipWatering) return 1;
      if (!a.skipWatering && b.skipWatering) return -1;
      return a.task.dueDate.localeCompare(b.task.dueDate);
    });
    return groupTasks(flatTasks, now);
  }, [garden, now, weather]);

  const handleComplete = useCallback(
    (plantId: string, taskId: string) => {
      if (!garden) return;
      const plant = garden.plants.find((p) => p.id === plantId);
      if (!plant) return;
      updatePlant({
        ...plant,
        maintenanceTasks: plant.maintenanceTasks.map((t) =>
          t.id === taskId ? { ...t, completedDate: new Date().toISOString() } : t,
        ),
        lastMaintenanceDate: new Date().toISOString(),
      });
    },
    [garden, updatePlant],
  );

  const handleNavigate = useCallback(
    (plantId: string) => {
      navigation.navigate('PlantCard', { plantId });
    },
    [navigation],
  );

  const hasActiveTasks = sections.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Onderhoud</Text>
      </View>

      {weather.rainExpected && (
        <View style={styles.rainBanner}>
          <Text style={styles.rainBannerText}>
            🌧️ Regen verwacht ({weather.rainMm} mm in 48u) — begietentaken overgeslagen
          </Text>
        </View>
      )}

      {!hasActiveTasks ? (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyText}>Geen openstaande taken</Text>
          </View>
          {seasonalTip && (
            <View style={styles.seasonCard}>
              <Text style={styles.seasonTitle}>Seizoenstip</Text>
              <Text style={styles.seasonText}>{seasonalTip}</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.plant.id}-${item.task.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            seasonalTip ? (
              <View style={styles.seasonCard}>
                <Text style={styles.seasonTitle}>Seizoenstip</Text>
                <Text style={styles.seasonText}>{seasonalTip}</Text>
              </View>
            ) : null
          }
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
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
  taskRowSkip: { borderColor: '#cce5ff', backgroundColor: '#f0f7ff', opacity: 0.7 },
  taskIcon: { fontSize: 22 },
  taskBody: { flex: 1, gap: 2 },
  taskPlantName: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
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
  klaarButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
});

export default MaintenanceScreen;
