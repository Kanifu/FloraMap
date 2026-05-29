import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Pressable,
} from 'react-native';
import { FEATURE_CONFIGS, FeatureKey } from '@/hooks/useFeatureFlag';
import { useGardenStore } from '@/store/gardenStore';
import { TIER_RANK } from '@/constants/tiers';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FEATURE_ORDER: FeatureKey[] = [
  'unlimited_plants',
  'unlimited_ai',
  'photo_log_unlimited',
  'harvest_tracking',
  'moon_calendar',
  'frost_notifications',
  'dark_mode',
  'soil_health',
  'multi_garden',
  'pdf_export',
  'crop_rotation',
  'statistics',
  'all_achievements',
];

const TIER_LABELS = ['Gratis', 'Plus ⭐', 'Premium 💎'];
const TIER_KEYS   = ['free', 'plus', 'premium'] as const;
const TIER_COLORS = ['#6b705c', '#2d6a4f', '#1b4332'];
const TIER_BG     = ['#f8f9fa', '#d8f3dc', '#1b4332'];
const TIER_TEXT   = ['#1b4332', '#1b4332', '#fff'];

export function TierComparisonModal({ visible, onClose }: Props): React.JSX.Element {
  const userTier = useGardenStore((s) => s.userTier);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>💎 Abonnementen</Text>

          {/* Tier header row */}
          <View style={s.headerRow}>
            <View style={s.featureCol} />
            {TIER_KEYS.map((tier, i) => (
              <View key={tier} style={[s.tierCol, { backgroundColor: TIER_BG[i] }, userTier === tier && s.tierColActive]}>
                <Text style={[s.tierLabel, { color: TIER_TEXT[i] }]}>{TIER_LABELS[i]}</Text>
                {userTier === tier && (
                  <View style={s.currentBadge}>
                    <Text style={s.currentBadgeText}>Huidig</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            {/* Free tier base */}
            <View style={s.row}>
              <Text style={s.featureText}>Basis tuinkaart</Text>
              {TIER_KEYS.map((_, i) => (
                <View key={i} style={s.tierCell}>
                  <Text style={s.checkIcon}>✓</Text>
                </View>
              ))}
            </View>
            <View style={s.row}>
              <Text style={s.featureText}>Tot 20 planten</Text>
              {TIER_KEYS.map((_, i) => (
                <View key={i} style={s.tierCell}>
                  <Text style={s.checkIcon}>✓</Text>
                </View>
              ))}
            </View>
            <View style={s.row}>
              <Text style={s.featureText}>Onderhoudstaken</Text>
              {TIER_KEYS.map((_, i) => (
                <View key={i} style={s.tierCell}>
                  <Text style={s.checkIcon}>✓</Text>
                </View>
              ))}
            </View>

            {/* Feature rows */}
            {FEATURE_ORDER.map((key) => {
              const cfg = FEATURE_CONFIGS[key];
              return (
                <View key={key} style={s.row}>
                  <Text style={s.featureText}>{cfg.label}</Text>
                  {TIER_KEYS.map((tier, i) => {
                    const included = TIER_RANK[tier] >= TIER_RANK[cfg.requiredTier];
                    return (
                      <View key={tier} style={s.tierCell}>
                        <Text style={included ? s.checkIcon : s.lockIcon}>
                          {included ? '✓' : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          <View style={s.footer}>
            <Text style={s.footerNote}>
              Upgrades zijn beschikbaar via de instellingen. Neem contact op voor meer informatie.
            </Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.closeBtnText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingBottom: 8 },
  handle:     { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:      { fontSize: 20, fontWeight: '700', color: '#1b4332', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerRow:  { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  featureCol: { flex: 2 },
  tierCol:    { flex: 1, alignItems: 'center', borderRadius: 10, padding: 8, marginHorizontal: 2 },
  tierColActive: { borderWidth: 2, borderColor: '#2d6a4f' },
  tierLabel:  { fontSize: 12, fontWeight: '700' },
  currentBadge: { backgroundColor: '#2d6a4f', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  currentBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  scroll:     { paddingHorizontal: 12 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  featureText:{ flex: 2, fontSize: 13, color: '#1b4332' },
  tierCell:   { flex: 1, alignItems: 'center' },
  checkIcon:  { fontSize: 14, color: '#2d6a4f', fontWeight: '700' },
  lockIcon:   { fontSize: 14, color: '#ccc' },
  footer:     { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  footerNote: { fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 10 },
  closeBtn:   { backgroundColor: '#2d6a4f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
