import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { MaintenanceTaskType, PhotoLogEntry } from '@/models';
import { relativeDueLabel, fullDateTime } from '@/utils/dateUtils';
import { gardenAssistantService, createInitialTasksForPlant } from '@/services/GardenAssistantService';

type PlantCardRouteProp = RouteProp<MapStackParamList, 'PlantCard'>;
type PlantCardNavProp  = StackNavigationProp<MapStackParamList, 'PlantCard'>;

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

const LIGHT_LABELS: Record<string, string> = {
  full_sun: '☀️ Vol zon',
  partial_shade: '⛅ Halfschaduw',
  full_shade: '🌑 Volle schaduw',
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const PlantCardScreen = (): React.JSX.Element => {
  const route      = useRoute<PlantCardRouteProp>();
  const navigation = useNavigation<PlantCardNavProp>();
  const { plantId } = route.params;

  const garden                  = useGardenStore((s) => s.garden);
  const updatePlant             = useGardenStore((s) => s.updatePlant);
  const completeMaintenanceTask = useGardenStore((s) => s.completeMaintenanceTask);

  const plant = garden?.plants.find((p) => p.id === plantId);
  const now   = new Date().toISOString();

  // ── edit state ─────────────────────────────────────────────────────────────
  const [isEditing,    setIsEditing]    = useState(false);
  const [editName,     setEditName]     = useState('');
  const [editSpecies,  setEditSpecies]  = useState('');
  const [editNotes,    setEditNotes]    = useState('');
  const [editWater,    setEditWater]    = useState('');
  const [showHistory,  setShowHistory]  = useState(false);
  const [enriching,    setEnriching]    = useState(false);

  const startEdit = () => {
    if (!plant) return;
    setEditName(plant.commonName);
    setEditSpecies(plant.species ?? '');
    setEditNotes(plant.notes ?? '');
    const waterTask = plant.maintenanceTasks.find((t) => t.type === 'water' && !t.completedDate);
    setEditWater(String(waterTask?.intervalDays ?? ''));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!plant) return;
    updatePlant({
      ...plant,
      commonName: editName.trim() || plant.commonName,
      species:    editSpecies.trim(),
      notes:      editNotes.trim() || undefined,
      maintenanceTasks: plant.maintenanceTasks.map((t) => {
        if (t.type === 'water' && !t.completedDate) {
          const days = parseInt(editWater, 10);
          return days > 0 ? { ...t, intervalDays: days } : t;
        }
        return t;
      }),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => setIsEditing(false);

  // ── AI info enrichment (#76) ───────────────────────────────────────────────
  const handleEnrichWithAI = async () => {
    if (!plant) return;
    setEnriching(true);
    try {
      const response = await gardenAssistantService.chat(
        `Geef verzorgingsinfo voor de plant: ${plant.commonName}`,
        null, [], [],
      );
      const info = response.identifiedPlants?.[0];
      if (!info) {
        Alert.alert('Niet gevonden', 'Geen plantinfo ontvangen. Probeer de naam aan te passen.');
        return;
      }
      const existingTypes = new Set(plant.maintenanceTasks.map((t) => t.type));
      const newTasks = createInitialTasksForPlant(plant.id, info)
        .filter((t) => !existingTypes.has(t.type));
      updatePlant({
        ...plant,
        species:     plant.species || info.species,
        careTips:    plant.careTips?.length ? plant.careTips : (info.careTips ?? []),
        harvestMonths: plant.harvestMonths ?? info.harvestMonths,
        maintenanceTasks: [
          ...plant.maintenanceTasks.map((t) => {
            if (t.type === 'water' && !t.completedDate && !t.intervalDays && info.waterIntervalDays) {
              return { ...t, intervalDays: info.waterIntervalDays };
            }
            if (t.type === 'fertilize' && !t.completedDate && !t.intervalDays && info.fertilizeIntervalDays) {
              return { ...t, intervalDays: info.fertilizeIntervalDays };
            }
            return t;
          }),
          ...newTasks,
        ],
      });
      Alert.alert('✅ Info aangevuld', 'Plantinformatie is bijgewerkt via AI.');
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Kon AI niet bereiken.');
    } finally {
      setEnriching(false);
    }
  };

  // ── task complete ──────────────────────────────────────────────────────────
  const handleCompleteTask = useCallback(
    (taskId: string) => {
      if (!plant) return;
      completeMaintenanceTask(plant.id, taskId);   // ✅ fix #6: uses store action
    },
    [plant, completeMaintenanceTask],
  );

  // ── photo log ──────────────────────────────────────────────────────────────
  const handleAddPhoto = async () => {
    if (!plant) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming nodig', 'Geef toegang tot de camera om een foto toe te voegen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const entry: PhotoLogEntry = {
      id: newId(),
      uri: result.assets[0].uri,
      date: new Date().toISOString(),
    };
    updatePlant({ ...plant, photoLog: [...(plant.photoLog ?? []), entry] });
  };

  const handleDeletePhoto = (entryId: string) => {
    if (!plant) return;
    Alert.alert('Foto verwijderen?', 'Dit kan niet ongedaan worden gemaakt.', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen', style: 'destructive',
        onPress: () => updatePlant({ ...plant, photoLog: (plant.photoLog ?? []).filter((e) => e.id !== entryId) }),
      },
    ]);
  };

  // ── tasks ──────────────────────────────────────────────────────────────────
  const { activeTasks, completedTasks } = useMemo(() => {
    if (!plant) return { activeTasks: [], completedTasks: [] };
    const sorted = [...plant.maintenanceTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return {
      activeTasks:    sorted.filter((t) => !t.completedDate),
      completedTasks: sorted.filter((t) => !!t.completedDate)
        .sort((a, b) => (b.completedDate ?? '').localeCompare(a.completedDate ?? '')),
    };
  }, [plant]);

  // ── not found ──────────────────────────────────────────────────────────────
  if (!plant) {
    return (
      <SafeAreaView style={s.container}>
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>‹ Terug</Text>
        </TouchableOpacity>
        <View style={s.centered}>
          <Text style={s.emptyText}>Plant niet gevonden</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backRow}>
          <Text style={s.backText}>‹ Terug</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{plant.commonName}</Text>
        {isEditing ? (
          <View style={s.editActions}>
            <TouchableOpacity onPress={handleCancelEdit} style={s.editActionBtn}>
              <Text style={s.editCancelText}>Annuleer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[s.editActionBtn, s.editSaveBtn]}>
              <Text style={s.editSaveText}>Opslaan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEdit} style={s.editActionBtn}>
            <Text style={s.editStartText}>✏️ Bewerken</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Identity card ── */}
          <View style={s.card}>
            {isEditing ? (
              <>
                <Text style={s.fieldLabel}>Naam</Text>
                <TextInput style={s.input} value={editName} onChangeText={setEditName} />
                <Text style={s.fieldLabel}>Soort (wetenschappelijk)</Text>
                <TextInput style={s.input} value={editSpecies} onChangeText={setEditSpecies}
                  placeholder="bijv. Solanum lycopersicum" placeholderTextColor="#aaa" />
              </>
            ) : (
              <>
                <Text style={s.plantName}>{plant.commonName}</Text>
                {plant.species ? <Text style={s.plantSpecies}>{plant.species}</Text> : null}
              </>
            )}

            <View style={s.metaRow}>
              {plant.lightExposure ? (
                <View style={s.metaChip}><Text style={s.metaChipText}>{LIGHT_LABELS[plant.lightExposure]}</Text></View>
              ) : null}
              {plant.addedVia ? (
                <View style={s.metaChip}><Text style={s.metaChipText}>
                  {plant.addedVia === 'scan' ? '📷 Gescand' : plant.addedVia === 'seed' ? '🌱 Zaad' : plant.addedVia === 'seedling' ? '🪴 Zaailing' : plant.addedVia === 'cutting' ? '✂️ Stek' : '✏️ Handmatig'}
                </Text></View>
              ) : null}
              {plant.plantedDate ? (
                <View style={s.metaChip}><Text style={s.metaChipText}>
                  🗓️ {new Date(plant.plantedDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text></View>
              ) : null}
              <View style={s.metaChip}><Text style={s.metaChipText}>
                🎯 {Math.round(plant.identificationConfidence * 100)}% zeker
              </Text></View>
            </View>
          </View>

          {/* ── Notes ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>📝 Notitie</Text>
            {isEditing ? (
              <TextInput
                style={[s.input, s.inputMulti]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Voeg een notitie toe…"
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={3}
              />
            ) : plant.notes ? (
              <View style={s.notesCard}>
                <Text style={s.notesText}>{plant.notes}</Text>
              </View>
            ) : (
              <Text style={s.emptyText}>Geen notitie — tik op Bewerken om er een toe te voegen.</Text>
            )}
          </View>

          {/* ── AI enrich button — shown when no care tips yet ── */}
          {!isEditing && (!plant.careTips || plant.careTips.length === 0) && (
            <TouchableOpacity
              style={s.enrichBtn}
              onPress={handleEnrichWithAI}
              disabled={enriching}>
              {enriching
                ? <ActivityIndicator size="small" color="#2d6a4f" />
                : <Text style={s.enrichBtnText}>🌿 Vul plantinfo aan via AI</Text>}
            </TouchableOpacity>
          )}

          {/* ── Care tips ── */}
          {plant.careTips && plant.careTips.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🌿 Verzorgingstips</Text>
              <View style={s.tipsCard}>
                {plant.careTips.map((tip, i) => (
                  <View key={i} style={s.tipRow}>
                    <Text style={s.tipBullet}>·</Text>
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Active tasks ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🔧 Openstaande taken</Text>
            {activeTasks.length === 0 ? (
              <Text style={s.emptyText}>Geen openstaande taken</Text>
            ) : (
              activeTasks.map((task) => {
                const isOverdue = task.dueDate < now;
                const relLabel  = relativeDueLabel(task.dueDate);
                return (
                  <View key={task.id} style={[s.taskRow, isOverdue && s.taskRowOverdue]}>
                    <Text style={s.taskIcon}>{TASK_ICONS[task.type]}</Text>
                    <View style={s.taskBody}>
                      <View style={s.taskNameRow}>
                        <Text style={[s.taskLabel, isOverdue && s.textOverdue]}>
                          {TASK_LABELS[task.type]}
                        </Text>
                        {task.intervalDays ? (
                          <Text style={s.recurBadge}>↺ elke {task.intervalDays}d</Text>
                        ) : null}
                      </View>
                      {task.notes ? <Text style={s.taskNote}>{task.notes}</Text> : null}
                      <Text style={[s.taskDue, isOverdue && s.textOverdue]}>
                        {relLabel}
                        {isOverdue ? '  · Verlopen' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.doneBtn, isEditing && s.doneBtnEditing]}
                      onPress={() => !isEditing && handleCompleteTask(task.id)}
                      disabled={isEditing}>
                      <Text style={s.doneBtnText}>✓ Klaar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Water interval edit ── */}
          {isEditing && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>💧 Begietinterval (dagen)</Text>
              <TextInput
                style={s.input}
                value={editWater}
                onChangeText={setEditWater}
                placeholder="bijv. 3"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* ── Task history ── */}
          {completedTasks.length > 0 && (
            <View style={s.section}>
              <TouchableOpacity style={s.historyToggle} onPress={() => setShowHistory((v) => !v)}>
                <Text style={s.sectionTitle}>📋 Geschiedenis ({completedTasks.length})</Text>
                <Text style={s.chevron}>{showHistory ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showHistory && completedTasks.map((task) => (
                <View key={task.id} style={s.historyRow}>
                  <Text style={s.taskIcon}>{TASK_ICONS[task.type]}</Text>
                  <View style={s.taskBody}>
                    <Text style={s.taskLabel}>{TASK_LABELS[task.type]}</Text>
                    {task.notes ? <Text style={s.taskNote}>{task.notes}</Text> : null}
                    <Text style={s.historyDate}>
                      Afgerond: {fullDateTime(task.completedDate!)}
                    </Text>
                  </View>
                  <Text style={s.checkMark}>✓</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Photo log ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>📷 Groeifasen</Text>
              <TouchableOpacity onPress={handleAddPhoto} style={s.addPhotoBtn}>
                <Text style={s.addPhotoBtnText}>+ Foto</Text>
              </TouchableOpacity>
            </View>
            {(plant.photoLog ?? []).length === 0 ? (
              <Text style={s.emptyText}>Nog geen foto's — leg de groei vast met de + Foto knop.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoScroll}>
                {[...(plant.photoLog ?? [])].reverse().map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={s.photoEntry}
                    onLongPress={() => handleDeletePhoto(entry.id)}
                    activeOpacity={0.85}>
                    <Image source={{ uri: entry.uri }} style={s.photoThumb} />
                    <Text style={s.photoDate}>
                      {new Date(entry.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {(plant.photoLog ?? []).length > 0 && (
              <Text style={s.photoHint}>Lang indrukken om foto te verwijderen</Text>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef', gap: 10,
  },
  backRow: { paddingRight: 4 },
  backText: { color: '#2d6a4f', fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1b4332' },
  editActions: { flexDirection: 'row', gap: 8 },
  editActionBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  editCancelText: { fontSize: 14, color: '#aaa', fontWeight: '600' },
  editSaveBtn: { backgroundColor: '#2d6a4f', borderRadius: 8 },
  editSaveText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  editStartText: { fontSize: 14, color: '#2d6a4f', fontWeight: '600' },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  card: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 20, gap: 10 },
  plantName: { fontSize: 26, fontWeight: '700', color: '#1b4332' },
  plantSpecies: { fontSize: 15, fontStyle: 'italic', color: '#6b705c' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaChip: {
    backgroundColor: '#d8f3dc', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  metaChipText: { fontSize: 12, color: '#2d6a4f', fontWeight: '600' },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1b4332' },
  fieldLabel: { fontSize: 12, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#1b4332',
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  notesCard: {
    backgroundColor: '#fff9e6', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#ffe08a',
  },
  notesText: { fontSize: 14, color: '#5a4000', lineHeight: 21 },
  tipsCard: {
    backgroundColor: '#f1f8f3', borderRadius: 12,
    padding: 14, gap: 8, borderWidth: 1, borderColor: '#b7e4c7',
  },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { fontSize: 16, color: '#2d6a4f', marginTop: 1 },
  tipText: { flex: 1, fontSize: 14, color: '#1b4332', lineHeight: 20 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 13, gap: 10,
  },
  taskRowOverdue: { borderColor: '#e63946', backgroundColor: '#fff5f5' },
  taskIcon: { fontSize: 20 },
  taskBody: { flex: 1, gap: 2 },
  taskNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskLabel: { fontSize: 14, fontWeight: '600', color: '#1b4332' },
  taskNote: { fontSize: 12, color: '#6b705c', fontStyle: 'italic' },
  taskDue: { fontSize: 13, color: '#6b705c', fontWeight: '500' },
  textOverdue: { color: '#e63946' },
  recurBadge: {
    fontSize: 10, color: '#2d6a4f', backgroundColor: '#d8f3dc',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, fontWeight: '600', overflow: 'hidden',
  },
  doneBtn: {
    backgroundColor: '#2d6a4f', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, marginLeft: 6,
  },
  doneBtnEditing: { backgroundColor: '#ccc' },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  historyToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 2,
  },
  chevron: { fontSize: 12, color: '#aaa' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 12, gap: 10, opacity: 0.75,
  },
  historyDate: { fontSize: 12, color: '#aaa', marginTop: 1 },
  checkMark: { fontSize: 18, color: '#2d6a4f', fontWeight: '700' },
  addPhotoBtn: {
    backgroundColor: '#f1f8f3', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#b7e4c7',
  },
  addPhotoBtnText: { fontSize: 13, color: '#2d6a4f', fontWeight: '700' },
  photoScroll: { marginTop: 4 },
  photoEntry: { marginRight: 12, alignItems: 'center', gap: 4 },
  photoThumb: { width: 80, height: 80, borderRadius: 12 },
  photoDate: { fontSize: 11, color: '#6b705c', textAlign: 'center' },
  photoHint: { fontSize: 11, color: '#aaa', fontStyle: 'italic' },
  emptyText: { fontSize: 14, color: '#aaa', fontStyle: 'italic', lineHeight: 20 },
  enrichBtn: {
    backgroundColor: '#f1f8f3', borderRadius: 12,
    borderWidth: 1, borderColor: '#2d6a4f',
    paddingVertical: 13, alignItems: 'center',
    marginTop: 4,
  },
  enrichBtnText: { fontSize: 14, color: '#2d6a4f', fontWeight: '700' },
});

export default PlantCardScreen;
