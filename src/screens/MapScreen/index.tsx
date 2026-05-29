import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { GardenMap, CELL_CM } from '@/components/GardenMap';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { Plant, PlantAddedVia, ZONE_COLORS, MaintenanceTask } from '@/models';
import { gardenAssistantService, IdentifiedPlant, createInitialTasksForPlant } from '@/services/GardenAssistantService';
import { OnboardingModal } from '@/components/OnboardingModal';
import { findCompanionPairs, CompanionPair } from '@/data/companionPlanting';
import { useTheme } from '@/hooks/useTheme';

const ONBOARDED_KEY = 'floramap_onboarded';

const GARDEN_SIZES = [
  { label: 'Balkon',      cols: 5,  rows: 3,  desc: '1,5 × 0,9 m' },
  { label: 'Klein',       cols: 10, rows: 10, desc: '3 × 3 m' },
  { label: 'Middelmatig', cols: 15, rows: 15, desc: '4,5 × 4,5 m' },
  { label: 'Groot',       cols: 25, rows: 25, desc: '7,5 × 7,5 m (standaard)' },
  { label: 'Zeer groot',  cols: 35, rows: 35, desc: '10,5 × 10,5 m' },
];

type MapNavProp = StackNavigationProp<MapStackParamList, 'Map'>;
type DrawStep = 'first' | 'second';
type PlantType = 'plant' | 'seed' | 'seedling' | 'cutting';

const PLANT_TYPES: { type: PlantType; icon: string; label: string }[] = [
  { type: 'plant',    icon: '🌿', label: 'Plant' },
  { type: 'seed',     icon: '🌱', label: 'Zaad' },
  { type: 'seedling', icon: '🪴', label: 'Zaailing' },
  { type: 'cutting',  icon: '✂️', label: 'Stek' },
];

