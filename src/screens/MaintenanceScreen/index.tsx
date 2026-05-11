import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  SectionList,
} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
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

const SWIPE_THRESHOLD = 80;

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
  const translateX = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(onComplete)(plant.id, task.id);
      }
      translateX.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const dueDate = new Date(task.dueDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.taskWrapper}>
      <View style={styles.swipeHint}>
        <Text style={styles.swipeHintText}>✓ Klaar</Text>
      </View>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={[styles.taskRow, isOverdue && styles.taskRowOverdue, animatedStyle]}>
          <Animated.View style={styles.taskRowInner}>
            <View style={styles.taskBody} onTouchEnd={() => onNavigate(plant.id)}>
              <Text style={[styles.taskPlantName, isOverdue && styles.textOverdue]}>
                {plant.commonName}
              </Text>
              <Text style={styles.taskType}>{TASK_LABELS[task.type]}</Text>
            </View>
            <View style={styles.taskRight}>
              <Text style={[styles.taskDue, isOverdue && styles.textOverdue]}>{dueDate}</Text>
              {isOverdue && <Text style={styles.overduePill}>Verlopen</Text>}
            </View>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </View>
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
        flatTasks.push({
          task,
          plant,
          isOverdue: task.dueDate < nowStr,
        });
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
  },
  listContent: {
    padding: 12,
    gap: 4,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  taskWrapper: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeHint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2d6a4f',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  swipeHintText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  taskRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskRowOverdue: {
    borderColor: '#e63946',
    backgroundColor: '#fff5f5',
  },
  taskRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  taskBody: {
    flex: 1,
  },
  taskPlantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b4332',
    marginBottom: 2,
  },
  taskType: {
    fontSize: 13,
    color: '#6b705c',
  },
  taskRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  taskDue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b705c',
  },
  textOverdue: {
    color: '#e63946',
  },
  overduePill: {
    fontSize: 11,
    color: '#e63946',
    fontWeight: '600',
    backgroundColor: '#fde8e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#aaa',
    fontStyle: 'italic',
  },
});

export default MaintenanceScreen;
