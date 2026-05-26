import React from 'react';
import {
  View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, Linking, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

const APP_VERSION = '1.3.0';

const OPEN_SOURCE_LIBS = [
  { name: 'React Native',        license: 'MIT', url: 'https://reactnative.dev' },
  { name: 'Expo',                license: 'MIT', url: 'https://expo.dev' },
  { name: 'Zustand',             license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'React Navigation',    license: 'MIT', url: 'https://reactnavigation.org' },
  { name: 'AsyncStorage',        license: 'MIT', url: 'https://github.com/react-native-async-storage/async-storage' },
  { name: 'Expo Image Picker',   license: 'MIT', url: 'https://docs.expo.dev/versions/latest/sdk/imagepicker' },
  { name: 'React Native SVG',    license: 'MIT', url: 'https://github.com/software-mansion/react-native-svg' },
  { name: 'Open-Meteo',          license: 'CC BY 4.0', url: 'https://open-meteo.com' },
];

const INFO_ROWS = [
  { label: 'Platform', value: 'Android (React Native + Expo)' },
  { label: 'AI Model',  value: 'Google Gemini 2.0 Flash' },
  { label: 'Weather',   value: 'Open-Meteo (gratis, open-source)' },
  { label: 'Opslag',    value: 'Lokaal (AsyncStorage)' },
  { label: 'Versie',    value: APP_VERSION },
];

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe:       { flex: 1, backgroundColor: t.background },
    header:     {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: t.border,
      backgroundColor: t.card,
    },
    backBtn:    { padding: 6, marginRight: 10 },
    backText:   { fontSize: 22, color: t.primary },
    headerTitle:{ fontSize: 20, fontWeight: '700', color: t.text },
    content:    { flex: 1 },
    section:    { margin: 16, marginBottom: 0 },
    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: t.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
    },
    card: {
      backgroundColor: t.card, borderRadius: 14,
      borderWidth: 1, borderColor: t.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    },
    rowLast:    { borderBottomWidth: 0 },
    rowLabel:   { fontSize: 14, color: t.textSecondary, flex: 1 },
    rowValue:   { fontSize: 14, color: t.text, fontWeight: '500', flex: 2, textAlign: 'right' },
    linkRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    },
    linkRowLast: { borderBottomWidth: 0 },
    linkText:   { fontSize: 14, color: t.primary, flex: 1 },
    linkSubText:{ fontSize: 11, color: t.textMuted, marginTop: 1 },
    chevron:    { fontSize: 14, color: t.textMuted },
    versionBadge: {
      alignSelf: 'center', marginTop: 16,
      backgroundColor: t.primaryLight, paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20,
    },
    versionText:{ fontSize: 13, fontWeight: '700', color: t.primary },
    tagline: {
      textAlign: 'center', fontSize: 12, color: t.textMuted,
      marginTop: 6, marginBottom: 24,
    },
    spacer: { height: 32 },
  });

export default function AboutScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = makeStyles(theme);

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Over FloraMap</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Version badge */}
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>FloraMap v{APP_VERSION}</Text>
        </View>
        <Text style={styles.tagline}>Jouw slimme tuinplanner 🌿</Text>

        {/* Technical info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technische info</Text>
          <View style={styles.card}>
            {INFO_ROWS.map((row, i) => (
              <View key={row.label} style={[styles.row, i === INFO_ROWS.length - 1 && styles.rowLast]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Developer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ontwikkelaar</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openLink('https://www.linkedin.com/in/jordy-zinkstok')}
            >
              <View>
                <Text style={styles.linkText}>Jordy Zinkstok</Text>
                <Text style={styles.linkSubText}>linkedin.com/in/jordy-zinkstok</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkRowLast}
              onPress={() => openLink('mailto:jordyzinkstok@gmail.com')}
            >
              <View style={[styles.linkRow, styles.linkRowLast]}>
                <View>
                  <Text style={styles.linkText}>E-mail</Text>
                  <Text style={styles.linkSubText}>jordyzinkstok@gmail.com</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openLink('https://floramap.app/privacy')}
            >
              <Text style={styles.linkText}>Privacybeleid</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openLink('https://open-meteo.com')}
            >
              <Text style={styles.linkText}>Open-Meteo</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkRow, styles.linkRowLast]}
              onPress={() => openLink('https://ai.google.dev')}
            >
              <Text style={styles.linkText}>Google Gemini API</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Open source */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Open Source Libraries</Text>
          <View style={styles.card}>
            {OPEN_SOURCE_LIBS.map((lib, i) => (
              <TouchableOpacity
                key={lib.name}
                style={[styles.linkRow, i === OPEN_SOURCE_LIBS.length - 1 && styles.linkRowLast]}
                onPress={() => openLink(lib.url)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkText}>{lib.name}</Text>
                  <Text style={styles.linkSubText}>{lib.license}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* License */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Licentie</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Licentie</Text>
              <Text style={styles.rowValue}>MIT</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>Copyright</Text>
              <Text style={styles.rowValue}>© 2026 Jordy Zinkstok</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}
