import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Pressable,
} from 'react-native';
import { Plant, MaintenanceTaskType } from '@/models';
import { useGardenStore } from '@/store/gardenStore';
import { relativeDueLabel } from '@/utils/dateUtils';

interface Props {
  plant: Plant | null;
  visible: boolean;
  onClose: () => void;
  onDetails: (plantId: string) => void;
  weatherRainExpected?: boolean;
}

const TASK_ICONS: Record<MaintenanceTaskType, string> = {
  water: '💧', prune: '✂️', fertilize: '🌱', repot: '🪴', treat: '🩹',
};
const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water: 'Water geven', prune: 'Snoeien', fertilize: 'Bemesten',
  repot: 'Verpotten', treat: 'Behandelen',
};

export const PlantQuickSheet = ({ plant, visible, onClose, onDetails, weatherRainExpected }: Props): React.JSX.Element | null => {
  const completeMaintenanceTask = useGardenStore((s) => s.completeMaintenanceTask);
  const recordTaskCompletion    = useGardenStore((s) => s.recordTaskCompletion);

  const handleComplete = useCallback((taskId: string) => {
    if (!plant) return;
    completeMaintenanceTask(plant.id, taskId);
    recordTaskCompletion();
  }, [plant, completeMaintenanceTask, recordTaskCompletion]);

  if (!plant) return null;

  const now = new Date().toISOString();
  const activeTasks = plant.maintenanceTasks
    .filter((t) => !t.completedDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastDoneToday = plant.maintenanceTasks.some(
    (t) => t.completedDate?.slice(0, 10) === todayStr
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {/* prevent close */}}>
          {/* Drag handle */}
          <View style={s.handle} />

          {/* Plant header */}
          <View style={s.plantHeader}>
            <View>
              <Text style={s.plantName}>{plant.commonName}</Text>
              {plant.species ? <Text style={s.plantSpecies}>{plant.species}</Text> : null}
            </View>
            {lastDoneToday && (
              <View style={s.doneTodayBadge}>
                <Text style={s.doneTodayText}>✓ Al gedaan vandaag</Text>
              </View>
            )}
          </View>

          {/* Active tasks */}
          <ScrollView style={s.taskList} bounces={false}>
            {activeTasks.length === 0 ? (
              <View style={s.emptyTasks}>
                <Text style={s.emptyTasksText}>🎉 Geen openstaande taken!</Text>
              </View>
            ) : (
              activeTasks.slice(0, 4).map((task) => {
                const isOverdue = task.dueDate < now;
                const isWaterInRain = task.type === 'water' && weatherRainExpected;
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[s.taskBtn, isOverdue && s.taskBtnOverdue]}
                    onPress={() => handleComplete(task.id)}
                    activeOpacity={0.75}>
                    <Text style={s.taskBtnIcon}>{TASK_ICONS[task.type]}</Text>
                    <View style={s.taskBtnBody}>
                      <Text style={[s.taskBtnLabel, isOverdue && s.taskBtnLabelOverdue]}>
                        {TASK_LABELS[task.type]}
                        {task.intervalDays ? ` (elke ${task.intervalDays}d)` : ''}
                      </Text>
                      <Text style={s.taskBtnDue}>{relativeDueLabel(task.dueDate)}</Text>
                      {isWaterInRain && (
                        <Text style={s.rainHint}>🌧️ Regen verwacht — echt nodig?</Text>
                      )}
                    </View>
                    <View style={s.taskBtnCheck}>
                      <Text style={s.taskBtnCheckText}>✓</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Details button */}
          <TouchableOpacity
            style={s.detailsBtn}
            onPress={() => { onClose(); onDetails(plant.id); }}
            activeOpacity={0.8}>
            <Text style={s.detailsBtnText}>📋 Details, foto's & oogstdagboek →</Text>
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
    maxHeight: '60%',
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
  plantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  plantName: { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  plantSpecies: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 },
  doneTodayBadge: {
    backgroundColor: '#d8f3dc', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  doneTodayText: { fontSize: 12, color: '#2d6a4f', fontWeight: '600' },
  taskList: { paddingHorizontal: 16, paddingTop: 8 },
  emptyTasks: { alignItems: 'center', paddingVertical: 20 },
  emptyTasksText: { fontSize: 15, color: '#52b788' },
  taskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fdf9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  taskBtnOverdue: { backgroundColor: '#fff5f5', borderColor: '#ffd0d0' },
  taskBtnIcon: { fontSize: 22, marginRight: 12 },
  taskBtnBody: { flex: 1 },
  taskBtnLabel: { fontSize: 14, fontWeight: '600', color: '#1b4332' },
  taskBtnLabelOverdue: { color: '#c1121f' },
  taskBtnDue: { fontSize: 11, color: '#888', marginTop: 2 },
  rainHint: { fontSize: 11, color: '#1565c0', marginTop: 2 },
  taskBtnCheck: {
    width: 32, height: 32,
    backgroundColor: '#2d6a4f',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBtnCheckText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  detailsBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f0faf4',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b7e4c7',
  },
  detailsBtnText: { fontSize: 14, color: '#2d6a4f', fontWeight: '600' },
});
