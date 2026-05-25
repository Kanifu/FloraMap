/**
 * PlantDatabaseScreen — Issue #29
 * Plantendatabase: zoeken en direct toevoegen zonder scan.
 *
 * De gebruiker kan planten zoeken op naam of categorie,
 * en ze direct toevoegen aan de kaart zonder camera of Gemini.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TextInput, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGardenStore } from '@/store/gardenStore';
import {
  PlantEntry,
  PLANT_DATABASE,
  PLANT_CATEGORIES,
  searchPlantDatabase,
} from '@/data/plantDatabase';
import { Plant, MaintenanceTask } from '@/models';

const newId = () => `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

function makePlantFromEntry(entry: PlantEntry, gardenId: string): Plant {
  const id = newId();
  const tasks: MaintenanceTask[] = [];

  // Water task
  tasks.push({
    id: `${Date.now()}-w`,
    plantId: id,
    type: 'water',
    dueDate: addDays(1),
    intervalDays: entry.waterIntervalDays,
  });

  // Fertilize task (if applicable)
  if (entry.fertilizeIntervalDays) {
    tasks.push({
      id: `${Date.now()}-f`,
      plantId: id,
      type: 'fertilize',
      dueDate: addDays(14),
      intervalDays: entry.fertilizeIntervalDays,
    });
  }

  return {
    id,
    gardenId,
    species: entry.species,
    commonName: entry.commonName,
    x: 1,
    y: 1,
    z: 0,
    width: 1,
    height: 1,
    plantedDate: new Date().toISOString(),
    maintenanceTasks: tasks,
    identificationConfidence: 1,
    careTips: entry.careTips,
    harvestMonths: entry.harvestMonths,
    addedVia: 'manual',
    notes: entry.sow ? `Zaaitip: ${entry.sow}` : undefined,
  };
}

interface PlantDetailModalProps {
  plant: PlantEntry | null;
  onClose: () => void;
  onAdd: (plant: PlantEntry) => void;
  adding: boolean;
}

function PlantDetailModal({ plant, onClose, onAdd, adding }: PlantDetailModalProps) {
  if (!plant) return null;
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.detailCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <Text style={styles.detailEmoji}>{plant.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{plant.commonName}</Text>
                <Text style={styles.detailSpecies}>{plant.species}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick stats */}
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statIcon}>💧</Text>
                <Text style={styles.statLabel}>Elke {plant.waterIntervalDays} dgn</Text>
              </View>
              {plant.fertilizeIntervalDays && (
                <View style={styles.statChip}>
                  <Text style={styles.statIcon}>🌱</Text>
                  <Text style={styles.statLabel}>Mest elke {plant.fertilizeIntervalDays} dgn</Text>
                </View>
              )}
              <View style={styles.statChip}>
                <Text style={styles.statIcon}>☀️</Text>
                <Text style={styles.statLabel}>
                  {plant.sunRequirement === 'vol' ? 'Volle zon' :
                   plant.sunRequirement === 'half' ? 'Halfschaduw' : 'Schaduw'}
                </Text>
              </View>
            </View>

            {/* Harvest months */}
            {plant.harvestMonths && plant.harvestMonths.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🍽️ Oogstperiode</Text>
                <Text style={styles.sectionText}>
                  {plant.harvestMonths.map((m) => monthNames[m]).join(', ')}
                </Text>
              </View>
            )}

            {/* Sow tip */}
            {plant.sow && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌱 Zaaitip</Text>
                <Text style={styles.sectionText}>{plant.sow}</Text>
              </View>
            )}

            {/* Care tips */}
            {plant.careTips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💡 Verzorgingstips</Text>
                {plant.careTips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Add button */}
          <TouchableOpacity
            style={[styles.addBtn, adding && styles.addBtnDisabled]}
            onPress={() => onAdd(plant)}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#1a3c2b" />
            ) : (
              <Text style={styles.addBtnText}>➕ Toevoegen aan tuin</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PlantDatabaseScreen() {
  const navigation = useNavigation();
  const { garden, addPlant } = useGardenStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PlantEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const results = useMemo(() => {
    if (query.trim()) return searchPlantDatabase(query);
    if (activeCategory) return PLANT_DATABASE.filter((p) => p.category === activeCategory);
    return PLANT_DATABASE;
  }, [query, activeCategory]);

  const handleAdd = useCallback(async (entry: PlantEntry) => {
    if (!garden) {
      Alert.alert('Geen tuin', 'Maak eerst een tuin aan op de kaart.');
      return;
    }
    setAdding(true);
    try {
      const plant = makePlantFromEntry(entry, garden.id);
      addPlant(plant);
      setSelectedPlant(null);
      Alert.alert(
        'Toegevoegd! 🌱',
        `${entry.commonName} is toegevoegd aan je tuin. Je vindt hem op de kaart op positie (1,1) — sleep hem naar de juiste plek.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setAdding(false);
    }
  }, [garden, addPlant, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plantendatabase</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(t) => { setQuery(t); setActiveCategory(null); }}
          placeholder="Zoek een plant..."
          placeholderTextColor="#7a9e8a"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      {!query.trim() && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
          <TouchableOpacity
            style={[styles.catChip, !activeCategory && styles.catChipActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={styles.catEmoji}>🌾</Text>
            <Text style={[styles.catLabel, !activeCategory && styles.catLabelActive]}>Alles</Text>
          </TouchableOpacity>
          {PLANT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
              onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[styles.catLabel, activeCategory === cat.id && styles.catLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.plantRow}
            onPress={() => setSelectedPlant(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.plantEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.plantName}>{item.commonName}</Text>
              <Text style={styles.plantSpecies}>{item.species}</Text>
            </View>
            <View style={styles.plantMeta}>
              <Text style={styles.plantMetaText}>💧 {item.waterIntervalDays}d</Text>
              <Text style={styles.plantMetaText}>
                {item.sunRequirement === 'vol' ? '☀️' : item.sunRequirement === 'half' ? '⛅' : '🌥️'}
              </Text>
            </View>
            <Text style={styles.plantArrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>Geen planten gevonden</Text>
            <Text style={styles.emptySubText}>Probeer een andere zoekterm</Text>
          </View>
        }
      />

      {/* Detail modal */}
      <PlantDetailModal
        plant={selectedPlant}
        onClose={() => setSelectedPlant(null)}
        onAdd={handleAdd}
        adding={adding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8f0eb',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: '#2d6a4f' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a3c2b' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#c8e6d0',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a3c2b' },
  clearBtn: { fontSize: 14, color: '#7a9e8a', padding: 4 },
  catScroll: { maxHeight: 52 },
  catRow: { paddingHorizontal: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#c8e6d0',
  },
  catChipActive: { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#2d6a4f' },
  catLabelActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24, gap: 8 },
  plantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e8f0eb',
  },
  plantEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  plantName: { fontSize: 15, fontWeight: '700', color: '#1a3c2b' },
  plantSpecies: { fontSize: 12, color: '#7a9e8a', fontStyle: 'italic', marginTop: 2 },
  plantMeta: { alignItems: 'flex-end', gap: 2 },
  plantMetaText: { fontSize: 12, color: '#7a9e8a' },
  plantArrow: { fontSize: 20, color: '#c8e6d0', marginLeft: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#2d6a4f' },
  emptySubText: { fontSize: 13, color: '#7a9e8a', marginTop: 4 },
  // Detail modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  detailEmoji: { fontSize: 40 },
  detailName: { fontSize: 20, fontWeight: '800', color: '#1a3c2b' },
  detailSpecies: { fontSize: 13, color: '#7a9e8a', fontStyle: 'italic', marginTop: 2 },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 16, color: '#7a9e8a' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0f7f3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  statIcon: { fontSize: 14 },
  statLabel: { fontSize: 12, color: '#2d6a4f', fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1a3c2b', marginBottom: 6 },
  sectionText: { fontSize: 14, color: '#4a7c5e', lineHeight: 20 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tipBullet: { fontSize: 14, color: '#2d6a4f', lineHeight: 20 },
  tipText: { flex: 1, fontSize: 14, color: '#4a7c5e', lineHeight: 20 },
  addBtn: {
    backgroundColor: '#2d6a4f', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
