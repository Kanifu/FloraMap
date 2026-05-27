/**
 * SideMenu — drawer / zijmenu (#60)
 *
 * Alles is centraal bereikbaar vanuit de tuin-tab. Eén ☰ knop opent dit
 * zijmenu met alle secundaire acties, weergave-toggles en navigatie, zodat
 * de tuin-header niet langer volstaat met losse knoppen.
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
  onScan: () => void;
  onOpenAssistant: () => void;
  onOpenMaintenance: () => void;
  onOpenSeedInventory: () => void;
  onOpenAbout: () => void;
  onReportBug: () => void;
  onClearGarden: () => void;
}

export function SideMenu(props: SideMenuProps): React.JSX.Element {
  const {
    visible, onClose, plantCount, showCompanion, showNames,
    onToggleCompanion, onToggleNames, onScan, onOpenAssistant,
    onOpenMaintenance, onOpenSeedInventory, onOpenAbout, onReportBug, onClearGarden,
  } = props;

  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 0 : -PANEL_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  // Run a menu action then close the drawer
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
      title: 'Acties',
      rows: [
        { icon: '📷', label: 'Plant scannen', sub: 'Camera, galerij of database', onPress: run(onScan) },
        { icon: '🌱', label: 'Zaadkast', sub: 'Beheer je zaden', onPress: run(onOpenSeedInventory) },
      ],
    },
    {
      title: 'Ga naar',
      rows: [
        { icon: '💬', label: 'Assistent', sub: 'Vraag de AI-tuinhulp', onPress: run(onOpenAssistant) },
        { icon: '📅', label: 'Plannen & onderhoud', sub: 'Taken, planning, geschiedenis', onPress: run(onOpenMaintenance) },
        { icon: 'ℹ️', label: 'Over FloraMap', sub: 'Versie, backup & info', onPress: run(onOpenAbout) },
      ],
    },
    {
      title: 'Overig',
      rows: [
        { icon: '🐛', label: 'Bug melden', sub: 'Stuur feedback of een foutmelding', onPress: run(onReportBug) },
        { icon: '🗑️', label: 'Tuin wissen', sub: 'Verwijder alle planten', onPress: run(onClearGarden), danger: true },
      ],
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View style={[s.panel, { transform: [{ translateX: slide }] }]}>
          <Pressable style={s.panelInner} onPress={() => {}}>
            <View style={s.header}>
              <Text style={s.headerIcon}>🌻</Text>
              <View>
                <Text style={s.headerTitle}>Mijn tuin</Text>
                <Text style={s.headerSub}>{plantCount} {plantCount === 1 ? 'plant' : 'planten'}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
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
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row' },
  panel:       { width: PANEL_WIDTH, height: '100%' },
  panelInner:  { flex: 1, backgroundColor: '#fff' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1b4332', paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20 },
  headerIcon:  { fontSize: 34 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: '#b7e4c7', marginTop: 2 },
  scroll:      { paddingVertical: 8, paddingBottom: 40 },
  section:     { marginTop: 12 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: '#95a99c', textTransform: 'uppercase', letterSpacing: 0.7, paddingHorizontal: 20, marginBottom: 4 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  rowActive:   { backgroundColor: '#f1f8f3' },
  rowIcon:     { fontSize: 22, width: 26, textAlign: 'center' },
  rowText:     { flex: 1 },
  rowLabel:    { fontSize: 15, fontWeight: '600', color: '#1b4332' },
  rowLabelActive: { color: '#2d6a4f' },
  rowLabelDanger: { color: '#c1121f' },
  rowSub:      { fontSize: 12, color: '#8a958c', marginTop: 1 },
  toggle:      { width: 40, height: 24, borderRadius: 12, backgroundColor: '#d8e3da', padding: 2, justifyContent: 'center' },
  toggleOn:    { backgroundColor: '#2d6a4f' },
  knob:        { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn:      { alignSelf: 'flex-end' },
});
