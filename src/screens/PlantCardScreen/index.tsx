import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { MaintenanceTask, MaintenanceTaskType, Plant } from '@/models';

type PlantCardRouteProp = RouteProp<MapStackParamList, 'PlantCard'>;
type PlantCardNavProp = StackNavigationProp<MapStackParamList, 'PlantCard'>;

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Watering',
  prune: 'Pruning',
  fertilize: 'Fertilize',
  repot: 'Repot',
  treat: 'Treatment',
};

interface TaskRowProps {
  task: MaintenanceTask;
  isOverdue: boolean;
  onComplete: (taskId: string) => void;
}

const TaskRow = ({ task, isOverdue, onComplete }: TaskRowProps): React.JSX.Element => {
  const dueDate = new Date(task.dueDate).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={[styles.taskRow, isOverdue && styles.taskRowOverdue, task.completedDate ? styles.taskRowCompleted : null]}>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskType, isOverdue && styles.taskTypeOverdue]}>
          {TASK_LABELS[task.type]}
        </Text>
        {task.notes ? <Text style={styles.taskNotes}>{task.notes}</Text> : null}
        <Text style={[styles.taskDueDate, isOverdue && styles.taskDueDateOverdue]}>
          {dueDate}
          {isOverdue && !task.completedDate ? '  · Verlopen' : ''}
        </Text>
      </View>
      {task.completedDate ? (
        <Text style={styles.completedBadge}>✓</Text>
      ) : (
        <TouchableOpacity style={styles.klaarButton} onPress={() => onComplete(task.id)}>
          <Text style={styles.klaarButtonText}>Klaar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const LightLabel: Record<string, string> = {
  full_sun: 'Full sun',
  partial_shade: 'Partial shade',
  full_shade: 'Full shade',
};

const PlantCardScreen = (): React.JSX.Element => {
  const route = useRoute<PlantCardRouteProp>();
  const navigation = useNavigation<PlantCardNavProp>();
  const { plantId } = route.params;

  const garden = useGardenStore((s) => s.garden);
  const updatePlant = useGardenStore((s) => s.updatePlant);

  const plant = garden?.plants.find((p) => p.id === plantId);
  const now = new Date().toISOString();

  const sortedTasks = React.useMemo(() => {
    if (!plant) return [];
    return [...plant.maintenanceTasks].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    );
  }, [plant]);

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      if (!plant) return;
      const updatedPlant: Plant = {
        ...plant,
        maintenanceTasks: plant.maintenanceTasks.map((t) =>
          t.id === taskId ? { ...t, completedDate: new Date().toISOString() } : t,
        ),
        lastMaintenanceDate: new Date().toISOString(),
      };
      updatePlant(updatedPlant);
    },
    [plant, updatePlant],
  );

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Plant niet gevonden</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plant.commonName}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.commonName}>{plant.commonName}</Text>
          <Text style={styles.species}>{plant.species}</Text>

          <View style={styles.metaGrid}>
            {plant.lightExposure ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Licht</Text>
                <Text style={styles.metaValue}>{LightLabel[plant.lightExposure]}</Text>
              </View>
            ) : null}
            {plant.estimatedSizeM !== undefined ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Grootte</Text>
                <Text style={styles.metaValue}>{plant.estimatedSizeM} m</Text>
              </View>
            ) : null}
            {plant.plantedDate ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Geplant</Text>
                <Text style={styles.metaValue}>
                  {new Date(plant.plantedDate).toLocaleDateString('nl-NL')}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Herkenning</Text>
              <Text style={styles.metaValue}>
                {Math.round(plant.identificationConfidence * 100)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onderhoud</Text>
          {sortedTasks.length === 0 ? (
            <Text style={styles.emptyTasks}>Geen onderhoudstaken</Text>
          ) : (
            sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isOverdue={!task.completedDate && task.dueDate < now}
                onComplete={handleCompleteTask}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  backButton: { paddingRight: 8 },
  backButtonText: { color: '#2d6a4f', fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1b4332' },
  scrollContent: { padding: 16, gap: 20 },
  card: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 20 },
  commonName: { fontSize: 26, fontWeight: '700', color: '#1b4332', marginBottom: 4 },
  species: { fontSize: 16, fontStyle: 'italic', color: '#6b705c', marginBottom: 20 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { minWidth: '45%' },
  metaLabel: { fontSize: 12, color: '#aaa', marginBottom: 2, textTransform: 'uppercase' },
  metaValue: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332', marginBottom: 4 },
  emptyTasks: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  taskRowOverdue: { borderColor: '#e63946', backgroundColor: '#fff5f5' },
  taskRowCompleted: { opacity: 0.5 },
  taskInfo: { flex: 1, gap: 2 },
  taskType: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  taskTypeOverdue: { color: '#e63946' },
  taskNotes: { fontSize: 12, color: '#6b705c' },
  taskDueDate: { fontSize: 13, color: '#6b705c', fontWeight: '500' },
  taskDueDateOverdue: { color: '#e63946' },
  completedBadge: { color: '#2d6a4f', fontWeight: '700', fontSize: 20 },
  klaarButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  klaarButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#aaa' },
});

export default PlantCardScreen;
