import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { GardenMap, CELL_CM } from '@/components/GardenMap';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { Plant, PlantAddedVia, ZONE_COLORS, MaintenanceTask, GardenBoundary, BoundaryType } from '@/models';
import { gardenAssistantService, IdentifiedPlant, createInitialTasksForPlant } from '@/services/GardenAssistantService';
import { OnboardingModal } from '@/components/OnboardingModal';
import { findCompanionPairs, CompanionPair } from '@/data/companionPlanting';
import { plantDatabase, PlantProfile } from '@/data/plantDatabase';
import { checkCropRotation } from '@/utils/cropRotation';

const ONBOARDED_KEY = 'floramap_onboarded';

type MapNavProp = StackNavigationProp<MapStackParamList, 'Map'>;
type DrawStep = 'first' | 'second';
type FabMode = 'idle' | 'menu' | 'boundary';
type PlantType = 'plant' | 'seed' | 'seedling' | 'cutting';

const PLANT_TYPES: { type: PlantType; icon: string; label: string }[] = [
  { type: 'plant',    icon: '🌿', label: 'Plant' },
  { type: 'seed',     icon: '🌱', label: 'Zaad' },
  { type: 'seedling', icon: '🪴', label: 'Zaailing' },
  { type: 'cutting',  icon: '✂️', label: 'Stek' },
];

