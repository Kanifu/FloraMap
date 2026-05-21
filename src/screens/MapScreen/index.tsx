import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { GardenMap, CELL_CM } from '@/components/GardenMap';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { Plant, ZONE_COLORS } from '@/models';
import { gardenAssistantService, IdentifiedPlant } from '@/services/GardenAssistantService';

type MapNavProp = StackNavigationProp<MapStackParamList, 'Map'>;
type DrawStep = 'first' | 'second';

// ── helpers ─────────────────────────────────────────────────────────────────

const newId = () => `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makePlantFromScan = (identified: IdentifiedPlant, gardenId: string, x: number, y: number): Plant => {
  const id = newId();
  return {
    id, gardenId,
    species: identified.species,
    commonName: identified.commonName,
    x, y, z: 0,
    width: 1, height: 1,
    plantedDate: new Date().toISOString(),
    maintenanceTasks: [{
      id: `task-${Date.now()}`,
      plantId: id,
      type: 'water',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }],
    identificationConfidence: identified.confidence,
    careTips: identified.careTips ?? [],
  };
};

// ── component ────────────────────────────────────────────────────────────────

const MapScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MapNavProp>();
  const garden     = useGardenStore((s) => s.garden);
  const removePlant = useGardenStore((s) => s.removePlant);
  const updatePlant = useGardenStore((s) => s.updatePlant);
  const addPlant    = useGardenStore((s) => s.addPlant);

  // ── plant move ────────────────────────────────────────────────────────────
  const [movingPlant, setMovingPlant] = useState<Plant | null>(null);

  // ── draw / resize ─────────────────────────────────────────────────────────
  const [drawStep,   setDrawStep]   = useState<DrawStep | null>(null);
  const [firstPoint, setFirstPoint] = useState<{ x: number; y: number } | null>(null);
  // null = creating a new plant; Plant = resizing an existing one
  const [drawTarget, setDrawTarget] = useState<Plant | null>(null);

  // ── new-plant modal ───────────────────────────────────────────────────────
  const [showModal,   setShowModal]   = useState(false);
  const [modalName,   setModalName]   = useState('');
  const [modalColor,  setModalColor]  = useState(ZONE_COLORS[0]);
  const [pendingBounds, setPendingBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── quick-scan (tap-to-place queue) ──────────────────────────────────────
  const [scanning,      setScanning]      = useState(false);
  const [plantsToPlace, setPlantsToPlace] = useState<IdentifiedPlant[]>([]);

  const isInteractive =
    !!movingPlant || !!drawStep || plantsToPlace.length > 0;

  // ── overdue badge ─────────────────────────────────────────────────────────
  const pendingTaskCount = useMemo(() => {
    if (!garden) return 0;
    const now = new Date().toISOString();
    return garden.plants.reduce((acc, p) =>
      acc + p.maintenanceTasks.filter((t) => !t.completedDate && t.dueDate < now).length, 0);
  }, [garden]);

  // ── banner ────────────────────────────────────────────────────────────────
  const bannerInfo = useMemo(() => {
    if (plantsToPlace.length > 0) {
      const next = plantsToPlace[0];
      return {
        text: `Tik op de kaart om ${next.commonName} te plaatsen`,
        extra: `${plantsToPlace.length} over`,
        onCancel: () => setPlantsToPlace([]),
        onSkip: () => setPlantsToPlace((q) => q.slice(1)),
      };
    }
    if (movingPlant) return {
      text: `Tik op de kaart om ${movingPlant.commonName} te verplaatsen`,
      onCancel: () => setMovingPlant(null),
    };
    if (drawStep === 'first' && !drawTarget) return {
      text: 'Tik op het startpunt van de nieuwe plant of zone',
      onCancel: cancelDraw,
    };
    if (drawStep === 'first' && drawTarget) return {
      text: `Tik op het startpunt voor ${drawTarget.commonName}`,
      onCancel: cancelDraw,
    };
    if (drawStep === 'second') return {
      text: 'Tik op het eindpunt (tegenovergestelde hoek)',
      onCancel: cancelDraw,
    };
    return null;
  }, [plantsToPlace, movingPlant, drawStep, drawTarget]);

  const cancelDraw = () => {
    setDrawStep(null);
    setFirstPoint(null);
    setDrawTarget(null);
  };

  // ── map tap ───────────────────────────────────────────────────────────────
  const handleMapPress = useCallback((x: number, y: number) => {
    // Tap-to-place from scan queue
    if (plantsToPlace.length > 0) {
      const [next, ...rest] = plantsToPlace;
      if (garden) addPlant(makePlantFromScan(next, garden.id, x, y));
      setPlantsToPlace(rest);
      return;
    }
    // Move existing plant
    if (movingPlant) {
      updatePlant({ ...movingPlant, x, y });
      setMovingPlant(null);
      return;
    }
    // Draw: first point
    if (drawStep === 'first') {
      setFirstPoint({ x, y });
      setDrawStep('second');
      return;
    }
    // Draw: second point → compute bounds
    if (drawStep === 'second' && firstPoint) {
      const bx = Math.min(firstPoint.x, x);
      const by = Math.min(firstPoint.y, y);
      const bw = Math.abs(x - firstPoint.x) + 1;
      const bh = Math.abs(y - firstPoint.y) + 1;
      setFirstPoint(null);
      setDrawStep(null);

      if (drawTarget) {
        // Resize existing plant
        const color = drawTarget.color ?? ZONE_COLORS[(garden?.plants.length ?? 0) % ZONE_COLORS.length];
        updatePlant({ ...drawTarget, x: bx, y: by, width: bw, height: bh, color });
        setDrawTarget(null);
      } else {
        // New plant/zone — open modal
        setPendingBounds({ x: bx, y: by, width: bw, height: bh });
        setModalColor(ZONE_COLORS[(garden?.plants.length ?? 0) % ZONE_COLORS.length]);
        setModalName('');
        setShowModal(true);
      }
    }
  }, [plantsToPlace, movingPlant, drawStep, firstPoint, drawTarget, garden, addPlant, updatePlant]);

  // ── long-press plant ──────────────────────────────────────────────────────
  const handlePlantLongPress = (plant: Plant) => {
    const isZone = (plant.width ?? 1) > 1 || (plant.height ?? 1) > 1;
    Alert.alert(plant.commonName, undefined, [
      {
        text: 'Verplaatsen',
        onPress: () => setMovingPlant(plant),
      },
      {
        text: isZone ? 'Formaat wijzigen' : 'Uitrekken tot zone',
        onPress: () => { setDrawTarget(plant); setDrawStep('first'); },
      },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Verwijderen', `${plant.commonName} uit je tuin verwijderen?`, [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Verwijderen', style: 'destructive', onPress: () => removePlant(plant.id) },
          ]),
      },
      { text: 'Annuleren', style: 'cancel' },
    ]);
  };

  // ── confirm new plant/zone from modal ─────────────────────────────────────
  const handleConfirmModal = () => {
    if (!pendingBounds || !modalName.trim() || !garden) return;
    const id = newId();
    const isZone = pendingBounds.width > 1 || pendingBounds.height > 1;
    addPlant({
      id,
      gardenId: garden.id,
      species: '',
      commonName: modalName.trim(),
      x: pendingBounds.x,
      y: pendingBounds.y,
      z: 0,
      width: pendingBounds.width,
      height: pendingBounds.height,
      color: isZone ? modalColor : undefined,
      plantedDate: new Date().toISOString(),
      maintenanceTasks: [{
        id: `task-${Date.now()}`,
        plantId: id,
        type: 'water',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }],
      identificationConfidence: 1,
    });
    setShowModal(false);
    setModalName('');
    setPendingBounds(null);
  };

  // ── quick scan ────────────────────────────────────────────────────────────
  const handleScan = async (fromGallery = false) => {
    const result = fromGallery
      ? await ImagePicker.launchImageLibraryAsync({ quality: 0.85 })
      : await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled) return;

    setScanning(true);
    try {
      const gardenPlants = garden?.plants.map(
        (p) => `${p.commonName} (${p.species}) op ${p.x},${p.y}`,
      ) ?? [];
      const response = await gardenAssistantService.chat(
        '', result.assets[0].uri, [], gardenPlants,
      );
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

  // ── empty state ───────────────────────────────────────────────────────────
  if (!garden || garden.plants.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌳</Text>
        <Text style={styles.emptyTitle}>Je tuin is nog leeg</Text>
        <Text style={styles.emptySubtitle}>
          Ga naar de Assistent tab om je eerste plant te scannen, of gebruik de scanknop hierboven.
        </Text>
        <TouchableOpacity style={styles.emptyScanBtn} onPress={handleScanPress} disabled={scanning}>
          {scanning
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.emptyScanBtnText}>📷 Scan planten</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.gardenName}>{garden.name}</Text>
          <Text style={styles.plantCount}>{garden.plants.length} planten</Text>
        </View>
        <View style={styles.headerRight}>
          {pendingTaskCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingTaskCount} verlopen</Text>
            </View>
          )}
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanPress} disabled={scanning}>
            {scanning
              ? <ActivityIndicator size="small" color="#2d6a4f" />
              : <Text style={styles.scanBtnText}>📷</Text>}
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
            {bannerInfo.onSkip && (
              <TouchableOpacity onPress={bannerInfo.onSkip}>
                <Text style={styles.bannerSkip}>Sla over</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={bannerInfo.onCancel}>
              <Text style={styles.bannerCancel}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            1 cel = 30×30 cm · lang indrukken om te bewerken · ＋ voor nieuwe zone
          </Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapWrapper}>
        <ScrollView horizontal style={styles.scrollOuter} bounces={false}>
          <ScrollView bounces={false}>
            <GardenMap
              garden={garden}
              onPlantPress={(p) => navigation.navigate('PlantCard', { plantId: p.id })}
              onPlantLongPress={handlePlantLongPress}
              viewMode="2d"
              isInteractive={isInteractive}
              highlightPoint={drawStep === 'second' ? firstPoint : null}
              movingPlantId={movingPlant?.id}
              onMapPress={handleMapPress}
            />
          </ScrollView>
        </ScrollView>

        {/* FAB */}
        {!isInteractive && (
          <TouchableOpacity style={styles.fab} onPress={() => setDrawStep('first')} activeOpacity={0.85}>
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* New plant/zone modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {pendingBounds && (pendingBounds.width > 1 || pendingBounds.height > 1)
                ? 'Nieuwe zone' : 'Nieuwe plant'}
            </Text>
            {pendingBounds && (
              <Text style={styles.modalSubtitle}>
                {pendingBounds.width} × {pendingBounds.height} vakjes
                {'  '}({pendingBounds.width * CELL_CM} × {pendingBounds.height * CELL_CM} cm)
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

            {/* Color picker — only for zones */}
            {pendingBounds && (pendingBounds.width > 1 || pendingBounds.height > 1) && (
              <>
                <Text style={styles.colorLabel}>Kleur</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {ZONE_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorSwatch, { backgroundColor: c },
                        modalColor === c && styles.colorSwatchSelected]}
                      onPress={() => setModalColor(c)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowModal(false); setModalName(''); setPendingBounds(null); }}>
                <Text style={styles.modalCancelText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !modalName.trim() && styles.modalConfirmBtnDisabled]}
                onPress={handleConfirmModal}
                disabled={!modalName.trim()}>
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
    borderRadius: 14, marginTop: 8, minWidth: 160, alignItems: 'center',
  },
  emptyScanBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  modalSubtitle: { fontSize: 13, color: '#6b705c', marginTop: -8 },
  modalInput: {
    backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1b4332',
  },
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
});

export default MapScreen;
