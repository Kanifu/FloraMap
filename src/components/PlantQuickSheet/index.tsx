import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Pressable, TextInput,
} from 'react-native';
import { Plant, MaintenanceTaskType } from '@/models';
import { useGardenStore } from '@/store/gardenStore';
import { relativeDueLabel } from '@/utils/dateUtils';
import { plantDatabase } from '@/data/plantDatabase';
import { createInitialTasksForPlant } from '@/services/GardenAssistantService';

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
  const updatePlant             = useGardenStore((s) => s.updatePlant);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editSpecies,   setEditSpecies]   = useState('');

  const handleComplete = useCallback((taskId: string) => {
    if (!plant) return;
    completeMaintenanceTask(plant.id, taskId);
    recordTaskCompletion();
  }, [plant, completeMaintenanceTask, recordTaskCompletion]);

  const handleStartEdit = useCallback(() => {
    if (!plant) return;
    setEditName(plant.commonName);
    setEditSpecies(plant.species ?? '');
    setIsEditingName(true);
  }, [plant]);

  const handleSaveEdit = useCallback(() => {
    if (!plant) return;
    const newName = editName.trim() || plant.commonName;
    const newSpecies = editSpecies.trim() || plant.species;

    // Look up in database to refresh care data
    const match = plantDatabase.find((p) =>
      p.commonName.toLowerCase() === newName.toLowerCase() ||
      p.species.toLowerCase() === newSpecies.toLowerCase()
    );

    if (match && (match.commonName.toLowerCase() !== plant.commonName.toLowerCase())) {
      const { Alert } = require('react-native');
      Alert.alert(
        '🌱 Verzorgingsdata updaten?',
        `We kennen ${match.commonName} — wil je de verzorgingstips en taakinstellingen bijwerken?`,
        [
          {
            text: 'Ja, updaten',
            onPress: () => {
              const newTasks = createInitialTasksForPlant(plant.id, {
                species: match.species,
                commonName: match.commonName,
                confidence: 1,
                careTips: match.careTips,
                waterIntervalDays: match.waterIntervalDays,
                fertilizeIntervalDays: match.fertilizeIntervalDays,
                harvestMonths: match.harvestMonths,
                plantFamily: match.plantFamily,
              });
              updatePlant({
                ...plant,
                commonName: newName,
                species: newSpecies || match.species,
                careTips: match.careTips,
                harvestMonths: match.harvestMonths,
                plantFamily: match.plantFamily,
                maintenanceTasks: newTasks.length > 0 ? newTasks : plant.maintenanceTasks,
              });
            },
          },
          {
            text: 'Alleen naam',
            onPress: () => updatePlant({ ...plant, commonName: newName, species: newSpecies }),
          },
        ],
      );
    } else {
      updatePlant({ ...plant, commonName: newName, species: newSpecies });
    }

    setIsEditingName(false);
  }, [plant, editName, editSpecies, updatePlant]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingName(false);
  }, []);

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
            <View style={{ flex: 1 }}>
              <Text style={s.plantName}>{plant.commonName}</Text>
              {plant.species ? <Text style={s.plantSpecies}>{plant.species}</Text> : null}
            </View>
            <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {lastDoneToday && (
                <View style={s.doneTodayBadge}>
                  <Text style={s.doneTodayText}>✓ Al gedaan vandaag</Text>
                </View>
              )}
              <TouchableOpacity style={s.editRowBtn} onPress={handleStartEdit} activeOpacity={0.7}>
                <Text style={s.editRowBtnText}>✏️ Naam corrigeren</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline name/species edit section */}
          {isEditingName && (
            <View style={s.editSection}>
              <TextInput
                style={s.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Naam van de plant"
                placeholderTextColor="#aaa"
                autoFocus
              />
              <TextInput
                style={s.editInput}
                value={editSpecies}
                onChangeText={setEditSpecies}
                placeholder="Latijnse naam (optioneel)"
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity style={s.editSaveBtn} onPress={handleSaveEdit} activeOpacity={0.8}>
                <Text style={s.editSaveBtnText}>Opslaan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editCancelBtn} onPress={handleCancelEdit} activeOpacity={0.7}>
                <Text style={s.editCancelText}>Annuleren</Text>
              </TouchableOpacity>
            </View>
          )}

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

            {/* Care tips section */}
            {plant.careTips && plant.careTips.length > 0 && (
              <View style={s.tipsSection}>
                <Text style={s.tipsSectionTitle}>🌿 Verzorgingstips</Text>
                {plant.careTips.slice(0, 2).map((tip, i) => (
                  <Text key={i} style={s.tipRow}>· {tip}</Text>
                ))}
                {plant.careTips.length > 2 && (
                  <Text style={s.moreTips}>+ {plant.careTips.length - 2} meer in details</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Details button */}
          <TouchableOpacity
            style={s.detailsBtn}
            onPress={() => { onClose(); onDetails(plant.id); }}
            activeOpacity={0.8}>
            <Text style={s.detailsBtnText}>📋 Volledig plantenpaspoort →</Text>
          </TouchableOpacity>

          {/* Long-press hint */}
          <Text style={s.hintText}>💡 Houd vast om te verplaatsen of verwijderen</Text>
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
    maxHeight: '70%',
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
  editSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fdf9',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5e9',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#b7e4c7',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: '#1b4332',
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  editSaveBtn: {
    backgroundColor: '#2d6a4f',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  editSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  editCancelBtn: { alignItems: 'center', padding: 4 },
  editCancelText: { color: '#888', fontSize: 12 },
  editRowBtn: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  editRowBtnText: { fontSize: 11, color: '#888' },
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
  tipsSection: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 4 },
  tipsSectionTitle: { fontSize: 13, fontWeight: '700', color: '#2d6a4f', marginBottom: 4 },
  tipRow: { fontSize: 12, color: '#555', lineHeight: 18, marginLeft: 4 },
  moreTips: { fontSize: 11, color: '#888', marginTop: 2, fontStyle: 'italic' },
  detailsBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#2d6a4f',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d6a4f',
  },
  detailsBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  hintText: { textAlign: 'center', fontSize: 10, color: '#bbb', marginTop: 6, paddingBottom: 4 },
});