const newId = () => `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const makeTasksForType = (plantId: string, type: PlantType): MaintenanceTask[] => {
  switch (type) {
    case 'seed':
      return [
        { id: `${Date.now()}-w`, plantId, type: 'water',    dueDate: addDays(1),  intervalDays: 2 },
        { id: `${Date.now()}-r`, plantId, type: 'repot',    dueDate: addDays(42), notes: 'Verspeen / verplant zaailing' },
      ];
    case 'seedling':
      return [
        { id: `${Date.now()}-w`, plantId, type: 'water', dueDate: addDays(2), intervalDays: 3 },
        { id: `${Date.now()}-r`, plantId, type: 'repot', dueDate: addDays(21), notes: 'Verplant naar buiten' },
      ];
    case 'cutting':
      return [
        { id: `${Date.now()}-w`, plantId, type: 'water', dueDate: addDays(1),  intervalDays: 2 },
        { id: `${Date.now()}-t`, plantId, type: 'treat', dueDate: addDays(14), notes: 'Controleer beworteling' },
      ];
    default:
      return [{ id: `${Date.now()}-w`, plantId, type: 'water', dueDate: addDays(7), intervalDays: 7 }];
  }
};

const makePlantFromScan = (identified: IdentifiedPlant, gardenId: string, x: number, y: number): Plant => {
  const id = newId();
  const tasks = createInitialTasksForPlant(id, identified);
  if (tasks.length === 0) {
    tasks.push({ id: `task-${Date.now()}`, plantId: id, type: 'water', dueDate: addDays(7) });
  }
  return {
    id, gardenId,
    species: identified.species,
    commonName: identified.commonName,
    x, y, z: 0,
    width: 1, height: 1,
    plantedDate: new Date().toISOString(),
    maintenanceTasks: tasks,
    identificationConfidence: identified.confidence,
    careTips: identified.careTips ?? [],
    harvestMonths: identified.harvestMonths,
    addedVia: 'scan',
  };
};

// ── Plant action menu ─────────────────────────────────────────────────────────

interface PlantMenuProps {
  plant: Plant | null;
  onClose: () => void;
  onMove: (p: Plant) => void;
  onResize: (p: Plant) => void;
  onDelete: (p: Plant) => void;
  onChangeColor: (p: Plant, color: string) => void;
  onSaveNote: (p: Plant, notes: string) => void;
}

const PlantMenu = ({ plant, onClose, onMove, onResize, onDelete, onChangeColor, onSaveNote }: PlantMenuProps): React.JSX.Element | null => {
  const theme = useTheme();
  const [showColors, setShowColors] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const menuStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28, overflow: 'hidden' },
    header: { backgroundColor: theme.primaryDark, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 6 },
    plantName: { fontSize: 18, fontWeight: '700', color: theme.card },
    plantSpecies: { fontSize: 13, color: theme.borderLight, fontStyle: 'italic', marginTop: 2 },
    item: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, gap: 14,
    },
    itemDanger: { borderBottomWidth: 0 },
    itemIcon: { fontSize: 20, width: 28, textAlign: 'center' },
    colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.border },
    itemLabel: { fontSize: 16, color: theme.primaryDark, fontWeight: '500', flex: 1 },
    itemLabelDanger: { fontSize: 16, color: theme.danger, fontWeight: '500', flex: 1 },
    chevron: { fontSize: 12, color: theme.textMuted },
    colorRow: { marginLeft: 20, marginBottom: 4 },
    colorRowContent: { paddingRight: 20, gap: 10, paddingVertical: 8 },
    swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent' },
    swatchSelected: { borderColor: theme.primaryDark, transform: [{ scale: 1.2 }] },
    noteArea: { marginHorizontal: 20, marginBottom: 4, gap: 8 },
    noteInput: {
      backgroundColor: theme.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.primaryDark,
      minHeight: 72, textAlignVertical: 'top',
    },
    noteSaveBtn: {
      backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    },
    noteSaveBtnText: { color: theme.card, fontWeight: '700', fontSize: 14 },
    cancelBtn: {
      marginHorizontal: 20, marginTop: 8,
      backgroundColor: theme.primaryBg, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center',
      borderWidth: 1, borderColor: theme.borderLight,
    },
    cancelText: { fontSize: 16, color: theme.primary, fontWeight: '700' },
  });

  const handleOpen = () => {
    setShowColors(false);
    setShowNote(false);
    setNoteText(plant?.notes ?? '');
  };

  if (!plant) return null;
  const isZone = (plant.width ?? 1) > 1 || (plant.height ?? 1) > 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} onShow={handleOpen}>
      <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={menuStyles.sheet}>
          {/* Header */}
          <View style={menuStyles.header}>
            <Text style={menuStyles.plantName}>{plant.commonName}</Text>
            {plant.species ? <Text style={menuStyles.plantSpecies}>{plant.species}</Text> : null}
          </View>

          <TouchableOpacity style={menuStyles.item} onPress={() => { onMove(plant); onClose(); }}>
            <Text style={menuStyles.itemIcon}>↔️</Text>
            <Text style={menuStyles.itemLabel}>Verplaatsen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={menuStyles.item} onPress={() => { onResize(plant); onClose(); }}>
            <Text style={menuStyles.itemIcon}>{isZone ? '⤢' : '⬛'}</Text>
            <Text style={menuStyles.itemLabel}>{isZone ? 'Formaat wijzigen' : 'Uitrekken tot zone'}</Text>
          </TouchableOpacity>

          {isZone && (
            <TouchableOpacity style={menuStyles.item} onPress={() => { setShowNote(false); setShowColors((v) => !v); }}>
              <View style={[menuStyles.colorDot, { backgroundColor: plant.color ?? ZONE_COLORS[0] }]} />
              <Text style={menuStyles.itemLabel}>Kleur wijzigen</Text>
              <Text style={menuStyles.chevron}>{showColors ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}

          {isZone && showColors && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={menuStyles.colorRow}
              contentContainerStyle={menuStyles.colorRowContent}>
              {ZONE_COLORS.map((c) => (
                <TouchableOpacity key={c}
                  style={[menuStyles.swatch, { backgroundColor: c }, plant.color === c && menuStyles.swatchSelected]}
                  onPress={() => { onChangeColor(plant, c); onClose(); }}
                />
              ))}
            </ScrollView>
          )}

          {/* Notitie */}
          <TouchableOpacity style={menuStyles.item} onPress={() => { setShowColors(false); setShowNote((v) => !v); }}>
            <Text style={menuStyles.itemIcon}>📝</Text>
            <Text style={menuStyles.itemLabel}>
              {plant.notes ? 'Notitie bewerken' : 'Notitie toevoegen'}
            </Text>
            <Text style={menuStyles.chevron}>{showNote ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showNote && (
            <View style={menuStyles.noteArea}>
              <TextInput
                style={menuStyles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Voeg een notitie toe…"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={menuStyles.noteSaveBtn}
                onPress={() => { onSaveNote(plant, noteText); onClose(); }}>
                <Text style={menuStyles.noteSaveBtnText}>Notitie opslaan</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[menuStyles.item, menuStyles.itemDanger]}
            onPress={() => { onDelete(plant); onClose(); }}>
            <Text style={menuStyles.itemIcon}>🗑️</Text>
            <Text style={menuStyles.itemLabelDanger}>Verwijderen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={menuStyles.cancelBtn} onPress={onClose}>
            <Text style={menuStyles.cancelText}>Annuleren</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

const MapScreen = (): React.JSX.Element => {
  const theme = useTheme();
  const navigation = useNavigation<MapNavProp>();
  const garden      = useGardenStore((s) => s.garden);
  const setGarden   = useGardenStore((s) => s.setGarden);
  const removePlant  = useGardenStore((s) => s.removePlant);
  const updatePlant  = useGardenStore((s) => s.updatePlant);
  const addPlant     = useGardenStore((s) => s.addPlant);
  const clearGarden  = useGardenStore((s) => s.clearGarden);

  const [movingPlant,          setMovingPlant]          = useState<Plant | null>(null);
  const [drawStep,             setDrawStep]             = useState<DrawStep | null>(null);
  const [firstPoint,           setFirstPoint]           = useState<{ x: number; y: number } | null>(null);
  const [drawTarget,           setDrawTarget]           = useState<Plant | null>(null);
  const [menuPlant,            setMenuPlant]            = useState<Plant | null>(null);
  const [forceShowMap,         setForceShowMap]         = useState(false);
  const [showOnboarding,       setShowOnboarding]       = useState(false);
  const [showCompanionOverlay, setShowCompanionOverlay] = useState(false);
  const [showSizePicker,       setShowSizePicker]       = useState(false);
  const [showFabMenu,          setShowFabMenu]          = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((val) => {
      if (!val) setShowOnboarding(true);
    });
  }, []);

  const handleOnboardingDone = useCallback(() => {
    setShowOnboarding(false);
    AsyncStorage.setItem(ONBOARDED_KEY, '1');
  }, []);

  // ── new-plant modal state ─────────────────────────────────────────────────
  const [showModal,      setShowModal]      = useState(false);
  const [modalName,      setModalName]      = useState('');
  const [modalNotes,     setModalNotes]     = useState('');
  const [modalColor,     setModalColor]     = useState(ZONE_COLORS[0]);
  const [modalPlantType, setModalPlantType] = useState<PlantType>('plant');
  const [pendingBounds,  setPendingBounds]  = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── scan state ────────────────────────────────────────────────────────────
  const [scanning,       setScanning]       = useState(false);
  const [plantsToPlace,  setPlantsToPlace]  = useState<IdentifiedPlant[]>([]);

  // ── correction sheet state ────────────────────────────────────────────────
  const [showCorrectionSheet, setShowCorrectionSheet] = useState(false);
  const [correctionName,      setCorrectionName]      = useState('');
  const [correctionSpecies,   setCorrectionSpecies]   = useState('');

  const ensureGarden = useCallback(() => {
    if (garden) return garden;
    const g = { id: `garden-${Date.now()}`, userId: 'local', name: 'Mijn tuin', polygons: [], plants: [], tasks: [] };
    setGarden(g);
    return g;
  }, [garden, setGarden]);

  // Show correction sheet whenever plantsToPlace gets new entries
  useEffect(() => {
    if (plantsToPlace.length > 0) {
      const next = plantsToPlace[0];
      setCorrectionName(next.commonName);
      setCorrectionSpecies(next.species ?? '');
      setShowCorrectionSheet(true);
    } else {
      setShowCorrectionSheet(false);
    }
  }, [plantsToPlace]);

  const isInteractive = !!movingPlant || !!drawStep || plantsToPlace.length > 0;
  const showMap = !!(garden && garden.plants.length > 0) || plantsToPlace.length > 0 || forceShowMap;

  const pendingTaskCount = useMemo(() => {
    if (!garden) return 0;
    const now = new Date().toISOString();
    return garden.plants.reduce((acc, p) =>
      acc + p.maintenanceTasks.filter((t) => !t.completedDate && t.dueDate < now).length, 0);
  }, [garden]);

  // Plants with overdue water tasks → shown on map as water indicator (#23)
  const thirstyPlantIds = useMemo<string[]>(() => {
    if (!garden) return [];
    const now = new Date().toISOString();
    return garden.plants
      .filter((p) => p.maintenanceTasks.some(
        (t) => t.type === 'water' && !t.completedDate && t.dueDate < now,
      ))
      .map((p) => p.id);
  }, [garden]);

  const companionPairs = useMemo<CompanionPair[]>(() => {
    if (!garden || !showCompanionOverlay) return [];
    return findCompanionPairs(garden.plants);
  }, [garden, showCompanionOverlay]);

  const companionCounts = useMemo(() => ({
    good: companionPairs.filter((p) => p.relation === 'good').length,
    bad:  companionPairs.filter((p) => p.relation === 'bad').length,
  }), [companionPairs]);

  const cancelDraw = useCallback(() => {
    setDrawStep(null); setFirstPoint(null); setDrawTarget(null);
    setShowFabMenu(false);
  }, []);

  const bannerInfo = useMemo(() => {
    if (plantsToPlace.length > 0) {
      const next = plantsToPlace[0];
      return {
        text: `Tik op de kaart om ${next.commonName} te plaatsen`,
        extra: `${plantsToPlace.length} ${plantsToPlace.length === 1 ? 'plant' : 'planten'} over`,
        onCancel: () => setPlantsToPlace([]),
        onSkip: () => setPlantsToPlace((q) => q.slice(1)),
      };
    }
    if (movingPlant) return { text: `Tik om ${movingPlant.commonName} te verplaatsen`, onCancel: () => setMovingPlant(null) };
    if (drawStep === 'first' && !drawTarget) return { text: 'Tik op het startpunt van de nieuwe plant of zone', onCancel: cancelDraw };
    if (drawStep === 'first' && drawTarget) return { text: `Tik op startpunt voor ${drawTarget.commonName}`, onCancel: cancelDraw };
    if (drawStep === 'second') return { text: 'Tik op het eindpunt (tegenovergestelde hoek)', onCancel: cancelDraw };
    return null;
  }, [plantsToPlace, movingPlant, drawStep, drawTarget, cancelDraw]);

  // ── map tap ───────────────────────────────────────────────────────────────
  const handleMapPress = useCallback((x: number, y: number) => {
    if (plantsToPlace.length > 0) {
      const [next, ...rest] = plantsToPlace;
      const corrected: IdentifiedPlant = {
        ...next,
        commonName: correctionName.trim() || next.commonName,
        species: correctionSpecies.trim() || (next.species ?? ''),
      };
      const g = ensureGarden();
      addPlant(makePlantFromScan(corrected, g.id, x, y));
      setPlantsToPlace(rest);
      return;
    }
    if (movingPlant) { updatePlant({ ...movingPlant, x, y }); setMovingPlant(null); return; }
    if (drawStep === 'first') { setFirstPoint({ x, y }); setDrawStep('second'); return; }
    if (drawStep === 'second' && firstPoint) {
      const bx = Math.min(firstPoint.x, x);
      const by = Math.min(firstPoint.y, y);
      const bw = Math.abs(x - firstPoint.x) + 1;
      const bh = Math.abs(y - firstPoint.y) + 1;
      setFirstPoint(null); setDrawStep(null);
      if (drawTarget) {
        const color = drawTarget.color ?? ZONE_COLORS[(garden?.plants.length ?? 0) % ZONE_COLORS.length];
        updatePlant({ ...drawTarget, x: bx, y: by, width: bw, height: bh, color });
        setDrawTarget(null);
      } else {
        setPendingBounds({ x: bx, y: by, width: bw, height: bh });
        setModalColor(ZONE_COLORS[(garden?.plants.length ?? 0) % ZONE_COLORS.length]);
        setModalName(''); setModalNotes(''); setModalPlantType('plant');
        setShowModal(true);
      }
    }
  }, [plantsToPlace, correctionName, correctionSpecies, movingPlant, drawStep, firstPoint, drawTarget, garden, addPlant, updatePlant, ensureGarden]);

  const handleDelete = useCallback((plant: Plant) => {
    Alert.alert('Verwijderen', `${plant.commonName} uit je tuin verwijderen?`, [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => removePlant(plant.id) },
    ]);
  }, [removePlant]);

  // ── confirm new plant/zone modal ──────────────────────────────────────────
  const handleConfirmModal = () => {
    if (!pendingBounds || !modalName.trim()) return;
    const g = ensureGarden();
    const id = newId();
    const isZone = pendingBounds.width > 1 || pendingBounds.height > 1;
    addPlant({
      id, gardenId: g.id,
      species: '',
      commonName: modalName.trim(),
      x: pendingBounds.x, y: pendingBounds.y, z: 0,
      width: pendingBounds.width, height: pendingBounds.height,
      color: isZone ? modalColor : undefined,
      plantedDate: new Date().toISOString(),
      sowDate: modalPlantType === 'seed' ? new Date().toISOString() : undefined,
      notes: modalNotes.trim() || undefined,
      addedVia: isZone ? 'manual' : modalPlantType as PlantAddedVia,
      maintenanceTasks: isZone
        ? [{ id: `task-${Date.now()}`, plantId: id, type: 'water', dueDate: addDays(7) }]
        : makeTasksForType(id, modalPlantType),
      identificationConfidence: 1,
    });
    setShowModal(false); setModalName(''); setModalNotes(''); setPendingBounds(null);
    setForceShowMap(false);
  };

  // ── scan ──────────────────────────────────────────────────────────────────
  const handleScan = async (fromGallery = false) => {
    const result = fromGallery
      ? await ImagePicker.launchImageLibraryAsync({ quality: 0.85 })
      : await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled) return;
    setScanning(true);
    try {
      const gardenPlants = garden?.plants.map((p) => `${p.commonName} (${p.species}) op ${p.x},${p.y}`) ?? [];
      const response = await gardenAssistantService.chat('', result.assets[0].uri, [], gardenPlants);
      if (response.identifiedPlants && response.identifiedPlants.length > 0) {
        setPlantsToPlace(response.identifiedPlants);
      } else {
        Alert.alert('Geen planten herkend', 'Probeer een duidelijkere foto.');
      }
    } catch (e) {
      Alert.alert('Scannen mislukt', e instanceof Error ? e.message : 'Onbekende fout.');
    } finally {
      setScanning(false);
    }
  };

  const handleScanPress = () => {
    Alert.alert('Planten scannen', 'Kies een bron', [
      { text: '📷 Camera',  onPress: () => handleScan(false) },
      { text: '🖼️ Galerij', onPress: () => handleScan(true) },
      { text: 'Annuleren', style: 'cancel' },
    ]);
  };

  const startManualAdd = () => {
    ensureGarden();
    setForceShowMap(true);
    setDrawStep('first');
  };

  // ── styles ────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    emptyContainer: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.background, padding: 32, gap: 14,
    },
    emptyIcon: { fontSize: 64 },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.primaryDark },
    emptySubtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },
    emptyScanBtn: {
      backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 14,
      borderRadius: 14, marginTop: 8, minWidth: 200, alignItems: 'center',
    },
    emptyScanBtnText: { color: theme.card, fontWeight: '700', fontSize: 16 },
    emptyManualBtn: {
      backgroundColor: theme.primaryBg, paddingHorizontal: 24, paddingVertical: 14,
      borderRadius: 14, minWidth: 200, alignItems: 'center',
      borderWidth: 1, borderColor: theme.borderLight,
    },
    emptyManualBtnText: { color: theme.primary, fontWeight: '700', fontSize: 16 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    gardenName: { fontSize: 20, fontWeight: '700', color: theme.primaryDark },
    plantCount: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    badge: { backgroundColor: theme.warning, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeText: { color: theme.text, fontWeight: '700', fontSize: 13 },
    companionBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: theme.primaryBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.borderLight,
    },
    companionBtnActive: {
      backgroundColor: theme.primary, borderColor: theme.primary,
    },
    companionBtnText: { fontSize: 20 },
    waterBanner: {
      backgroundColor: theme.infoLight, paddingHorizontal: 16, paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: theme.info,
    },
    waterBannerText: { fontSize: 13, fontWeight: '600', color: theme.info },
    sizeBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: theme.primaryBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.borderLight,
    },
    sizeBtnText: { fontSize: 18 },
    companionLegend: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
      paddingHorizontal: 16, paddingVertical: 8,
      backgroundColor: theme.primaryBg,
      borderBottomWidth: 1, borderBottomColor: theme.borderLight,
      gap: 16,
    },
    companionChipsRow: {
      backgroundColor: theme.primaryBg,
      borderBottomWidth: 1, borderBottomColor: theme.borderLight,
      maxHeight: 40,
    },
    companionChipsContent: {
      paddingHorizontal: 12, paddingVertical: 6, gap: 8,
    },
    companionChip: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 12, borderWidth: 1,
    },
    chipGood: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
    chipBad:  { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    companionChipText: { fontSize: 11, fontWeight: '600' },
    chipTextGood: { color: theme.primaryDark },
    chipTextBad:  { color: theme.danger },
    sizeOption: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
      gap: 12,
    },
    sizeOptionActive: { backgroundColor: theme.primaryBg },
    sizeOptionLabel: { fontSize: 16, fontWeight: '600', color: theme.primaryDark, width: 110 },
    sizeOptionLabelActive: { color: theme.primary },
    sizeOptionDesc: { flex: 1, fontSize: 13, color: theme.textSecondary },
    sizeOptionDescActive: { color: theme.primary },
    sizeCheck: { fontSize: 16, color: theme.primary, fontWeight: '700' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDash: { width: 22, height: 3, borderRadius: 2 },
    legendGood: { backgroundColor: theme.primary },
    legendBad:  { backgroundColor: theme.danger },
    legendText: { fontSize: 12, color: theme.primaryDark, fontWeight: '600' },
    legendHint: { fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' },
    banner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.primaryLight, paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.primary, gap: 8,
    },
    bannerLeft: { flex: 1 },
    bannerText: { fontSize: 13, color: theme.primaryDark, fontWeight: '600' },
    bannerExtra: { fontSize: 11, color: theme.primary, marginTop: 1 },
    bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    bannerSkip: { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
    bannerCancel: { fontSize: 18, color: theme.danger, fontWeight: '700' },
    hintBar: {
      paddingHorizontal: 16, paddingVertical: 6,
      backgroundColor: theme.cardAlt, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    hintText: { fontSize: 11, color: theme.textMuted, textAlign: 'center' },
    mapWrapper: { flex: 1, overflow: 'hidden' },
    scrollOuter: { flex: 1 },
    fab: {
      position: 'absolute', bottom: 20, right: 20,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    fabActive: { backgroundColor: theme.danger },
    fabText: { color: theme.card, fontSize: 28, fontWeight: '300', lineHeight: 34 },
    fabBackdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    },
    fabMenu: {
      position: 'absolute', bottom: 82, right: 20,
      backgroundColor: theme.card, borderRadius: 16,
      borderWidth: 1, borderColor: theme.border,
      elevation: 6, shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8,
      overflow: 'hidden', minWidth: 200,
    },
    fabMenuItem: {
      paddingHorizontal: 18, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
    },
    fabMenuItemDanger: { borderBottomWidth: 0 },
    fabMenuItemText: { fontSize: 15, color: theme.primaryDark, fontWeight: '600' },
    fabMenuItemTextDanger: { color: theme.danger },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: {
      backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 24, gap: 14, paddingBottom: 36,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.primaryDark },
    modalSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: -8 },
    modalInput: {
      backgroundColor: theme.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: theme.primaryDark,
    },
    modalInputNotes: { fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 10,
      borderRadius: 12, borderWidth: 1, borderColor: theme.border,
      backgroundColor: theme.cardAlt, gap: 4,
    },
    typeBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    typeBtnIcon: { fontSize: 18 },
    typeBtnLabel: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
    typeBtnLabelActive: { color: theme.primary },
    colorLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    colorSwatch: {
      width: 36, height: 36, borderRadius: 18, marginRight: 10,
      borderWidth: 2, borderColor: 'transparent',
    },
    colorSwatchSelected: { borderColor: theme.primaryDark, transform: [{ scale: 1.2 }] },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
    modalCancelBtn: {
      flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    modalCancelText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
    modalConfirmBtn: {
      flex: 2, backgroundColor: theme.primary, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    modalConfirmBtnDisabled: { backgroundColor: theme.textMuted },
    modalConfirmText: { color: theme.card, fontWeight: '700', fontSize: 15 },
  });

  const corrStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '70%' },
    handle: { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '700', color: theme.primaryDark, marginBottom: 4 },
    lowConf: { fontSize: 12, color: theme.warning, marginBottom: 12, backgroundColor: theme.warningLight, padding: 8, borderRadius: 8 },
    label: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginTop: 8, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: theme.borderLight, borderRadius: 10, padding: 10, fontSize: 15, color: theme.primaryDark, backgroundColor: theme.cardAlt },
    confirmBtn: { marginTop: 16, backgroundColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    confirmText: { color: theme.card, fontWeight: '700', fontSize: 14 },
    skipBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
    skipText: { color: theme.textMuted, fontSize: 13 },
  });

  // ── empty state ───────────────────────────────────────────────────────────
  if (!showMap) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌳</Text>
        <Text style={styles.emptyTitle}>Je tuin is nog leeg</Text>
        <Text style={styles.emptySubtitle}>
          Scan een foto om planten te herkennen, of voeg ze handmatig toe.
        </Text>
        <TouchableOpacity style={styles.emptyScanBtn} onPress={handleScanPress} disabled={scanning}>
          {scanning
            ? <ActivityIndicator color={theme.card} />
            : <Text style={styles.emptyScanBtnText}>📷 Scan planten</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.emptyManualBtn} onPress={startManualAdd}>
          <Text style={styles.emptyManualBtnText}>✏️ Handmatig toevoegen</Text>
        </TouchableOpacity>
        <OnboardingModal visible={showOnboarding} onDone={handleOnboardingDone} />
      </SafeAreaView>
    );
  }

  const currentGarden = garden ?? { id: 'temp', userId: 'local', name: 'Mijn tuin', polygons: [], plants: [], tasks: [] };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.gardenName}>{currentGarden.name}</Text>
          <Text style={styles.plantCount}>{currentGarden.plants.length} planten</Text>
        </View>
        <View style={styles.headerRight}>
          {pendingTaskCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingTaskCount} verlopen</Text>
            </View>
          )}
          {scanning && <ActivityIndicator size="small" color={theme.primary} />}
          <TouchableOpacity
            style={[styles.companionBtn, showCompanionOverlay && styles.companionBtnActive]}
            onPress={() => setShowCompanionOverlay((v) => !v)}>
            <Text style={styles.companionBtnText}>🌿</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sizeBtn} onPress={() => setShowSizePicker(true)}>
            <Text style={styles.sizeBtnText}>📐</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner */}
      {bannerInfo ? (
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerText}>{bannerInfo.text}</Text>
            {bannerInfo.extra && <Text style={styles.bannerExtra}>{bannerInfo.extra}</Text>}
          </View>
          <View style={styles.bannerActions}>
            {bannerInfo.onSkip && <TouchableOpacity onPress={bannerInfo.onSkip}><Text style={styles.bannerSkip}>Sla over</Text></TouchableOpacity>}
            <TouchableOpacity onPress={bannerInfo.onCancel}><Text style={styles.bannerCancel}>✕</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>1 cel = 30×30 cm · lang indrukken om te bewerken · ＋ voor nieuwe zone</Text>
        </View>
      )}

      {/* Companion legend */}
      {showCompanionOverlay && (
        <View style={styles.companionLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDash, styles.legendGood]} />
            <Text style={styles.legendText}>
              {companionCounts.good === 0 ? 'Geen goede buren' : `${companionCounts.good} goede ${companionCounts.good === 1 ? 'buur' : 'buren'}`}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDash, styles.legendBad]} />
            <Text style={styles.legendText}>
              {companionCounts.bad === 0 ? 'Geen slechte buren' : `${companionCounts.bad} slechte ${companionCounts.bad === 1 ? 'buur' : 'buren'}`}
            </Text>
          </View>
          {companionCounts.good === 0 && companionCounts.bad === 0 && (
            <Text style={styles.legendHint}>
              Geen bekende companions gevonden. Probeer tomaat, basilicum, komkommer of wortel.
            </Text>
          )}
        </View>
      )}

      {/* Companion pair chips */}
      {showCompanionOverlay && companionPairs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.companionChipsRow}
          contentContainerStyle={styles.companionChipsContent}>
          {companionPairs.map((pair, i) => {
            const pA = currentGarden.plants.find((p) => p.id === pair.plantIdA);
            const pB = currentGarden.plants.find((p) => p.id === pair.plantIdB);
            if (!pA || !pB) return null;
            const good = pair.relation === 'good';
            return (
              <View key={i} style={[styles.companionChip, good ? styles.chipGood : styles.chipBad]}>
                <Text style={[styles.companionChipText, good ? styles.chipTextGood : styles.chipTextBad]}>
                  {pA.commonName} {good ? '♥' : '✕'} {pB.commonName}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Water banner (#23) */}
      {!isInteractive && thirstyPlantIds.length > 0 && (
        <View style={styles.waterBanner}>
          <Text style={styles.waterBannerText}>
            💧 {thirstyPlantIds.length} {thirstyPlantIds.length === 1 ? 'plant heeft' : 'planten hebben'} water nodig
          </Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapWrapper}>
        <ScrollView horizontal style={styles.scrollOuter} bounces={false}
          removeClippedSubviews={false} scrollEventThrottle={16}>
          <ScrollView bounces={false} removeClippedSubviews={false}>
            <GardenMap
              garden={currentGarden}
              onPlantPress={(p) => navigation.navigate('PlantCard', { plantId: p.id })}
              onPlantLongPress={(p) => setMenuPlant(p)}
              viewMode="2d"
              isInteractive={isInteractive}
              highlightPoint={drawStep === 'second' ? firstPoint : null}
              movingPlantId={movingPlant?.id}
              onMapPress={handleMapPress}
              companionPairs={companionPairs}
              showCompanionOverlay={showCompanionOverlay}
              thirstyPlantIds={thirstyPlantIds}
            />
          </ScrollView>
        </ScrollView>

        {!isInteractive && (
          <>
            {showFabMenu && (
              <Pressable style={styles.fabBackdrop} onPress={() => setShowFabMenu(false)} />
            )}
            {showFabMenu && (
              <View style={styles.fabMenu}>
                <TouchableOpacity style={styles.fabMenuItem}
                  onPress={() => { setShowFabMenu(false); handleScanPress(); }}>
                  <Text style={styles.fabMenuItemText}>📷 Scan planten</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fabMenuItem}
                  onPress={() => { setShowFabMenu(false); ensureGarden(); setDrawStep('first'); }}>
                  <Text style={styles.fabMenuItemText}>✏️ Handmatig toevoegen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fabMenuItem, styles.fabMenuItemDanger]}
                  onPress={() => {
                    setShowFabMenu(false);
                    Alert.alert(
                      'Tuin verwijderen',
                      'Wil je de hele tuin wissen? Dit kan niet ongedaan worden gemaakt.',
                      [
                        { text: 'Annuleren', style: 'cancel' },
                        { text: 'Verwijderen', style: 'destructive',
                          onPress: () => { clearGarden(); setForceShowMap(false); } },
                      ],
                    );
                  }}>
                  <Text style={[styles.fabMenuItemText, styles.fabMenuItemTextDanger]}>🗑️ Tuin wissen</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.fab, showFabMenu && styles.fabActive]}
              onPress={() => setShowFabMenu((v) => !v)}
              activeOpacity={0.85}>
              <Text style={styles.fabText}>{showFabMenu ? '✕' : '＋'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Onboarding */}
      <OnboardingModal visible={showOnboarding} onDone={handleOnboardingDone} />

      {/* Plant action menu */}
      <PlantMenu
        plant={menuPlant}
        onClose={() => setMenuPlant(null)}
        onMove={(p) => setMovingPlant(p)}
        onResize={(p) => { setDrawTarget(p); setDrawStep('first'); }}
        onDelete={handleDelete}
        onChangeColor={(p, color) => updatePlant({ ...p, color })}
        onSaveNote={(p, notes) => updatePlant({ ...p, notes: notes.trim() || undefined })}
      />

      {/* Plant correction sheet */}
      {showCorrectionSheet && plantsToPlace.length > 0 && (
        <Modal
          visible={showCorrectionSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCorrectionSheet(false)}>
          <Pressable
            style={corrStyles.backdrop}
            onPress={() => setShowCorrectionSheet(false)}>
            <Pressable style={corrStyles.sheet} onPress={() => {}}>
              <View style={corrStyles.handle} />
              <Text style={corrStyles.title}>🔍 Plant herkend</Text>
              {(plantsToPlace[0].confidence ?? 1) < 0.85 && (
                <Text style={corrStyles.lowConf}>
                  ⚠️ Lage zekerheid ({Math.round((plantsToPlace[0].confidence ?? 0.7) * 100)}%) — controleer de naam
                </Text>
              )}
              <Text style={corrStyles.label}>Naam</Text>
              <TextInput
                style={corrStyles.input}
                value={correctionName}
                onChangeText={setCorrectionName}
                placeholder="Naam van de plant"
                placeholderTextColor={theme.textMuted}
              />
              <Text style={corrStyles.label}>Soort (optioneel)</Text>
              <TextInput
                style={corrStyles.input}
                value={correctionSpecies}
                onChangeText={setCorrectionSpecies}
                placeholder="Latijnse naam"
                placeholderTextColor={theme.textMuted}
              />
              <TouchableOpacity
                style={corrStyles.confirmBtn}
                onPress={() => setShowCorrectionSheet(false)}>
                <Text style={corrStyles.confirmText}>
                  ✓ Tik nu op de kaart om te plaatsen
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={corrStyles.skipBtn}
                onPress={() => { setPlantsToPlace((q) => q.slice(1)); setShowCorrectionSheet(false); }}>
                <Text style={corrStyles.skipText}>Overslaan</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Garden size picker modal */}
      <Modal visible={showSizePicker} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>📐 Tuingrootte</Text>
            <Text style={styles.modalSubtitle}>
              1 vakje = {CELL_CM}×{CELL_CM} cm
            </Text>
            {GARDEN_SIZES.map((s) => {
              const active =
                (currentGarden.gridCols ?? 25) === s.cols &&
                (currentGarden.gridRows ?? 25) === s.rows;
              return (
                <TouchableOpacity
                  key={s.label}
                  style={[styles.sizeOption, active && styles.sizeOptionActive]}
                  onPress={() => {
                    const g = ensureGarden();
                    setGarden({ ...g, gridCols: s.cols, gridRows: s.rows });
                    setShowSizePicker(false);
                  }}>
                  <Text style={[styles.sizeOptionLabel, active && styles.sizeOptionLabelActive]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.sizeOptionDesc, active && styles.sizeOptionDescActive]}>
                    {s.cols}×{s.rows} vakjes · {s.desc}
                  </Text>
                  {active && <Text style={styles.sizeCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSizePicker(false)}>
              <Text style={styles.modalCancelText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* New plant/zone modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {pendingBounds && (pendingBounds.width > 1 || pendingBounds.height > 1) ? 'Nieuwe zone' : 'Nieuwe plant'}
            </Text>
            {pendingBounds && (
              <Text style={styles.modalSubtitle}>
                {pendingBounds.width} × {pendingBounds.height} vakjes{'  '}
                ({pendingBounds.width * CELL_CM} × {pendingBounds.height * CELL_CM} cm)
              </Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Naam…"
              placeholderTextColor={theme.textMuted}
              value={modalName}
              onChangeText={setModalName}
              autoFocus
              returnKeyType="done"
            />

            {/* Type selector — only for single plants */}
            {pendingBounds && pendingBounds.width === 1 && pendingBounds.height === 1 && (
              <View style={styles.typeRow}>
                {PLANT_TYPES.map(({ type, icon, label }) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, modalPlantType === type && styles.typeBtnActive]}
                    onPress={() => setModalPlantType(type)}>
                    <Text style={styles.typeBtnIcon}>{icon}</Text>
                    <Text style={[styles.typeBtnLabel, modalPlantType === type && styles.typeBtnLabelActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Zone color picker */}
            {pendingBounds && (pendingBounds.width > 1 || pendingBounds.height > 1) && (
              <>
                <Text style={styles.colorLabel}>Kleur</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {ZONE_COLORS.map((c) => (
                    <TouchableOpacity key={c}
                      style={[styles.colorSwatch, { backgroundColor: c }, modalColor === c && styles.colorSwatchSelected]}
                      onPress={() => setModalColor(c)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Notes */}
            <TextInput
              style={[styles.modalInput, styles.modalInputNotes]}
              placeholder="Notitie (optioneel)…"
              placeholderTextColor={theme.textMuted}
              value={modalNotes}
              onChangeText={setModalNotes}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn}
                onPress={() => { setShowModal(false); setModalName(''); setModalNotes(''); setPendingBounds(null); setForceShowMap(false); }}>
                <Text style={styles.modalCancelText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !modalName.trim() && styles.modalConfirmBtnDisabled]}
                onPress={handleConfirmModal} disabled={!modalName.trim()}>
                <Text style={styles.modalConfirmText}>Opslaan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default MapScreen;
