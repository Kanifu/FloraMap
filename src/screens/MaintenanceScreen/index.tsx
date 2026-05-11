import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { MaintenanceTask, MaintenanceTaskType, Plant } from '@/models';
import { MaintenanceStackParamList } from '@/navigation/AppNavigator';

type MaintenanceNavProp = StackNavigationProp<MaintenanceStackParamList, 'Maintenance'>;

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Watering',
  prune: 'Pruning',
  fertilize: 'Fertilize',
  repot: 'Repot',
  treat: 'Treatment',
};

interface FlatTask {
  task: MaintenanceTask;
  plant: Plant;
  isOverdue: boolean;
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
  if (today.length > 0) sections.push({ title: 'Today', data: today });
  if (thisWeek.length > 0) sections.push({ title: 'This week', data: thisWeek });
  if (later.length > 0) sections.push({ title: 'Later', data: later });
  return sections;
};

interface TaskItemProps {
  flatTask: FlatTask;
  onComplete: (plantId: string, taskId: string) => void;
  onNavigate: (plantId: string) => void;
}

const TaskItem = ({ flatTask, onComplete, onNavigate }: TaskItemProps): React.JSX.Element => {
  const { task, plant, isOverdue } = flatTask;

  const dueDate = new Date(task.dueDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity
      style={[styles.taskRow, isOverdue && styles.taskRowOverdue]}
      onPress={() => onNavigate(plant.id)}
      activeOpacity={0.7}>
      <View style={styles.taskBody}>
        <Text style={[styles.taskPlantName, isOverdue && styles.textOverdue]}>
          {plant.commonName}
        </Text>
        <Text style={styles.taskType}>{TASK_LABELS[task.type]}</Text>
        <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>{dueDate}</Text>
      </View>
      <TouchableOpacity
        style={styles.klaarButton}
        onPress={() => onComplete(plant.id, task.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.klaarButtonText}>✓ Klaar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const MaintenanceScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MaintenanceNavProp>();
  const garden = useGardenStore((s) => s.garden);
  const updatePlant = useGardenStore((s) => s.updatePlant);

  const now = useMemo(() => new Date(), []);

  const sections = useMemo((): Section[] => {
    if (!garden) return [];
    const nowStr = now.toISOString();
    const flatTasks: FlatTask[] = [];

    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (task.completedDate) continue;
        flatTasks.push({ task, plant, isOverdue: task.dueDate < nowStr });
      }
    }

    flatTasks.sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
    return groupTasks(flatTasks, now);
  }, [garden, now]);

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

  if (!garden || sections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Onderhoud</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyText}>Geen openstaande taken</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Onderhoud</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.plant.id}-${item.task.id}`}
        contentContainerStyle={styles.listContent}
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
  listContent: { padding: 12, gap: 4 },
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
  },
  taskRowOverdue: { borderColor: '#e63946', backgroundColor: '#fff5f5' },
  taskBody: { flex: 1, gap: 2 },
  taskPlantName: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  taskType: { fontSize: 13, color: '#6b705c' },
  taskDue: { fontSize: 13, fontWeight: '500', color: '#6b705c' },
  textOverdue: { color: '#e63946' },
  klaarButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  klaarButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#aaa', fontStyle: 'italic' },
});

export default MaintenanceScreen;
