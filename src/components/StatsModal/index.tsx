import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Pressable,
} from 'react-native';
import { useGardenStore } from '@/store/gardenStore';
import { ACHIEVEMENTS } from '@/data/achievements';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PLANT_EMOJI_HINTS: Record<string, string> = {
  tomaat: '🍅', komkommer: '🥒', paprika: '🫑', sla: '🥬', wortel: '🥕',
  aardappel: '🥔', ui: '🧅', courgette: '🥒', basilicum: '🌿', aardbei: '🍓',
};
const getPlantEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(PLANT_EMOJI_HINTS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌿';
};

const TASK_ICON_LABEL: Record<string, { icon: string; label: string }> = {
  water:     { icon: '💧', label: 'Begieten' },
  fertilize: { icon: '🌱', label: 'Bemesten' },
  prune:     { icon: '✂️', label: 'Snoeien' },
  repot:     { icon: '🪴', label: 'Verpotten' },
  treat:     { icon: '🩹', label: 'Behandelen' },
};

export function StatsModal({ visible, onClose }: Props): React.JSX.Element {
  const garden               = useGardenStore((s) => s.garden);
  const gardenStats          = useGardenStore((s) => s.gardenStats);
  const unlockedAchievements = useGardenStore((s) => s.unlockedAchievements);

  const plants = garden?.plants ?? [];
  const totalPlants    = plants.length;
  const totalCompleted = plants.reduce((sum, p) => sum + p.maintenanceTasks.filter((t) => !!t.completedDate).length, 0);
  const activeTasks    = plants.reduce((sum, p) => sum + p.maintenanceTasks.filter((t) => !t.completedDate).length, 0);
  const totalHarvestGrams = plants.reduce((sum, p) =>
    sum + (p.harvestLog ?? []).reduce((s, e) => s + (e.weightG ?? 0), 0), 0);

  const harvestRanking = plants
    .map((p) => ({ id: p.id, name: p.commonName, emoji: getPlantEmoji(p.commonName),
      totalGrams: (p.harvestLog ?? []).reduce((s, e) => s + (e.weightG ?? 0), 0) }))
    .filter((p) => p.totalGrams > 0)
    .sort((a, b) => b.totalGrams - a.totalGrams)
    .slice(0, 5);

  const taskTypeCounts: Record<string, number> = {};
  for (const p of plants) {
    for (const t of p.maintenanceTasks) {
      if (t.completedDate) taskTypeCounts[t.type] = (taskTypeCounts[t.type] ?? 0) + 1;
    }
  }
  const taskTypeEntries = Object.entries(taskTypeCounts).sort((a, b) => b[1] - a[1]);
  const maxTaskCount = taskTypeEntries.length > 0 ? taskTypeEntries[0][1] : 1;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>📊 Statistieken & prestaties</Text>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tuin overzicht */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🌳 Tuin overzicht</Text>
              <View style={s.statRow}>
                <View style={s.statCard}><Text style={s.statValue}>{totalPlants}</Text><Text style={s.statLabel}>Planten</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{totalCompleted}</Text><Text style={s.statLabel}>Taken afgerond</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{activeTasks}</Text><Text style={s.statLabel}>Open taken</Text></View>
              </View>
              <View style={s.harvestRow}>
                <Text style={s.harvestLabel}>🍓 Totale oogst</Text>
                <Text style={s.harvestValue}>{totalHarvestGrams > 0 ? `${totalHarvestGrams}g` : 'Nog niets geoogst'}</Text>
              </View>
            </View>

            {/* Streak */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔥 Activiteit</Text>
              <View style={s.streakCard}>
                <Text style={s.streakMain}>{gardenStats.currentStreak > 0 ? '🔥 ' : ''}{gardenStats.currentStreak} {gardenStats.currentStreak === 1 ? 'dag actief' : 'dagen actief'}</Text>
                <Text style={s.streakSub}>Record: {gardenStats.longestStreak} dagen</Text>
                <Text style={s.streakSub}>{gardenStats.totalTasksCompleted} taken afgerond</Text>
              </View>
            </View>

            {/* Achievements — full list with locked/unlocked state */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>🏆 Prestaties ({Object.keys(unlockedAchievements).length}/{ACHIEVEMENTS.length})</Text>
              <View style={s.badgesWrap}>
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = !!unlockedAchievements[a.id];
                  return (
                    <View key={a.id} style={[s.badgeChip, !unlocked && s.badgeChipLocked]}>
                      <Text style={[s.badgeEmoji, !unlocked && s.badgeEmojiLocked]}>{a.emoji}</Text>
                      <View>
                        <Text style={[s.badgeName, !unlocked && s.badgeNameLocked]}>{a.title}</Text>
                        <Text style={s.badgeDesc}>{a.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Oogstranking */}
            {harvestRanking.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>🏆 Oogstranking</Text>
                {harvestRanking.map((item, idx) => (
                  <View key={item.id} style={s.rankRow}>
                    <Text style={s.rankNum}>#{idx + 1}</Text>
                    <Text style={s.rankEmoji}>{item.emoji}</Text>
                    <Text style={s.rankName}>{item.name}</Text>
                    <Text style={s.rankGrams}>{item.totalGrams}g</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Taken per type */}
            {taskTypeEntries.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>📊 Taken per type (afgerond)</Text>
                {taskTypeEntries.map(([type, count]) => {
                  const info = TASK_ICON_LABEL[type] ?? { icon: '🔧', label: type };
                  const pct = count / maxTaskCount;
                  return (
                    <View key={type} style={s.barRow}>
                      <Text style={s.barIcon}>{info.icon}</Text>
                      <Text style={s.barLabel}>{info.label}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { flex: pct }]} />
                        <View style={{ flex: 1 - pct }} />
                      </View>
                      <Text style={s.barCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={s.closeBtnText}>Sluiten</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: 240 },
  handle:       { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:        { fontSize: 20, fontWeight: '700', color: '#1b4332', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  scroll:       {},   // no flex:1 — ScrollView sizes to content up to maxHeight of parent
  scrollContent:{ padding: 16, paddingBottom: 8 },
  section:      { backgroundColor: '#f8f9fa', borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef', padding: 14, marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1b4332', marginBottom: 4 },
  statRow:      { flexDirection: 'row', gap: 8 },
  statCard:     { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef', padding: 12, alignItems: 'center', gap: 4 },
  statValue:    { fontSize: 24, fontWeight: '700', color: '#2d6a4f' },
  statLabel:    { fontSize: 11, color: '#6b705c', fontWeight: '600', textAlign: 'center' },
  harvestRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff9e6', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ffe08a' },
  harvestLabel: { fontSize: 14, fontWeight: '600', color: '#7c5a00' },
  harvestValue: { fontSize: 14, fontWeight: '700', color: '#7c5a00' },
  streakCard:   { backgroundColor: '#d8f3dc', borderRadius: 10, padding: 12, gap: 4 },
  streakMain:   { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  streakSub:    { fontSize: 13, color: '#2d6a4f' },
  badgesWrap:      { gap: 8 },
  badgeChip:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f8f3', borderRadius: 12, borderWidth: 1, borderColor: '#b7e4c7', paddingHorizontal: 12, paddingVertical: 8 },
  badgeChipLocked: { backgroundColor: '#f8f9fa', borderColor: '#e9ecef', opacity: 0.6 },
  badgeEmoji:      { fontSize: 22 },
  badgeEmojiLocked:{ opacity: 0.35 },
  badgeName:       { fontSize: 13, fontWeight: '700', color: '#1b4332' },
  badgeNameLocked: { color: '#aaa' },
  badgeDesc:       { fontSize: 11, color: '#6b705c', marginTop: 1 },
  emptyHint:       { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  rankRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e9ecef' },
  rankNum:      { fontSize: 13, fontWeight: '700', color: '#aaa', width: 24 },
  rankEmoji:    { fontSize: 20 },
  rankName:     { flex: 1, fontSize: 14, fontWeight: '600', color: '#1b4332' },
  rankGrams:    { fontSize: 14, fontWeight: '700', color: '#2d6a4f' },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  barIcon:      { fontSize: 16, width: 22, textAlign: 'center' },
  barLabel:     { fontSize: 12, fontWeight: '600', color: '#6b705c', width: 72 },
  barTrack:     { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#e9ecef', flexDirection: 'row', overflow: 'hidden' },
  barFill:      { backgroundColor: '#2d6a4f', borderRadius: 5 },
  barCount:     { fontSize: 13, fontWeight: '700', color: '#1b4332', width: 28, textAlign: 'right' },
  closeBtn:     { margin: 16, backgroundColor: '#2d6a4f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
