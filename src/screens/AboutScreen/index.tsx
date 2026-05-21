import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SECTIONS = [
  {
    title: 'Over FloraMap',
    items: [
      { label: 'Versie', value: '1.0.0' },
      { label: 'Platform', value: 'React Native · Expo SDK 52' },
      { label: 'AI-model', value: 'Google Gemini 3.5 Flash' },
      { label: 'Weerdata', value: 'Open-Meteo (gratis, geen sleutel)' },
    ],
  },
  {
    title: 'Licentie',
    items: [
      { label: 'Type', value: 'MIT License' },
      { label: 'Auteursrecht', value: `© ${new Date().getFullYear()} FloraMap` },
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
    ],
  },
];

const LINKS = [
  { label: '🌐 Open-Meteo weer API', url: 'https://open-meteo.com' },
  { label: '🤖 Google Gemini API', url: 'https://ai.google.dev' },
];

const AboutScreen = (): React.JSX.Element => {
  const navigation = useNavigation();

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
          <View style={styles.versionPill}>
            <Text style={styles.versionPillText}>v1.0.0</Text>
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

        <Text style={styles.footer}>
          FloraMap gebruikt AI om planten te herkennen en verzorgingsadvies te geven.
          Controleer altijd zelf of informatie klopt voor jouw specifieke situatie.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backBtn: { width: 70 },
  backText: { fontSize: 16, color: '#2d6a4f', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1b4332' },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  heroIcon: { fontSize: 56 },
  heroName: { fontSize: 28, fontWeight: '800', color: '#1b4332' },
  heroTagline: { fontSize: 14, color: '#6b705c' },
  versionPill: {
    backgroundColor: '#d8f3dc',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  versionPillText: { fontSize: 13, fontWeight: '700', color: '#2d6a4f' },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  rowLabel: { fontSize: 14, color: '#1b4332', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#6b705c', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  linkChevron: { fontSize: 20, color: '#aaa' },
  footer: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});

export default AboutScreen;
