/**
 * SideMenu — drawer / zijmenu
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, ScrollView, Dimensions,
} from 'react-native';

const PANEL_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);

interface MenuRow {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  plantCount: number;
  showCompanion: boolean;
  showNames: boolean;
  onToggleCompanion: () => void;
  onToggleNames: () => void;
  onOpenAssistant: () => void;
  onOpenMaintenance: () => void;
  onOpenSeedInventory: () => void;
  onOpenAbout: () => void;
  onOpenStats: () => void;
  onOpenVirtualGarden: () => void;
  onOpenTierComparison: () => void;
  onReportBug: () => void;
  onClearGarden: () => void;
  onDeleteGarden: () => void;
  onCreateGarden: () => void;
  onOpenGardenPicker: () => void;
  unlockedBadgeCount: number;
  recentBadgeEmojis: string[];
  // kept for backward compat — badge chip now opens stats
  onOpenAchievements: () => void;
  // kept for backward compat — scan moved to FAB
  onScan?: () => void;
}

export function SideMenu(props: SideMenuProps): React.JSX.Element {
  const {
    visible, onClose, plantCount, showCompanion, showNames,
    onToggleCompanion, onToggleNames,
    onOpenAssistant, onOpenMaintenance, onOpenAbout, onOpenSeedInventory,
    onOpenStats, onOpenTierComparison, onOpenVirtualGarden,
    onReportBug, onClearGarden, onDeleteGarden,
    onCreateGarden, onOpenGardenPicker,
    unlockedBadgeCount, recentBadgeEmojis,
  } = props;

  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 0 : -PANEL_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const run = (fn: () => void) => () => { onClose(); setTimeout(fn, 180); };

  const sections: { title: string; rows: MenuRow[] }[] = [
    {
      title: 'Weergave',
      rows: [
        { icon: '🌿', label: 'Companion planting', sub: 'Toon goede/slechte buren', onPress: onToggleCompanion, active: showCompanion },
        { icon: showNames ? '🏷️' : '👁️', label: 'Plantnamen', sub: showNames ? 'Namen zichtbaar' : 'Namen verborgen', onPress: onToggleNames, active: showNames },
      ],
    },
    {
      title: 'Ga naar',
      rows: [
        { icon: '📅', label: 'Plannen & onderhoud', sub: 'Taken, planning, log', onPress: run(onOpenMaintenance) },
        { icon: '🌱', label: 'Zaadkast', sub: 'Beheer je zaadvoorraad', onPress: run(onOpenSeedInventory) },
        { icon: '🌳', label: 'Virtuele tuin', sub: 'Je digitale groeiende tuin', onPress: run(onOpenVirtualGarden) },
      ],
    },
    {
      title: 'Tuinbeheer',
      rows: [
        { icon: '🔄', label: 'Wissel van tuin', sub: 'Beheer en wissel tuinen', onPress: run(onOpenGardenPicker) },
        { icon: '🌿', label: 'Nieuwe tuin', sub: 'Balkon, moestuin, siertuin…', onPress: run(onCreateGarden) },
      ],
    },
    {
      title: 'Overig',
      rows: [
        { icon: '🐛', label: 'Bug melden', sub: 'Stuur feedback of een foutmelding', onPress: run(onReportBug) },
        { icon: '🧹', label: 'Tuin leegmaken', sub: 'Verwijder alle planten', onPress: run(onClearGarden), danger: true },
        { icon: '🗑️', label: 'Tuin verwijderen', sub: 'Definitief verwijderen', onPress: run(onDeleteGarden), danger: true },
        { icon: 'ℹ️', label: 'Over FloraMap', sub: 'Versie, backup & abonnementen', onPress: run(onOpenAbout) },
      ],
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View style={[s.panel, { transform: [{ translateX: slide }] }]}>
          <Pressable style={s.panelInner} onPress={() => {}}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.headerIcon}>🌻</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>Mijn tuin</Text>
                <Text style={s.headerSub}>{plantCount} {plantCount === 1 ? 'plant' : 'planten'}</Text>
              </View>
              {unlockedBadgeCount > 0 && (
                <TouchableOpacity style={s.badgeChip} onPress={run(onOpenStats)} activeOpacity={0.8}>
                  <Text style={s.badgeChipEmojis}>{recentBadgeEmojis.slice(0, 3).join('')}</Text>
                  <Text style={s.badgeChipCount}>{unlockedBadgeCount} 🏆</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Scrollable content — flex:1 ensures it fills remaining space */}
            <ScrollView
              style={s.scrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={s.scroll}
              bounces={false}>
              {sections.map((section) => (
                <View key={section.title} style={s.section}>
                  <Text style={s.sectionLabel}>{section.title}</Text>
                  {section.rows.map((row) => (
                    <TouchableOpacity
                      key={row.label}
                      style={[s.row, row.active && s.rowActive]}
                      onPress={row.onPress}
                      activeOpacity={0.7}>
                      <Text style={s.rowIcon}>{row.icon}</Text>
                      <View style={s.rowText}>
                        <Text style={[s.rowLabel, row.danger && s.rowLabelDanger, row.active && s.rowLabelActive]}>
                          {row.label}
                        </Text>
                        {row.sub ? <Text style={s.rowSub}>{row.sub}</Text> : null}
                      </View>
                      {row.active !== undefined && (
                        <View style={[s.toggle, row.active && s.toggleOn]}>
                          <View style={[s.knob, row.active && s.knobOn]} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row' },
  panel:           { width: PANEL_WIDTH, height: '100%' },
  panelInner:      { flex: 1, backgroundColor: '#fff' },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1b4332', paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20 },
  headerIcon:      { fontSize: 34 },
  headerTitle:     { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub:       { fontSize: 13, color: '#b7e4c7', marginTop: 2 },
  badgeChip:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  badgeChipEmojis: { fontSize: 14 },
  badgeChipCount:  { fontSize: 11, color: '#b7e4c7', fontWeight: '700', marginTop: 1 },
  scrollView:      { flex: 1 },   // ← critical: lets ScrollView fill remaining height
  scroll:          { paddingVertical: 8, paddingBottom: 48 },
  section:         { marginTop: 12 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: '#95a99c', textTransform: 'uppercase', letterSpacing: 0.7, paddingHorizontal: 20, marginBottom: 4 },
  row:             { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  rowActive:       { backgroundColor: '#f1f8f3' },
  rowIcon:         { fontSize: 22, width: 26, textAlign: 'center' },
  rowText:         { flex: 1 },
  rowLabel:        { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  rowLabelActive:  { color: '#2d6a4f' },
  rowLabelDanger:  { color: '#c1121f' },
  rowSub:          { fontSize: 12, color: '#8a958c', marginTop: 1 },
  toggle:          { width: 40, height: 24, borderRadius: 12, backgroundColor: '#d8e3da', padding: 2, justifyContent: 'center' },
  toggleOn:        { backgroundColor: '#2d6a4f' },
  knob:            { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn:          { alignSelf: 'flex-end' },
});
