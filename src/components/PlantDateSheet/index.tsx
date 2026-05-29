import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Pressable, TextInput,
} from 'react-native';
import { Plant, MaintenanceTask } from '@/models';

interface Props {
  plant: Plant | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updatedPlant: Plant) => void;
}

/** Recalculate all pending recurring task dueDates relative to a new plantedDate */
function recalculateTasks(plant: Plant, newPlantedDate: string): MaintenanceTask[] {
  const base = new Date(newPlantedDate);
  return plant.maintenanceTasks.map((task) => {
    if (task.completedDate || !task.intervalDays) return task;
    const due = new Date(base);
    due.setDate(due.getDate() + task.intervalDays);
    return { ...task, dueDate: due.toISOString() };
  });
}

const QUICK_OPTIONS = [
  { label: 'Vandaag',          days: 0  },
  { label: 'Gisteren',         days: -1 },
  { label: '3 dagen geleden',  days: -3 },
  { label: '1 week geleden',   days: -7 },
  { label: '2 weken geleden',  days: -14 },
  { label: '1 maand geleden',  days: -30 },
];

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const toDateInput = (iso: string): string => iso.slice(0, 10);
const fromDateInput = (dateStr: string): string => new Date(dateStr).toISOString();

export function PlantDateSheet({ plant, visible, onClose, onSave }: Props): React.JSX.Element | null {
  const now = new Date();
  const [customDate, setCustomDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  if (!plant) return null;

  const currentPlantedDate = plant.plantedDate
    ? new Date(plant.plantedDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Onbekend';

  const handleQuickSelect = (days: number) => {
    const date = addDays(now, days);
    const updated = { ...plant, plantedDate: date.toISOString(), maintenanceTasks: recalculateTasks(plant, date.toISOString()) };
    onSave(updated);
    onClose();
  };

  const handleCustomSave = () => {
    if (!customDate) return;
    try {
      const iso = fromDateInput(customDate);
      const updated = { ...plant, plantedDate: iso, maintenanceTasks: recalculateTasks(plant, iso) };
      onSave(updated);
      onClose();
    } catch {
      // invalid date — ignore
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>📅 Plantdatum — {plant.commonName}</Text>
          <Text style={s.current}>Huidige datum: <Text style={s.currentValue}>{currentPlantedDate}</Text></Text>
          <Text style={s.hint}>Taken worden herberekend op basis van de nieuwe datum.</Text>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {QUICK_OPTIONS.map(({ label, days }) => (
              <TouchableOpacity
                key={label}
                style={s.optionRow}
                onPress={() => handleQuickSelect(days)}
                activeOpacity={0.8}>
                <Text style={s.optionLabel}>{label}</Text>
                <Text style={s.optionDate}>
                  {addDays(now, days).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={s.optionRow} onPress={() => setShowCustom((v) => !v)} activeOpacity={0.8}>
              <Text style={s.optionLabel}>Vrij invoeren…</Text>
              <Text style={s.optionChevron}>{showCustom ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showCustom && (
              <View style={s.customArea}>
                <TextInput
                  style={s.dateInput}
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="JJJJ-MM-DD"
                  placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity style={s.saveBtn} onPress={handleCustomSave} activeOpacity={0.85}>
                  <Text style={s.saveBtnText}>Opslaan</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelBtnText}>Annuleren</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '70%', paddingBottom: 16 },
  handle:       { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:        { fontSize: 17, fontWeight: '700', color: '#1b4332', paddingHorizontal: 20, paddingVertical: 10 },
  current:      { fontSize: 13, color: '#6b705c', paddingHorizontal: 20, marginBottom: 2 },
  currentValue: { color: '#2d6a4f', fontWeight: '600' },
  hint:         { fontSize: 11, color: '#aaa', paddingHorizontal: 20, marginBottom: 8, fontStyle: 'italic' },
  list:         { paddingHorizontal: 16 },
  optionRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e9ecef' },
  optionLabel:  { fontSize: 15, color: '#1b4332', fontWeight: '500' },
  optionDate:   { fontSize: 13, color: '#aaa' },
  optionChevron:{ fontSize: 12, color: '#aaa' },
  customArea:   { paddingVertical: 10, gap: 8 },
  dateInput:    { borderWidth: 1, borderColor: '#b7e4c7', borderRadius: 10, padding: 10, fontSize: 15, color: '#1b4332', backgroundColor: '#f8fdf9' },
  saveBtn:      { backgroundColor: '#2d6a4f', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn:    { marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:{ color: '#6b705c', fontWeight: '600', fontSize: 15 },
});
