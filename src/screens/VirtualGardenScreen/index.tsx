import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Rect, Ellipse, Text as SvgText, Circle, G } from 'react-native-svg';
import { useGardenStore } from '@/store/gardenStore';
import { useTheme } from '@/hooks/useTheme';

interface GrowthPhase {
  emoji: string;
  label: string;
  taskThreshold: number;
  desc: string;
}

const GROWTH_PHASES: GrowthPhase[] = [
  { emoji: '🌱', label: 'Zaadje',         taskThreshold: 0,   desc: 'Je tuin begint met een klein zaadje vol potentie.' },
  { emoji: '🌿', label: 'Spruit',          taskThreshold: 3,   desc: 'Je plantje begint te groeien. Goed bezig!' },
  { emoji: '🌾', label: 'Jonge plant',     taskThreshold: 7,   desc: 'Je plant staat stevig en krijgt kleur.' },
  { emoji: '🌸', label: 'Bloeiende plant', taskThreshold: 30,  desc: 'Prachtig! Je plant staat in volle bloei.' },
  { emoji: '🏆', label: 'Meesterplant',   taskThreshold: 100, desc: 'Indrukwekkend! Je bent een echte tuinmeester.' },
];

const POT_COLORS = ['#a0714f', '#8b5e3c', '#7a4f2d', '#6b4221', '#5a3618'];

interface PlantPotProps { phaseIndex: number; }

const PlantPot = ({ phaseIndex }: PlantPotProps): React.JSX.Element => {
  const phase   = GROWTH_PHASES[phaseIndex];
  const potFill = POT_COLORS[phaseIndex] ?? POT_COLORS[0];
  const rimFill = POT_COLORS[Math.max(0, phaseIndex - 1)];
  const showGlow = phaseIndex >= 3;

  return (
    <Svg width={200} height={220} viewBox="0 0 200 220">
      {/* Glow for master phases */}
      {showGlow && (
        <G opacity={0.22}>
          <Circle cx={100} cy={120} r={80} fill={phaseIndex >= 4 ? '#ffd700' : '#52b788'} />
        </G>
      )}
      {/* Plant emoji */}
      <SvgText x={100} y={148} textAnchor="middle" fontSize={phaseIndex >= 3 ? 80 : 68}>
        {phase.emoji}
      </SvgText>
      {/* Pot rim */}
      <Rect x={44} y={160} width={112} height={13} rx={6.5} fill={rimFill} />
      {/* Soil surface */}
      <Ellipse cx={100} cy={164} rx={54} ry={8} fill="#2d1a08" opacity={0.75} />
      {/* Pot body (trapezoid) */}
      <Path d="M 50 173 L 36 220 L 164 220 L 150 173 Z" fill={potFill} />
      {/* Pot shadow */}
      <Path d="M 36 220 L 164 220 L 162 215 L 38 215 Z" fill="rgba(0,0,0,0.15)" />
      {/* Decorative dots on pot */}
      {phaseIndex >= 2 && (
        <>
          <Circle cx={80} cy={196} r={4} fill="rgba(255,255,255,0.18)" />
          <Circle cx={100} cy={200} r={3} fill="rgba(255,255,255,0.12)" />
          <Circle cx={120} cy={196} r={4} fill="rgba(255,255,255,0.18)" />
        </>
      )}
    </Svg>
  );
};