const newId = () => `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const newBoundaryId = () => `boundary-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const BOUNDARY_TYPES: { type: BoundaryType; emoji: string; label: string; isLine: boolean }[] = [
  { type: 'fence',  emoji: '🪵', label: 'Schutting', isLine: true },
  { type: 'wall',   emoji: '🧱', label: 'Muur',      isLine: true },
  { type: 'hedge',  emoji: '🌿', label: 'Haag',      isLine: true },
  { type: 'path',   emoji: '🪨', label: 'Looppad',   isLine: true },
  { type: 'forest', emoji: '🌳', label: 'Bebossing',  isLine: false },
  { type: 'lawn',   emoji: '🌾', label: 'Gras',      isLine: false },
  { type: 'patio',  emoji: '🪨', label: 'Terras',    isLine: false },
  { type: 'pond',   emoji: '🌊', label: 'Vijver',    isLine: false },
];

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
    plantFamily: identified.plantFamily,
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
  const [showColors, setShowColors] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

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
                placeholderTextColor="#aaa"
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
  const navigation = useNavigation<MapNavProp>();
  const garden      = useGardenStore((s) => s.garden);
  const setGarden   = useGardenStore((s) => s.setGarden);
  const removePlant  = useGardenStore((s) => s.removePlant);
  const updatePlant  = useGardenStore((s) => s.updatePlant);
  const addPlant     = useGardenStore((s) => s.addPlant);
  const clearGarden  = useGardenStore((s) => s.clearGarden);
  const addBoundary  = useGardenStore((s) => s.addBoundary);
  const removeBoundary = useGardenStore((s) => s.removeBoundary);
  const rotationHistory = useGardenStore((s) => s.rotationHistory);

  const [movingPlant,         setMovingPlant]         = useState<Plant | null>(null);
  const [drawStep,            setDrawStep]            = useState<DrawStep | null>(null);
  const [firstPoint,          setFirstPoint]          = useState<{ x: number; y: number } | null>(null);
  const [drawTarget,          setDrawTarget]          = useState<Plant | null>(null);
  const [menuPlant,           setMenuPlant]           = useState<Plant | null>(null);
  const [forceShowMap,        setForceShowMap]        = useState(false);
  const [showOnboarding,      setShowOnboarding]      = useState(false);
  const [showCompanionOverlay, setShowCompanionOverlay] = useState(false);

  // Plant search state
  const [showPlantSearch,     setShowPlantSearch]     = useState(false);
  const [plantSearchQuery,    setPlantSearchQuery]    = useState('');

  // Boundary state
  const [fabMode,             setFabMode]             = useState<FabMode>('idle');
  const [showBoundaryPicker,  setShowBoundaryPicker]  = useState(false);
  const [pendingBoundaryType, setPendingBoundaryType] = useState<BoundaryType | null>(null);
  const [pendingBoundaryIsLine, setPendingBoundaryIsLine] = useState(false);
  const [boundaryDrawStep,    setBoundaryDrawStep]    = useState<DrawStep | null>(null);
  const [boundaryFirstPoint,  setBoundaryFirstPoint]  = useState<{ x: number; y: number } | null>(null);

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

  // ── disease scan state ────────────────────────────────────────────────────
  const [diseaseScanning,   setDiseaseScanning]   = useState(false);
  const [showDiseaseResult, setShowDiseaseResult] = useState(false);
  const [diseaseText,       setDiseaseText]       = useState('');

  const ensureGarden = useCallback(() => {
    if (garden) return garden;
    const g = { id: `garden-${Date.now()}`, userId: 'local', name: 'Mijn tuin', polygons: [], plants: [], tasks: [] };
    setGarden(g);
    return g;
  }, [garden, setGarden]);

  const isInteractive = !!movingPlant || !!drawStep || plantsToPlace.length > 0 || !!boundaryDrawStep;
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
    if (boundaryDrawStep === 'first') return { text: 'Tik op het startpunt van de grens', onCancel: () => { setBoundaryDrawStep(null); setBoundaryFirstPoint(null); setPendingBoundaryType(null); } };
    if (boundaryDrawStep === 'second') return { text: 'Tik op het eindpunt van de grens', onCancel: () => { setBoundaryDrawStep(null); setBoundaryFirstPoint(null); setPendingBoundaryType(null); } };
    return null;
  }, [plantsToPlace, movingPlant, drawStep, drawTarget, cancelDraw, boundaryDrawStep]);

  // ── map tap ───────────────────────────────────────────────────────────────
  const handleMapPress = useCallback((x: number, y: number) => {
    // Boundary draw flow
    if (boundaryDrawStep === 'first') {
      setBoundaryFirstPoint({ x, y });
      setBoundaryDrawStep('second');
      return;
    }
    if (boundaryDrawStep === 'second' && boundaryFirstPoint && pendingBoundaryType) {
      const boundary: GardenBoundary = pendingBoundaryIsLine
        ? { id: newBoundaryId(), type: pendingBoundaryType, x1: boundaryFirstPoint.x, y1: boundaryFirstPoint.y, x2: x, y2: y }
        : {
            id: newBoundaryId(), type: pendingBoundaryType,
            x: Math.min(boundaryFirstPoint.x, x),
            y: Math.min(boundaryFirstPoint.y, y),
            width:  Math.abs(x - boundaryFirstPoint.x) + 1,
            height: Math.abs(y - boundaryFirstPoint.y) + 1,
          };
      ensureGarden();
      addBoundary(boundary);
      setBoundaryDrawStep(null);
      setBoundaryFirstPoint(null);
      setPendingBoundaryType(null);
      setPendingBoundaryIsLine(false);
      return;
    }

    if (plantsToPlace.length > 0) {
      const [next, ...rest] = plantsToPlace;
      const g = ensureGarden();
      const newPlant = makePlantFromScan(next, g.id, x, y);
      addPlant(newPlant);
      // Crop rotation check
      const rotationWarning = checkCropRotation(newPlant, g.plants, rotationHistory);
      if (rotationWarning) {
        Alert.alert('Gewasrotatie', rotationWarning, [{ text: 'Begrepen' }]);
      }
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
  }, [boundaryDrawStep, boundaryFirstPoint, pendingBoundaryType, pendingBoundaryIsLine, plantsToPlace, movingPlant, drawStep, firstPoint, drawTarget, garden, addPlant, addBoundary, updatePlant, ensureGarden]);

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
    Alert.alert('Plant toevoegen', 'Kies een methode', [
      { text: '📷 Camera',    onPress: () => handleScan(false) },
      { text: '🖼️ Galerij',   onPress: () => handleScan(true) },
      { text: '🔍 Database',  onPress: () => { setPlantSearchQuery(''); setShowPlantSearch(true); } },
      { text: '🐛 Ziekte scan', onPress: () => handleDiseaseScan() },
      { text: 'Annuleren', style: 'cancel' },
    ]);
  };

  const startManualAdd = () => {
    ensureGarden();
    setForceShowMap(true);
    setDrawStep('first');
  };

  // ── plant search ───────────────────────────────────────────────────────────
  const currentMonth = new Date().getMonth();
  const seasonalPlants = useMemo<PlantProfile[]>(() =>
    plantDatabase.filter((p) => p.sowMonths?.includes(currentMonth)).slice(0, 6),
  [currentMonth]);

  const filteredPlants = useMemo<PlantProfile[]>(() => {
    const q = plantSearchQuery.toLowerCase().trim();
    if (!q) return plantDatabase;
    return plantDatabase.filter(
      (p) =>
        p.commonName.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q),
    );
  }, [plantSearchQuery]);

  const handleSelectPlant = useCallback((profile: PlantProfile) => {
    const ip: IdentifiedPlant = {
      species: profile.species,
      commonName: profile.commonName,
      confidence: 1,
      careTips: profile.careTips,
      waterIntervalDays: profile.waterIntervalDays,
      fertilizeIntervalDays: profile.fertilizeIntervalDays,
      harvestMonths: profile.harvestMonths,
      plantFamily: profile.plantFamily,
    };
    setPlantsToPlace([ip]);
    setShowPlantSearch(false);
    ensureGarden();
    setForceShowMap(true);
  }, [ensureGarden]);

  // ── disease scan ──────────────────────────────────────────────────────────
  const handleDiseaseScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming nodig', 'Geef toegang tot de camera om een ziektescan uit te voeren.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setDiseaseScanning(true);
    try {
      const response = await gardenAssistantService.chat(
        'Analyseer deze plant op ziektes, plagen en gebreken. Geef een diagnose en behandeladvies.',
        result.assets[0].uri,
        [],
        [],
      );
      setDiseaseText(response.text);
      setShowDiseaseResult(true);
    } catch (e) {
      Alert.alert('Ziektescan mislukt', e instanceof Error ? e.message : 'Onbekende fout.');
    } finally {
      setDiseaseScanning(false);
    }
  };

  // ── boundary picker ───────────────────────────────────────────────────────
  const handleSelectBoundaryType = useCallback((bt: { type: BoundaryType; isLine: boolean }) => {
    setShowBoundaryPicker(false);
    setPendingBoundaryType(bt.type);
    setPendingBoundaryIsLine(bt.isLine);
    ensureGarden();
    setForceShowMap(true);
    setBoundaryDrawStep('first');
  }, [ensureGarden]);

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
            ? <ActivityIndicator color="#fff" />
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
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanPress} disabled={scanning}>
            {scanning ? <ActivityIndicator size="small" color="#2d6a4f" /> : <Text style={styles.scanBtnText}>📷</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.companionBtn, showCompanionOverlay && styles.companionBtnActive]}
            onPress={() => setShowCompanionOverlay((v) => !v)}>
            <Text style={styles.companionBtnText}>🌿</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => Alert.alert(
              'Tuin verwijderen',
              'Wil je de hele tuin wissen? Dit kan niet ongedaan worden gemaakt.',
              [
                { text: 'Annuleren', style: 'cancel' },
                { text: 'Verwijderen', style: 'destructive', onPress: () => { clearGarden(); setForceShowMap(false); } },
              ],
            )}>
            <Text style={styles.deleteBtnText}>🗑️</Text>
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
            <Text style={styles.legendHint}>Voeg meer planten toe om relaties te zien</Text>
          )}
        </View>
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
        <ScrollView horizontal style={styles.scrollOuter} bounces={false}>
          <ScrollView bounces={false}>
            <GardenMap
              garden={currentGarden}
              onPlantPress={(p) => navigation.navigate('PlantCard', { plantId: p.id })}
              onPlantLongPress={(p) => setMenuPlant(p)}
              viewMode="2d"
              isInteractive={isInteractive}
              highlightPoint={
                boundaryDrawStep === 'second' ? boundaryFirstPoint :
                drawStep === 'second' ? firstPoint : null
              }
              movingPlantId={movingPlant?.id}
              onMapPress={handleMapPress}
              companionPairs={companionPairs}
              showCompanionOverlay={showCompanionOverlay}
              thirstyPlantIds={thirstyPlantIds}
              boundaries={currentGarden.boundaries ?? []}
            />
          </ScrollView>
        </ScrollView>

        {!isInteractive && (
          <TouchableOpacity style={styles.fab} onPress={() => setFabMode((m) => m === 'menu' ? 'idle' : 'menu')} activeOpacity={0.85}>
            <Text style={styles.fabText}>{fabMode === 'menu' ? '✕' : '＋'}</Text>
          </TouchableOpacity>
        )}

        {/* FAB menu */}
        {!isInteractive && fabMode === 'menu' && (
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabMode('idle'); ensureGarden(); setForceShowMap(true); setDrawStep('first'); }} activeOpacity={0.85}>
              <Text style={styles.fabMenuIcon}>🌱</Text>
              <Text style={styles.fabMenuLabel}>Plant/zone toevoegen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabMode('idle'); setShowBoundaryPicker(true); }} activeOpacity={0.85}>
              <Text style={styles.fabMenuIcon}>🏡</Text>
              <Text style={styles.fabMenuLabel}>Grens toevoegen</Text>
            </TouchableOpacity>
          </View>
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

      {/* Plant search modal */}
      <Modal visible={showPlantSearch} transparent animationType="slide" onRequestClose={() => setShowPlantSearch(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>🔍 Plantendatabase</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Zoek op naam of soort…"
              placeholderTextColor="#aaa"
              value={plantSearchQuery}
              onChangeText={setPlantSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {!plantSearchQuery.trim() && seasonalPlants.length > 0 && (
              <>
                <Text style={styles.colorLabel}>Nu in het seizoen</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {seasonalPlants.map((p) => (
                    <TouchableOpacity
                      key={p.species}
                      style={styles.seasonChip}
                      onPress={() => handleSelectPlant(p)}
                      activeOpacity={0.8}>
                      <Text style={styles.seasonChipEmoji}>{p.emoji}</Text>
                      <Text style={styles.seasonChipLabel}>{p.commonName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <FlatList
              data={filteredPlants}
              keyExtractor={(item) => item.species}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.plantSearchRow} onPress={() => handleSelectPlant(item)} activeOpacity={0.7}>
                  <Text style={styles.plantSearchEmoji}>{item.emoji}</Text>
                  <View style={styles.plantSearchInfo}>
                    <Text style={styles.plantSearchName}>{item.commonName}</Text>
                    <Text style={styles.plantSearchSpecies}>{item.species}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPlantSearch(false)}>
              <Text style={styles.modalCancelText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Boundary picker modal */}
      <Modal visible={showBoundaryPicker} transparent animationType="slide" onRequestClose={() => setShowBoundaryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBoundaryPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <Text style={styles.modalTitle}>🏡 Grens toevoegen</Text>
            <Text style={styles.modalSubtitle}>Kies het type grens en tik twee punten op de kaart</Text>
            <View style={styles.boundaryGrid}>
              {BOUNDARY_TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt.type}
                  style={styles.boundaryBtn}
                  onPress={() => handleSelectBoundaryType(bt)}
                  activeOpacity={0.8}>
                  <Text style={styles.boundaryBtnEmoji}>{bt.emoji}</Text>
                  <Text style={styles.boundaryBtnLabel}>{bt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBoundaryPicker(false)}>
              <Text style={styles.modalCancelText}>Annuleren</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Disease scan loading overlay */}
      {diseaseScanning && (
        <Modal visible transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2d6a4f" />
            <Text style={styles.loadingText}>Ziektescan bezig…</Text>
          </View>
        </Modal>
      )}

      {/* Disease scan result modal */}
      <Modal visible={showDiseaseResult} transparent animationType="slide" onRequestClose={() => setShowDiseaseResult(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>🐛 Ziekte & plaag diagnose</Text>
            <ScrollView style={{ flex: 1 }}>
              <Text style={styles.diseaseResultText}>{diseaseText}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.modalConfirmBtn, { marginTop: 8 }]} onPress={() => setShowDiseaseResult(false)}>
              <Text style={styles.modalConfirmText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              placeholderTextColor="#aaa"
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
              placeholderTextColor="#aaa"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', padding: 32, gap: 14,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
  emptySubtitle: { fontSize: 15, color: '#6b705c', textAlign: 'center', lineHeight: 22 },
  emptyScanBtn: {
    backgroundColor: '#2d6a4f', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, marginTop: 8, minWidth: 200, alignItems: 'center',
  },
  emptyScanBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyManualBtn: {
    backgroundColor: '#f1f8f3', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, minWidth: 200, alignItems: 'center',
    borderWidth: 1, borderColor: '#b7e4c7',
  },
  emptyManualBtnText: { color: '#2d6a4f', fontWeight: '700', fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  gardenName: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  plantCount: { fontSize: 13, color: '#6b705c', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { backgroundColor: '#ffb703', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#1b1b1b', fontWeight: '700', fontSize: 13 },
  scanBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f1f8f3', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#b7e4c7',
  },
  scanBtnText: { fontSize: 20 },
  deleteBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff5f5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#f4bfc0',
  },
  deleteBtnText: { fontSize: 18 },
  companionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f1f8f3', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#b7e4c7',
  },
  companionBtnActive: {
    backgroundColor: '#2d6a4f', borderColor: '#2d6a4f',
  },
  companionBtnText: { fontSize: 20 },
  waterBanner: {
    backgroundColor: '#e0f0ff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#90c8f0',
  },
  waterBannerText: { fontSize: 13, fontWeight: '600', color: '#0a558c' },
  companionLegend: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#f0faf4',
    borderBottomWidth: 1, borderBottomColor: '#b7e4c7',
    gap: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDash: { width: 22, height: 3, borderRadius: 2 },
  legendGood: { backgroundColor: '#2d6a4f' },
  legendBad:  { backgroundColor: '#e63946' },
  legendText: { fontSize: 12, color: '#1b4332', fontWeight: '600' },
  legendHint: { fontSize: 11, color: '#6b705c', fontStyle: 'italic' },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#d8f3dc', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2d6a4f', gap: 8,
  },
  bannerLeft: { flex: 1 },
  bannerText: { fontSize: 13, color: '#1b4332', fontWeight: '600' },
  bannerExtra: { fontSize: 11, color: '#2d6a4f', marginTop: 1 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bannerSkip: { fontSize: 13, color: '#6b705c', fontWeight: '600' },
  bannerCancel: { fontSize: 18, color: '#e63946', fontWeight: '700' },
  hintBar: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  hintText: { fontSize: 11, color: '#aaa', textAlign: 'center' },
  mapWrapper: { flex: 1, overflow: 'hidden' },
  scrollOuter: { flex: 1 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 34 },
  fabMenu: {
    position: 'absolute', bottom: 80, right: 16,
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 8,
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6,
    minWidth: 200,
  },
  fabMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  fabMenuIcon: { fontSize: 22 },
  fabMenuLabel: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  // Plant search
  plantSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e9ecef',
  },
  plantSearchEmoji: { fontSize: 26, width: 36, textAlign: 'center' },
  plantSearchInfo: { flex: 1 },
  plantSearchName: { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  plantSearchSpecies: { fontSize: 12, color: '#6b705c', fontStyle: 'italic' },
  seasonChip: {
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#f1f8f3', borderRadius: 12,
    borderWidth: 1, borderColor: '#b7e4c7', marginRight: 8, gap: 4,
  },
  seasonChipEmoji: { fontSize: 22 },
  seasonChipLabel: { fontSize: 11, fontWeight: '600', color: '#2d6a4f' },
  // Boundary picker
  boundaryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    justifyContent: 'center', marginVertical: 8,
  },
  boundaryBtn: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa', minWidth: 80,
  },
  boundaryBtnEmoji: { fontSize: 24, marginBottom: 4 },
  boundaryBtnLabel: { fontSize: 12, color: '#1b4332', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14, paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  modalSubtitle: { fontSize: 13, color: '#6b705c', marginTop: -8 },
  modalInput: {
    backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1b4332',
  },
  modalInputNotes: { fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa', gap: 4,
  },
  typeBtnActive: { borderColor: '#2d6a4f', backgroundColor: '#d8f3dc' },
  typeBtnIcon: { fontSize: 18 },
  typeBtnLabel: { fontSize: 11, color: '#6b705c', fontWeight: '600' },
  typeBtnLabelActive: { color: '#2d6a4f' },
  colorLabel: { fontSize: 13, fontWeight: '600', color: '#6b705c' },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18, marginRight: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchSelected: { borderColor: '#1b4332', transform: [{ scale: 1.2 }] },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: '#6b705c', fontWeight: '600', fontSize: 15 },
  modalConfirmBtn: {
    flex: 2, backgroundColor: '#2d6a4f', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalConfirmBtnDisabled: { backgroundColor: '#ccc' },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadingOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', gap: 16,
  },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  diseaseResultText: { fontSize: 15, color: '#1b4332', lineHeight: 23 },
});

const menuStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28, overflow: 'hidden' },
  header: { backgroundColor: '#1b4332', paddingHorizontal: 20, paddingVertical: 16, marginBottom: 6 },
  plantName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  plantSpecies: { fontSize: 13, color: '#b7e4c7', fontStyle: 'italic', marginTop: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e9ecef', gap: 14,
  },
  itemDanger: { borderBottomWidth: 0 },
  itemIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e9ecef' },
  itemLabel: { fontSize: 16, color: '#1b4332', fontWeight: '500', flex: 1 },
  itemLabelDanger: { fontSize: 16, color: '#e63946', fontWeight: '500', flex: 1 },
  chevron: { fontSize: 12, color: '#aaa' },
  colorRow: { marginLeft: 20, marginBottom: 4 },
  colorRowContent: { paddingRight: 20, gap: 10, paddingVertical: 8 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: '#1b4332', transform: [{ scale: 1.2 }] },
  noteArea: { marginHorizontal: 20, marginBottom: 4, gap: 8 },
  noteInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1b4332',
    minHeight: 72, textAlignVertical: 'top',
  },
  noteSaveBtn: {
    backgroundColor: '#2d6a4f', borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  noteSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: '#f1f8f3', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#b7e4c7',
  },
  cancelText: { fontSize: 16, color: '#2d6a4f', fontWeight: '700' },
});

export default MapScreen;
