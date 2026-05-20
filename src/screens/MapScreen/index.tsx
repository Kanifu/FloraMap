import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CELL_CM } from '@/components/GardenMap';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGardenStore } from '@/store/gardenStore';
import { GardenMap } from '@/components/GardenMap';
import { MapStackParamList } from '@/navigation/AppNavigator';
import { Plant, PlantZone, ZONE_COLORS } from '@/models';

type MapNavProp = StackNavigationProp<MapStackParamList, 'Map'>;
type DrawMode = 'idle' | 'first-point' | 'second-point';

const MapScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MapNavProp>();
  const garden = useGardenStore((s) => s.garden);
  const removePlant = useGardenStore((s) => s.removePlant);
  const updatePlant = useGardenStore((s) => s.updatePlant);
  const addZone = useGardenStore((s) => s.addZone);
  const updateZone = useGardenStore((s) => s.updateZone);
  const removeZone = useGardenStore((s) => s.removeZone);

  // Plant move state
  const [movingPlant, setMovingPlant] = useState<Plant | null>(null);

  // Zone draw state
  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [firstPoint, setFirstPoint] = useState<{ x: number; y: number } | null>(null);

  // Zone move state
  const [movingZone, setMovingZone] = useState<PlantZone | null>(null);

  // Zone name/color modal
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0]);

  const pendingTaskCount = useMemo(() => {
    if (!garden) return 0;
    const now = new Date().toISOString();
    return garden.plants.reduce((acc, plant) => {
      const overdue = plant.maintenanceTasks.filter(
        (t) => !t.completedDate && t.dueDate < now,
      ).length;
      return acc + overdue;
    }, 0);
  }, [garden]);

  const isInteractive = !!movingPlant || !!movingZone || drawMode !== 'idle';

  // ── Banner text / cancel ──────────────────────────────────────────────────
  const bannerInfo = useMemo(() => {
    if (movingPlant) return { text: `Tik op de kaart om ${movingPlant.commonName} te verplaatsen`, onCancel: () => setMovingPlant(null) };
    if (movingZone) return { text: `Tik op het nieuwe startpunt van ${movingZone.commonName}`, onCancel: () => setMovingZone(null) };
    if (drawMode === 'first-point') return { text: 'Tik op het startpunt van de zone', onCancel: () => setDrawMode('idle') };
    if (drawMode === 'second-point') return { text: 'Tik op het eindpunt van de zone', onCancel: () => { setDrawMode('idle'); setFirstPoint(null); } };
    return null;
  }, [movingPlant, movingZone, drawMode]);

  // ── Map tap handler ───────────────────────────────────────────────────────
  const handleMapPress = (x: number, y: number) => {
    if (movingPlant) {
      updatePlant({ ...movingPlant, x, y });
      setMovingPlant(null);
    } else if (movingZone) {
      updateZone({ ...movingZone, x, y });
      setMovingZone(null);
    } else if (drawMode === 'first-point') {
      setFirstPoint({ x, y });
      setDrawMode('second-point');
    } else if (drawMode === 'second-point' && firstPoint) {
      const bx = Math.min(firstPoint.x, x);
      const by = Math.min(firstPoint.y, y);
      const bw = Math.abs(x - firstPoint.x) + 1;
      const bh = Math.abs(y - firstPoint.y) + 1;
      setPendingBounds({ x: bx, y: by, width: bw, height: bh });
      setDrawMode('idle');
      setFirstPoint(null);
      // Auto-pick next color
      const usedCount = garden?.zones?.length ?? 0;
      setZoneColor(ZONE_COLORS[usedCount % ZONE_COLORS.length]);
      setShowZoneModal(true);
    }
  };

  // ── Plant long-press ──────────────────────────────────────────────────────
  const handlePlantLongPress = (plant: Plant) => {
    Alert.alert(plant.commonName, 'Wat wil je doen?', [
      { text: 'Verplaatsen', onPress: () => setMovingPlant(plant) },
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

  // ── Zone long-press ───────────────────────────────────────────────────────
  const handleZoneLongPress = (zone: PlantZone) => {
    Alert.alert(zone.commonName, 'Wat wil je doen?', [
      { text: 'Verplaatsen', onPress: () => setMovingZone(zone) },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Zone verwijderen', `Zone "${zone.commonName}" verwijderen?`, [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Verwijderen', style: 'destructive', onPress: () => removeZone(zone.id) },
          ]),
      },
      { text: 'Annuleren', style: 'cancel' },
    ]);
  };

  // ── Plant press (navigate) ────────────────────────────────────────────────
  const handlePlantPress = (plant: Plant) => {
    navigation.navigate('PlantCard', { plantId: plant.id });
  };

  // ── Confirm new zone ──────────────────────────────────────────────────────
  const handleConfirmZone = () => {
    if (!pendingBounds || !zoneName.trim() || !garden) return;
    addZone({
      id: `zone-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      gardenId: garden.id,
      commonName: zoneName.trim(),
      x: pendingBounds.x,
      y: pendingBounds.y,
      width: pendingBounds.width,
      height: pendingBounds.height,
      color: zoneColor,
    });
    setShowZoneModal(false);
    setZoneName('');
    setPendingBounds(null);
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!garden || (garden.plants.length === 0 && (garden.zones ?? []).length === 0)) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🌳</Text>
        <Text style={styles.emptyTitle}>Je tuin is nog leeg</Text>
        <Text style={styles.emptySubtitle}>
          Ga naar de Assistent tab om je eerste plant te scannen en toe te voegen.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.gardenName}>{garden.name}</Text>
          <Text style={styles.plantCount}>
            {garden.plants.length} planten · {(garden.zones ?? []).length} zones
          </Text>
        </View>
        {pendingTaskCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingTaskCount} verlopen</Text>
          </View>
        )}
      </View>

      {/* Interactive mode banner */}
      {bannerInfo ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{bannerInfo.text}</Text>
          <TouchableOpacity onPress={bannerInfo.onCancel}>
            <Text style={styles.bannerCancel}>Annuleer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>1 cel = 30 × 30 cm · lang indrukken om te bewerken · scroll om de kaart te verkennen</Text>
        </View>
      )}

      {/* Map — scrollable in both directions */}
      <View style={styles.mapWrapper}>
        <ScrollView horizontal style={styles.scrollOuter} bounces={false}>
          <ScrollView bounces={false} style={styles.scrollInner}>
            <GardenMap
              garden={garden}
              onPlantPress={handlePlantPress}
              onPlantLongPress={handlePlantLongPress}
              onZoneLongPress={handleZoneLongPress}
              viewMode="2d"
              isInteractive={isInteractive}
              highlightPoint={drawMode === 'second-point' ? firstPoint : null}
              movingPlantId={movingPlant?.id}
              movingZoneId={movingZone?.id}
              onMapPress={handleMapPress}
            />
          </ScrollView>
        </ScrollView>

        {/* FAB — add zone (floats over the scroll area) */}
        {!isInteractive && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setDrawMode('first-point')}
            activeOpacity={0.85}>
            <Text style={styles.fabText}>＋ Zone</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Zone creation modal */}
      <Modal visible={showZoneModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Nieuwe zone</Text>
            {pendingBounds && (
              <Text style={styles.modalSubtitle}>
                {pendingBounds.width} × {pendingBounds.height} vakjes
                {'  '}({pendingBounds.width * CELL_CM} × {pendingBounds.height * CELL_CM} cm)
              </Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Naam van de plant of groep…"
              placeholderTextColor="#aaa"
              value={zoneName}
              onChangeText={setZoneName}
              autoFocus
              returnKeyType="done"
            />

            {/* Color picker */}
            <Text style={styles.colorLabel}>Kleur</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {ZONE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, zoneColor === c && styles.colorSwatchSelected]}
                  onPress={() => setZoneColor(c)}
                />
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowZoneModal(false); setZoneName(''); setPendingBounds(null); }}>
                <Text style={styles.modalCancelText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !zoneName.trim() && styles.modalConfirmBtnDisabled]}
                onPress={handleConfirmZone}
                disabled={!zoneName.trim()}>
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
    backgroundColor: '#fff', padding: 32, gap: 12,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
  emptySubtitle: { fontSize: 15, color: '#6b705c', textAlign: 'center', lineHeight: 22 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  gardenName: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  plantCount: { fontSize: 13, color: '#6b705c', marginTop: 2 },
  badge: { backgroundColor: '#ffb703', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#1b1b1b', fontWeight: '700', fontSize: 13 },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#d8f3dc', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2d6a4f', gap: 8,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#1b4332', fontWeight: '600' },
  bannerCancel: { fontSize: 13, color: '#e63946', fontWeight: '700' },
  hintBar: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  hintText: { fontSize: 11, color: '#aaa', textAlign: 'center' },
  mapWrapper: { flex: 1, overflow: 'hidden' },
  scrollOuter: { flex: 1 },
  scrollInner: { flex: 1 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#2d6a4f', paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 28, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Modal
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
  colorRow: { flexGrow: 0 },
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
