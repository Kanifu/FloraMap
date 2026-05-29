import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Pressable,
} from 'react-native';
import { Garden, MaintenanceTaskType, Plant, MaintenanceTask } from '@/models';
import { useGardenStore } from '@/store/gardenStore';
import { relativeDueLabel } from '@/utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  garden: Garden | null;
  weatherRainExpected: boolean;
  onOpenPlant: (plantId: string) => void;
  onOpenMaintenance: () => void;
}

const TASK_ICONS: Record<MaintenanceTaskType, string> = {
  water: '💧', prune: '✂️', fertilize: '🌱', repot: '🪴', treat: '🩹',
};
const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Water geven', prune: 'Snoeien', fertilize: 'Bemesten',
  repot: 'Verpotten', treat: 'Behandelen',
};

interface TaskItem {
  plant: Plant;
  task: MaintenanceTask;
  isOverdue: boolean;
}

export const TodaySheet = ({
  visible, onClose, garden, weatherRainExpected, onOpenPlant, onOpenMaintenance,
}: Props): React.JSX.Element | null => {
  const completeMaintenanceTask = useGardenStore((s) => s.completeMaintenanceTask);
  const recordTaskCompletion    = useGardenStore((s) => s.recordTaskCompletion);

  const tasks = useMemo((): TaskItem[] => {
    if (!garden) return [];
    const now = new Date().toISOString();
    const items: TaskItem[] = [];
    for (const plant of garden.plants) {
      for (const task of plant.maintenanceTasks) {
        if (!task.completedDate && task.dueDate <= now) {
          items.push({ plant, task, isOverdue: task.dueDate < now.slice(0, 10) });
        }
      }
    }
    // Overdue first, then by dueDate ascending
    items.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return a.task.dueDate.localeCompare(b.task.dueDate);
    });
    return items;
  }, [garden]);

  const handleComplete = (plant: Plant, taskId: string) => {
    completeMaintenanceTask(plant.id, taskId);
    recordTaskCompletion();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => { /* prevent close */ }}>
          <View style={s.handle} />
          <Text style={s.title}>📋 Vandaag & achterstallig</Text>

          <ScrollView style={s.list} bounces={false}>
            {tasks.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>🌿 Niets te doen — geniet van je tuin!</Text>
              </View>
            ) : (
              tasks.map(({ plant, task, isOverdue }) => {
                const isWaterInRain = task.type === 'water' && weatherRainExpected;
                return (
                  <View key={`${plant.id}-${task.id}`} style={[s.row, isOverdue && s.rowOverdue]}>
                    <Text style={s.rowIcon}>{TASK_ICONS[task.type]}</Text>
                    <View style={s.rowBody}>
                      <TouchableOpacity onPress={() => { onClose(); onOpenPlant(plant.id); }} activeOpacity={0.7}>
                        <Text style={[s.plantName, isOverdue && s.plantNameOverdue]}>{plant.commonName}</Text>
                      </TouchableOpacity>
                      <Text style={[s.taskLabel, isOverdue && s.taskLabelOverdue]}>
                        {TASK_LABELS[task.type]}
                        {task.intervalDays ? ` (elke ${task.intervalDays}d)` : ''}
                      </Text>
                      <Text style={s.dueLabel}>{relativeDueLabel(task.dueDate)}</Text>
                      {isWaterInRain && (
                        <Text style={s.rainHint}>🌧️ Regen verwacht — echt nodig?</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={s.checkBtn}
                      onPress={() => handleComplete(plant, task.id)}
                      activeOpacity={0.75}>
                      <Text style={s.checkBtnText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={s.allTasksBtn} onPress={() => { onClose(); onOpenMaintenance(); }} activeOpacity={0.8}>
            <Text style={s.allTasksBtnText}>Bekijk alle taken →</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b4332',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, color: '#52b788' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fdf9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  rowOverdue: { backgroundColor: '#fff5f5', borderColor: '#ffd0d0' },
  rowIcon: { fontSize: 22, marginRight: 12 },
  rowBody: { flex: 1 },
  plantName: { fontSize: 14, fontWeight: '700', color: '#1b4332' },
  plantNameOverdue: { color: '#c1121f' },
  taskLabel: { fontSize: 13, color: '#2d6a4f', marginTop: 1 },
  taskLabelOverdue: { color: '#c1121f' },
  dueLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  rainHint: { fontSize: 11, color: '#1565c0', marginTop: 2 },
  checkBtn: {
    width: 32, height: 32,
    backgroundColor: '#2d6a4f',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  allTasksBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f1f8f3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b7e4c7',
  },
  allTasksBtnText: { fontSize: 14, color: '#2d6a4f', fontWeight: '700' },
});
