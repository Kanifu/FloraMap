import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaintenanceStackParamList } from '@/navigation/AppNavigator';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useGardenStore } from '@/store/gardenStore';
import { Garden } from '@/models';
import { useTheme } from '@/hooks/useTheme';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ACHIEVEMENTS } from '@/data/achievements';
import { UpgradeModal } from '@/components/UpgradeModal';
import { FREE_PLANT_LIMIT, FEATURE_CONFIGS } from '@/hooks/useFeatureFlag';
import type { Tier } from '@/constants/tiers';

// Single source of truth: all values come from app.json → expo.extra
const extra      = Constants.expoConfig?.extra ?? {};
const VERSION    = (Constants.expoConfig?.version ?? '?') as string;
const BUILD_LABEL = (extra.buildLabel ?? '?') as string;
const BUILD_DATE  = (extra.buildDate  ?? '?') as string;

const SECTIONS = [
  {
    title: 'Over FloraMap',
    items: [
      { label: 'Versie', value: `v${VERSION}` },
      { label: 'Build', value: `#${BUILD_LABEL} · ${BUILD_DATE}` },
      { label: 'Platform', value: 'React Native · Expo SDK 52' },
      { label: 'AI-model', value: 'Google Gemini 2.5 Flash' },
      { label: 'Weerdata', value: 'Open-Meteo (gratis, geen sleutel)' },
    ],
  },
  {
    title: 'Licentie',
    items: [
      { label: 'Type', value: 'MIT License' },
      { label: 'Auteursrecht', value: `© ${new Date().getFullYear()} Jordy Zinkstok` },
    ],
  },
  {
    title: 'Open source bibliotheken',
    items: [
      { label: 'React Native', value: '0.76' },
      { label: 'Expo', value: 'SDK 52' },
      { label: 'React Navigation', value: 'v7' },
      { label: 'Zustand', value: 'v5' },
      { label: 'react-native-svg', value: '15.8' },
      { label: 'expo-notifications', value: '~0.28' },
      { label: 'expo-image-picker', value: '~16.0' },
      { label: 'expo-location', value: '~17.0' },
    ],
  },
];

const DEVELOPER_LINKS = [
  { label: '💼 LinkedIn — Jordy Zinkstok', url: 'https://linkedin.com/in/jordyzinkstok' },
  { label: '✉️ jordyzinkstok@gmail.com', url: 'mailto:jordyzinkstok@gmail.com' },
];

const LINKS = [
  { label: '🔒 Privacybeleid', url: 'https://kanifu.github.io/floramap-web/privacy-policy.html' },
  { label: '🌐 Open-Meteo weer API', url: 'https://open-meteo.com' },
  { label: '🤖 Google Gemini API', url: 'https://ai.google.dev' },
];