const VirtualGardenScreen = (): React.JSX.Element => {
  const theme = useTheme();
  const navigation = useNavigation();
  const totalTasksCompleted = useGardenStore((s) => s.totalTasksCompleted);
  const currentStreak       = useGardenStore((s) => s.currentStreak);
  const totalScans          = useGardenStore((s) => s.totalScans);
  const garden              = useGardenStore((s) => s.garden);

  const drops = totalTasksCompleted * 2 + currentStreak;

  const phaseIndex = GROWTH_PHASES.reduce(
    (best, phase, i) => (totalTasksCompleted >= phase.taskThreshold ? i : best),
    0,
  );
  const currentPhase = GROWTH_PHASES[phaseIndex];
  const nextPhase    = GROWTH_PHASES[phaseIndex + 1];
  const progress     = nextPhase
    ? Math.min(1, (totalTasksCompleted - currentPhase.taskThreshold) / (nextPhase.taskThreshold - currentPhase.taskThreshold))
    : 1;
  const tasksToNext  = nextPhase ? nextPhase.taskThreshold - totalTasksCompleted : 0;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10,
    },
    backBtn: { paddingRight: 4 },
    backText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.primaryDark },
    content: { padding: 20, gap: 18, paddingBottom: 40 },
    potCard: {
      backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.borderLight,
      alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 8,
    },
    phaseLabel: { fontSize: 22, fontWeight: '800', color: theme.primaryDark },
    phaseDesc: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
    progressSection: { gap: 6 },
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    progressVal: { fontSize: 12, color: theme.textMuted },
    progressBar: {
      height: 12, backgroundColor: theme.cardAlt, borderRadius: 6,
      borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 6 },
    maxLabel: { fontSize: 12, color: theme.primary, fontWeight: '600', textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, backgroundColor: theme.primaryBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.borderLight,
      padding: 12, alignItems: 'center', gap: 4,
    },
    statEmoji: { fontSize: 20 },
    statNumber: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },
    statLabel: { fontSize: 10, color: theme.textSecondary, fontWeight: '600', textAlign: 'center' },
    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: theme.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    milestoneCard: {
      backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
      overflow: 'hidden',
    },
    milestoneRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    milestoneBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    milestoneEmoji: { fontSize: 28 },
    milestoneBody: { flex: 1, gap: 2 },
    milestoneLabel: { fontSize: 14, fontWeight: '700', color: theme.primaryDark },
    milestoneSub: { fontSize: 12, color: theme.textSecondary },
    milestoneBadge: {
      backgroundColor: theme.primaryLight, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    milestoneBadgeText: { fontSize: 11, color: theme.primary, fontWeight: '700' },
    milestoneLockedBadge: { backgroundColor: theme.cardAlt },
    milestoneLockedText: { color: theme.textMuted },
    infoCard: {
      backgroundColor: theme.primaryBg, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight,
      padding: 14, gap: 6,
    },
    infoTitle: { fontSize: 13, fontWeight: '700', color: theme.primary },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    infoText: { fontSize: 12, color: theme.textSecondary, flex: 1, lineHeight: 18 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Terug</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Virtuele tuin</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Plant pot display */}
        <View style={s.potCard}>
          <PlantPot phaseIndex={phaseIndex} />
          <Text style={s.phaseLabel}>{currentPhase.label}</Text>
          <Text style={s.phaseDesc}>{currentPhase.desc}</Text>
        </View>

        {/* Progress to next phase */}
        <View style={s.progressSection}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>
              {nextPhase ? `Groei naar ${nextPhase.label}` : 'Maximale groei bereikt!'}
            </Text>
            <Text style={s.progressVal}>
              {nextPhase ? `${totalTasksCompleted} / ${nextPhase.taskThreshold} taken` : '🏆'}
            </Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          {nextPhase && tasksToNext > 0 && (
            <Text style={s.maxLabel}>Nog {tasksToNext} {tasksToNext === 1 ? 'taak' : 'taken'} tot de volgende fase</Text>
          )}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>💧</Text>
            <Text style={s.statNumber}>{drops}</Text>
            <Text style={s.statLabel}>Druppels</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>🔥</Text>
            <Text style={s.statNumber}>{currentStreak}</Text>
            <Text style={s.statLabel}>Streak (dagen)</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>📷</Text>
            <Text style={s.statNumber}>{totalScans}</Text>
            <Text style={s.statLabel}>Scans</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>🌱</Text>
            <Text style={s.statNumber}>{garden?.plants.length ?? 0}</Text>
            <Text style={s.statLabel}>Planten</Text>
          </View>
        </View>

        {/* Growth milestones */}
        <Text style={s.sectionTitle}>Groeifasen</Text>
        <View style={s.milestoneCard}>
          {GROWTH_PHASES.map((phase, i) => {
            const isUnlocked = totalTasksCompleted >= phase.taskThreshold;
            const isCurrent  = i === phaseIndex;
            return (
              <View
                key={phase.label}
                style={[s.milestoneRow, i < GROWTH_PHASES.length - 1 && s.milestoneBorder,
                  !isUnlocked && { opacity: 0.45 }]}>
                <Text style={s.milestoneEmoji}>{phase.emoji}</Text>
                <View style={s.milestoneBody}>
                  <Text style={s.milestoneLabel}>{phase.label}</Text>
                  <Text style={s.milestoneSub}>{phase.desc}</Text>
                </View>
                <View style={[s.milestoneBadge, !isUnlocked && s.milestoneLockedBadge]}>
                  <Text style={[s.milestoneBadgeText, !isUnlocked && s.milestoneLockedText]}>
                    {isUnlocked ? (isCurrent ? '⭐ Nu' : '✓') : `${phase.taskThreshold} taken`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* How to earn drops */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>💧 Hoe verdien je druppels?</Text>
          <View style={s.infoRow}>
            <Text>✅</Text>
            <Text style={s.infoText}>+2 druppels voor elke afgeronde onderhoudstaak</Text>
          </View>
          <View style={s.infoRow}>
            <Text>🔥</Text>
            <Text style={s.infoText}>+1 druppel per dag dat je actief bent (streak bonus)</Text>
          </View>
          <View style={s.infoRow}>
            <Text>🌱</Text>
            <Text style={s.infoText}>Je plant groeit automatisch mee met je tuin-activiteit!</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VirtualGardenScreen;
