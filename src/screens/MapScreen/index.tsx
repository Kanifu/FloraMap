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
import { Plant, PlantAddedVia, ZONE_COLORS, MaintenanceTask, Garden } from '@/models';
import { gardenAssistantService, IdentifiedPlant, createInitialTasksForPlant } from '@/services/GardenAssistantService';
import { OnboardingModal } from '@/components/OnboardingModal';
import { findCompanionPairs, CompanionPair } from '@/data/companionPlanting';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

const ONBOARDED_KEY = 'floramap_onboarded';

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
  const menuStyles = makeMenuStyles(theme);
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
  const styles = makeStyles(theme);
  const corrStyles = makeCorrStyles(theme);
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
  const [showOnboarding,       setShowOnboarding]       = useState(false);
  const [showCompanionOverlay, setShowCompanionOverlay] = useState(false);

  // Ensure a garden always exists on mount so the map is never blocked
  useEffect(() => {
    if (!garden) {
      setGarden({
        id: `garden-${Date.now()}`,
        userId: 'local',
        name: 'Mijn tuin',
        polygons: [],
        plants: [],
        tasks: [],
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const ensureGarden = useCallback((): Garden => {
    const current = useGardenStore.getState().garden;
    if (current) return current;
    const g: Garden = {
      id: `garden-${Date.now()}`,
      userId: 'local',
      name: 'Mijn tuin',
      polygons: [],
      plants: [],
      tasks: [],
    };
    setGarden(g);
    return g;
  }, [setGarden]);

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
  const isEmpty = !garden || garden.plants.length === 0;

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

  const currentGarden = garden ?? {
    id: 'temp', userId: 'local', name: 'Mijn tuin',
    polygons: [], plants: [], tasks: [],
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.gardenName}>{currentGarden.name}</Text>
          <Text style={styles.plantCount}>
            {currentGarden.plants.length === 0
              ? 'Lege tuin — voeg je eerste plant toe'
              : `${currentGarden.plants.length} ${currentGarden.plants.length === 1 ? 'plant' : 'planten'}`}
          </Text>
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
          {!isEmpty && (
            <TouchableOpacity
              style={[styles.companionBtn, showCompanionOverlay && styles.companionBtnActive]}
              onPress={() => setShowCompanionOverlay((v) => !v)}>
              <Text style={styles.companionBtnText}>🌿</Text>
            </TouchableOpacity>
          )}
          {!isEmpty && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => Alert.alert(
                'Tuin verwijderen',
                'Wil je de hele tuin wissen? Dit kan niet ongedaan worden gemaakt.',
                [
                  { text: 'Annuleren', style: 'cancel' },
                  { text: 'Verwijderen', style: 'destructive', onPress: () => clearGarden() },
                ],
              )}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Banner / hint bar */}
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
      ) : !isEmpty ? (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>1 cel = 30×30 cm · lang indrukken om te bewerken · ＋ voor nieuwe zone</Text>
        </View>
      ) : null}

      {/* Companion legend */}
      {showCompanionOverlay && !isEmpty && (
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

      {/* Map — always visible */}
      <View style={styles.mapWrapper}>
        <ScrollView horizontal style={styles.scrollOuter} bounces={false}>
          <ScrollView bounces={false}>
            <GardenMap
              garden={currentGarden}
              onPlantPress={(p) => navigation.navigate('PlantCard', { plantId: p.id })}
              onPlantLongPress={(p) => setMenuPlant(p)}
              viewMode="2d"
              isInteractive={isInteractive}
              highlightPoint={drawStep === 'second' ? firstPoint : null}
              movingPlantId={movingPlant?.id}
              onMapPress={isInteractive ? handleMapPress : undefined}
              companionPairs={companionPairs}
              showCompanionOverlay={showCompanionOverlay}
              thirstyPlantIds={thirstyPlantIds}
            />
          </ScrollView>
        </ScrollView>

        {/* Empty-state overlay — shown on top of the (empty) map */}
        {isEmpty && !isInteractive && (
          <View style={styles.emptyOverlay} pointerEvents="box-none">
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardIcon}>🌱</Text>
              <Text style={styles.emptyCardTitle}>Je tuin is nog leeg</Text>
              <Text style={styles.emptyCardSubtitle}>
                Scan een foto om planten te herkennen, of tik op ＋ om handmatig toe te voegen.
              </Text>
              <TouchableOpacity style={styles.emptyCardScanBtn} onPress={handleScanPress} disabled={scanning}>
                {scanning
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.emptyCardScanBtnText}>📷 Scan planten</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FAB — always visible when not in interactive mode */}
        {!isInteractive && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => { ensureGarden(); setDrawStep('first'); }}
            activeOpacity={0.85}>
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>
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
                onPress={() => { setShowModal(false); setModalName(''); setModalNotes(''); setPendingBounds(null); }}>
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

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: t.border,
    backgroundColor: t.card,
  },
  gardenName: { fontSize: 20, fontWeight: '700', color: t.primaryDark },
  plantCount: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { backgroundColor: t.warning, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#1b1b1b', fontWeight: '700', fontSize: 13 },
  scanBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: t.primaryLighter, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.borderLight,
  },
  scanBtnText: { fontSize: 20 },
  deleteBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: t.dangerLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.dangerBorder,
  },
  deleteBtnText: { fontSize: 18 },
  companionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: t.primaryLighter, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.borderLight,
  },
  companionBtnActive: {
    backgroundColor: t.primary, borderColor: t.primary,
  },
  companionBtnText: { fontSize: 20 },
  waterBanner: {
    backgroundColor: t.infoLight, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: t.infoBorder,
  },
  waterBannerText: { fontSize: 13, fontWeight: '600', color: t.info },
  companionLegend: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: t.primaryLighter,
    borderBottomWidth: 1, borderBottomColor: t.borderLight,
    gap: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDash: { width: 22, height: 3, borderRadius: 2 },
  legendGood: { backgroundColor: t.primary },
  legendBad:  { backgroundColor: t.danger },
  legendText: { fontSize: 12, color: t.primaryDark, fontWeight: '600' },
  legendHint: { fontSize: 11, color: t.textSecondary, fontStyle: 'italic' },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.primaryLight, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: t.primary, gap: 8,
  },
  bannerLeft: { flex: 1 },
  bannerText: { fontSize: 13, color: t.primaryDark, fontWeight: '600' },
  bannerExtra: { fontSize: 11, color: t.primary, marginTop: 1 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bannerSkip: { fontSize: 13, color: t.textSecondary, fontWeight: '600' },
  bannerCancel: { fontSize: 18, color: t.danger, fontWeight: '700' },
  hintBar: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border,
  },
  hintText: { fontSize: 11, color: t.textMuted, textAlign: 'center' },
  mapWrapper: { flex: 1, overflow: 'hidden' },
  scrollOuter: { flex: 1 },
  // Empty overlay — sits on top of the map grid
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyCard: {
    backgroundColor: t.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: t.border,
  },
  emptyCardIcon: { fontSize: 52 },
  emptyCardTitle: { fontSize: 20, fontWeight: '700', color: t.primaryDark, textAlign: 'center' },
  emptyCardSubtitle: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCardScanBtn: {
    backgroundColor: t.primary, paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 14, marginTop: 6, minWidth: 180, alignItems: 'center',
  },
  emptyCardScanBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 34 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14, paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: t.primaryDark },
  modalSubtitle: { fontSize: 13, color: t.textSecondary, marginTop: -8 },
  modalInput: {
    backgroundColor: t.background, borderRadius: 12, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: t.text,
  },
  modalInputNotes: { fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: t.border,
    backgroundColor: t.background, gap: 4,
  },
  typeBtnActive: { borderColor: t.primary, backgroundColor: t.primaryLight },
  typeBtnIcon: { fontSize: 18 },
  typeBtnLabel: { fontSize: 11, color: t.textSecondary, fontWeight: '600' },
  typeBtnLabelActive: { color: t.primary },
  colorLabel: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18, marginRight: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchSelected: { borderColor: t.primaryDark, transform: [{ scale: 1.2 }] },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: t.textSecondary, fontWeight: '600', fontSize: 15 },
  modalConfirmBtn: {
    flex: 2, backgroundColor: t.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalConfirmBtnDisabled: { backgroundColor: t.textMuted },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const makeMenuStyles = (t: Theme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28, overflow: 'hidden' },
  header: { backgroundColor: t.primaryDark, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 6 },
  plantName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  plantSpecies: { fontSize: 13, color: t.borderLight, fontStyle: 'italic', marginTop: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border, gap: 14,
  },
  itemDanger: { borderBottomWidth: 0 },
  itemIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: t.border },
  itemLabel: { fontSize: 16, color: t.primaryDark, fontWeight: '500', flex: 1 },
  itemLabelDanger: { fontSize: 16, color: t.danger, fontWeight: '500', flex: 1 },
  chevron: { fontSize: 12, color: t.textMuted },
  colorRow: { marginLeft: 20, marginBottom: 4 },
  colorRowContent: { paddingRight: 20, gap: 10, paddingVertical: 8 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: t.primaryDark, transform: [{ scale: 1.2 }] },
  noteArea: { marginHorizontal: 20, marginBottom: 4, gap: 8 },
  noteInput: {
    backgroundColor: t.background, borderRadius: 10, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: t.text,
    minHeight: 72, textAlignVertical: 'top',
  },
  noteSaveBtn: {
    backgroundColor: t.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  noteSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: t.primaryLighter, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: t.borderLight,
  },
  cancelText: { fontSize: 16, color: t.primary, fontWeight: '700' },
});

const makeCorrStyles = (t: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '70%' },
  handle: { width: 36, height: 4, backgroundColor: t.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: t.primaryDark, marginBottom: 4 },
  lowConf: { fontSize: 12, color: '#e85d04', marginBottom: 12, backgroundColor: '#fff3e0', padding: 8, borderRadius: 8 },
  label: { fontSize: 12, fontWeight: '600', color: t.textSecondary, marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: t.borderLight, borderRadius: 10, padding: 10, fontSize: 15, color: t.text, backgroundColor: t.background },
  confirmBtn: { marginTop: 16, backgroundColor: t.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  skipBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  skipText: { color: t.textMuted, fontSize: 13 },
});

export default MapScreen;