const AboutScreen = (): React.JSX.Element => {
  const navigation = useNavigation<StackNavigationProp<MaintenanceStackParamList>>();
  const garden = useGardenStore((s) => s.garden);
  const setGarden = useGardenStore((s) => s.setGarden);
  const unlockedAchievements = useGardenStore((s) => s.unlockedAchievements);
  const currentStreak = useGardenStore((s) => s.currentStreak);
  const totalTasksCompleted = useGardenStore((s) => s.totalTasksCompleted);
  const userTier = useGardenStore((s) => s.userTier);
  const setUserTier = useGardenStore((s) => s.setUserTier);
  const [importing, setImporting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: { width: 70 },
    backText: { fontSize: 16, color: theme.primary, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.primaryDark },
    content: { padding: 20, gap: 20, paddingBottom: 40 },
    hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
    heroIcon: { fontSize: 56 },
    heroName: { fontSize: 28, fontWeight: '800', color: theme.primaryDark },
    heroTagline: { fontSize: 14, color: theme.textSecondary },
    versionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    versionPill: {
      backgroundColor: theme.primaryLight,
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
    },
    versionPillText: { fontSize: 13, fontWeight: '700', color: theme.primary },
    buildPill: {
      backgroundColor: theme.primaryDark,
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
    },
    buildPillText: { fontSize: 13, fontWeight: '700', color: theme.primaryLight },
    buildDate: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    buildHash: { fontSize: 11, color: theme.textMuted, fontFamily: 'monospace' },
    section: { gap: 8 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: theme.cardAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    rowLeft: { flex: 1, gap: 2 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowLabel: { fontSize: 14, color: theme.primaryDark, fontWeight: '500' },
    rowSub: { fontSize: 12, color: theme.textMuted },
    rowValue: { fontSize: 14, color: theme.textSecondary, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
    linkChevron: { fontSize: 20, color: theme.textMuted },
    feedbackBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: theme.primaryBg, borderRadius: 16,
      borderWidth: 1, borderColor: theme.borderLight,
      paddingHorizontal: 18, paddingVertical: 16, marginBottom: 8,
    },
    feedbackBtnIcon: { fontSize: 28 },
    feedbackBtnTitle: { fontSize: 15, fontWeight: '700', color: theme.primaryDark },
    feedbackBtnSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    footer: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 8,
    },
    // Achievements
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, backgroundColor: theme.primaryBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.borderLight,
      padding: 14, alignItems: 'center', gap: 4,
    },
    statNumber: { fontSize: 24, fontWeight: '800', color: theme.primaryDark },
    statLabel: { fontSize: 11, color: theme.textSecondary, fontWeight: '600', textAlign: 'center' },
    achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    achievementBadge: {
      width: '30%', backgroundColor: theme.card, borderRadius: 12,
      borderWidth: 1, borderColor: theme.border,
      padding: 10, alignItems: 'center', gap: 4,
    },
    achievementBadgeLocked: { opacity: 0.35 },
    achievementEmoji: { fontSize: 24 },
    achievementTitle: { fontSize: 10, fontWeight: '700', color: theme.primaryDark, textAlign: 'center' },
    achievementDate: { fontSize: 9, color: theme.textMuted, textAlign: 'center' },
    // Tier
    tierCard: {
      backgroundColor: theme.primaryBg, borderRadius: 16,
      borderWidth: 1, borderColor: theme.borderLight,
      padding: 16, gap: 10,
    },
    tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tierBadge: {
      fontSize: 13, fontWeight: '700', color: '#d97706',
      backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20,
    },
    tierBadgePremium: { color: '#7c3aed', backgroundColor: '#ede9fe' },
    tierBadgePlus: { color: '#d97706', backgroundColor: '#fef3c7' },
    tierBadgeFree: { color: theme.primary, backgroundColor: theme.primaryLight },
    tierLabel: { fontSize: 15, fontWeight: '700', color: theme.primaryDark },
    tierSub: { fontSize: 12, color: theme.textSecondary },
    tierProgress: {
      height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden',
    },
    tierProgressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 3 },
    tierUpgradeBtn: {
      backgroundColor: theme.primary, borderRadius: 12,
      paddingVertical: 12, alignItems: 'center',
    },
    tierUpgradeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    tierDebugRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    tierDebugBtn: {
      flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
    },
    tierDebugBtnActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
    tierDebugBtnText: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
    tierDebugBtnTextActive: { color: theme.primary },
  });

  // ── Backup export ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!garden) {
      Alert.alert('Geen tuin', 'Er is nog geen tuindata om te exporteren.');
      return;
    }
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Delen niet beschikbaar', 'Delen wordt niet ondersteund op dit apparaat.');
      return;
    }
    try {
      const json = JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), garden }, null, 2);
      const fileUri = `${FileSystem.cacheDirectory}floramap-backup.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'FloraMap backup exporteren',
      });
    } catch {
      Alert.alert('Exporteren mislukt', 'Kon de backup niet aanmaken.');
    }
  };

  // ── Backup import ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(raw);

      // Basic validation
      const importedGarden: Garden = parsed.garden ?? parsed;
      if (!importedGarden.id || !Array.isArray(importedGarden.plants)) {
        Alert.alert('Ongeldig bestand', 'Dit bestand bevat geen geldige FloraMap-data.');
        return;
      }

      Alert.alert(
        'Backup importeren',
        `Wil je de tuindata van "${importedGarden.name}" importeren? Je huidige tuin wordt overschreven.`,
        [
          { text: 'Annuleren', style: 'cancel' },
          {
            text: 'Importeren',
            style: 'destructive',
            onPress: () => {
              setGarden(importedGarden);
              Alert.alert('Gelukt! 🌿', 'Je tuin is hersteld vanuit de backup.');
            },
          },
        ],
      );
    } catch {
      Alert.alert('Importeren mislukt', 'Kon het bestand niet lezen. Controleer of het een geldig FloraMap-backup is.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Terug</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Over FloraMap</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App identity */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🌿</Text>
          <Text style={styles.heroName}>FloraMap</Text>
          <Text style={styles.heroTagline}>Jouw slimme tuinplanner</Text>
          <View style={styles.versionRow}>
            <View style={styles.versionPill}>
              <Text style={styles.versionPillText}>v{VERSION}</Text>
            </View>
            <View style={styles.buildPill}>
              <Text style={styles.buildPillText}>Build #{BUILD_LABEL}</Text>
            </View>
          </View>
          <Text style={styles.buildDate}>{BUILD_DATE}</Text>
          <Text style={styles.buildHash}>
            {`versionCode ${Constants.expoConfig?.android?.versionCode ?? '?'}`}
          </Text>
        </View>

        {/* Tier / subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement</Text>
          <View style={styles.tierCard}>
            <View style={styles.tierRow}>
              <Text style={[
                styles.tierBadge,
                userTier === 'premium' ? styles.tierBadgePremium :
                userTier === 'plus' ? styles.tierBadgePlus : styles.tierBadgeFree,
              ]}>
                {userTier === 'premium' ? '💎 Premium' : userTier === 'plus' ? '⭐ Plus' : '🆓 Gratis'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierLabel}>
                  {userTier === 'free' ? 'Gratis tier' : userTier === 'plus' ? 'Plus-abonnement' : 'Premium-abonnement'}
                </Text>
              </View>
            </View>
            {userTier === 'free' && (
              <>
                <Text style={styles.tierSub}>
                  Planten: {garden?.plants.length ?? 0} / {FREE_PLANT_LIMIT}
                </Text>
                <View style={styles.tierProgress}>
                  <View style={[
                    styles.tierProgressFill,
                    { width: `${Math.min(100, ((garden?.plants.length ?? 0) / FREE_PLANT_LIMIT) * 100)}%` as any },
                  ]} />
                </View>
                <TouchableOpacity
                  style={styles.tierUpgradeBtn}
                  onPress={() => setShowUpgradeModal(true)}>
                  <Text style={styles.tierUpgradeBtnText}>Upgraden naar Plus →</Text>
                </TouchableOpacity>
              </>
            )}
            {/* Dev-only tier switcher — remove before production */}
            <Text style={[styles.tierSub, { marginTop: 4 }]}>Tier wisselen (testmodus):</Text>
            <View style={styles.tierDebugRow}>
              {(['free', 'plus', 'premium'] as Tier[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierDebugBtn, userTier === t && styles.tierDebugBtnActive]}
                  onPress={() => setUserTier(t)}>
                  <Text style={[styles.tierDebugBtnText, userTier === t && styles.tierDebugBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Backup & Restore */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gegevens</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={handleExport}
              activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>💾 Backup exporteren</Text>
                <Text style={styles.rowSub}>Sla je tuin op als JSON-bestand</Text>
              </View>
              <Text style={styles.linkChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={handleImport}
              disabled={importing}
              activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>📂 Backup importeren</Text>
                <Text style={styles.rowSub}>Herstel tuin vanuit een JSON-bestand</Text>
              </View>
              <Text style={styles.linkChevron}>{importing ? '⏳' : '›'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Virtual garden entry */}
        <TouchableOpacity
          style={styles.feedbackBtn}
          onPress={() => navigation.navigate('VirtualGarden')}>
          <Text style={styles.feedbackBtnIcon}>🌱</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.feedbackBtnTitle}>Virtuele tuin</Text>
            <Text style={styles.feedbackBtnSub}>Bekijk hoe je plant groeit met je activiteit</Text>
          </View>
          <Text style={styles.linkChevron}>›</Text>
        </TouchableOpacity>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Prestaties ({Object.keys(unlockedAchievements).length}/{ACHIEVEMENTS.length})
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentStreak > 0 ? `🔥 ${currentStreak}` : '—'}</Text>
              <Text style={styles.statLabel}>Dag streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalTasksCompleted}</Text>
              <Text style={styles.statLabel}>Taken voltooid</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{garden?.plants.length ?? 0}</Text>
              <Text style={styles.statLabel}>Planten</Text>
            </View>
          </View>
          <View style={styles.achievementGrid}>
            {ACHIEVEMENTS.map((achievement) => {
              const unlockedAt = unlockedAchievements[achievement.id];
              return (
                <View
                  key={achievement.id}
                  style={[styles.achievementBadge, !unlockedAt && styles.achievementBadgeLocked]}>
                  <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  {unlockedAt && (
                    <Text style={styles.achievementDate}>
                      {new Date(unlockedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View
                  key={item.label}
                  style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ontwikkelaar</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Naam</Text>
              <Text style={styles.rowValue}>Jordy Zinkstok</Text>
            </View>
            {DEVELOPER_LINKS.map((link, i) => (
              <TouchableOpacity
                key={link.url}
                style={[styles.row, i < DEVELOPER_LINKS.length - 1 && styles.rowBorder]}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.7}>
                <Text style={styles.rowLabel}>{link.label}</Text>
                <Text style={styles.linkChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links</Text>
          <View style={styles.card}>
            {LINKS.map((link, i) => (
              <TouchableOpacity
                key={link.url}
                style={[styles.row, i < LINKS.length - 1 && styles.rowBorder]}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.7}>
                <Text style={styles.rowLabel}>{link.label}</Text>
                <Text style={styles.linkChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback button */}
        <TouchableOpacity style={styles.feedbackBtn} onPress={() => setShowFeedback(true)}>
          <Text style={styles.feedbackBtnIcon}>📣</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.feedbackBtnTitle}>Feedback of bug melden</Text>
            <Text style={styles.feedbackBtnSub}>Helpt ons FloraMap te verbeteren</Text>
          </View>
          <Text style={styles.linkChevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          FloraMap gebruikt AI om planten te herkennen en verzorgingsadvies te geven.
          Controleer altijd zelf of informatie klopt voor jouw specifieke situatie.
        </Text>
      </ScrollView>

      <FeedbackModal visible={showFeedback} onClose={() => setShowFeedback(false)} />
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureLabel={FEATURE_CONFIGS.unlimited_plants.label}
        featureDescription="Upgrade naar Plus voor onbeperkt planten en meer."
        requiredTier="plus"
      />
    </SafeAreaView>
  );
};

export default AboutScreen;
