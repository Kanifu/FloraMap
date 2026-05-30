import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Pressable,
} from 'react-native';
import { useGardenStore } from '@/store/gardenStore';
import { ACHIEVEMENTS } from '@/data/achievements';
import { useTheme } from '@/hooks/useTheme';

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
  const theme = useTheme();

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

  const s = StyleSheet.create({
    backdrop:     { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
    sheet:        { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: 240 },
    handle:       { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    title:        { fontSize: 20, fontWeight: '700', color: theme.primaryDark, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    scroll:       {},
    scrollContent:{ padding: 16, paddingBottom: 8 },
    section:      { backgroundColor: theme.cardAlt, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12, gap: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.primaryDark, marginBottom: 4 },
    statRow:      { flexDirection: 'row', gap: 8 },
    statCard:     { flex: 1, backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 12, alignItems: 'center', gap: 4 },
    statValue:    { fontSize: 24, fontWeight: '700', color: theme.primary },
    statLabel:    { fontSize: 11, color: theme.textSecondary, fontWeight: '600', textAlign: 'center' },
    harvestRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.warningLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.warning },
    harvestLabel: { fontSize: 14, fontWeight: '600', color: theme.warning },
    harvestValue: { fontSize: 14, fontWeight: '700', color: theme.warning },
    streakCard:   { backgroundColor: theme.primaryLight, borderRadius: 10, padding: 12, gap: 4 },
    streakMain:   { fontSize: 18, fontWeight: '700', color: theme.primaryDark },
    streakSub:    { fontSize: 13, color: theme.primary },
    badgesWrap:      { gap: 8 },
    badgeChip:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.primaryBg, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight, paddingHorizontal: 12, paddingVertical: 8 },
    badgeChipLocked: { backgroundColor: theme.cardAlt, borderColor: theme.border, opacity: 0.6 },
    badgeEmoji:      { fontSize: 22 },
    badgeEmojiLocked:{ opacity: 0.35 },
    badgeName:       { fontSize: 13, fontWeight: '700', color: theme.primaryDark },
    badgeNameLocked: { color: theme.textMuted },
    badgeDesc:       { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
    emptyHint:       { fontSize: 13, color: theme.textMuted, fontStyle: 'italic' },
    rankRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.border },
    rankNum:      { fontSize: 13, fontWeight: '700', color: theme.textMuted, width: 24 },
    rankEmoji:    { fontSize: 20 },
    rankName:     { flex: 1, fontSize: 14, fontWeight: '600', color: theme.primaryDark },
    rankGrams:    { fontSize: 14, fontWeight: '700', color: theme.primary },
    barRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    barIcon:      { fontSize: 16, width: 22, textAlign: 'center' },
    barLabel:     { fontSize: 12, fontWeight: '600', color: theme.textSecondary, width: 72 },
    barTrack:     { flex: 1, height: 10, borderRadius: 5, backgroundColor: theme.border, flexDirection: 'row', overflow: 'hidden' },
    barFill:      { backgroundColor: theme.primary, borderRadius: 5 },
    barCount:     { fontSize: 13, fontWeight: '700', color: theme.primaryDark, width: 28, textAlign: 'right' },
    closeBtn:     { margin: 16, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });

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
