import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Linking, Platform, Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '@/hooks/useTheme';

type FeedbackType = 'bug' | 'feature' | 'feedback';

const TYPES: { type: FeedbackType; icon: string; label: string; ghLabel: string }[] = [
  { type: 'bug',      icon: '🐛', label: 'Bug / fout',     ghLabel: 'bug' },
  { type: 'feature',  icon: '💡', label: 'Verbetering',    ghLabel: 'enhancement' },
  { type: 'feedback', icon: '💬', label: 'Algemeen',       ghLabel: 'feedback' },
];

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const extra       = Constants.expoConfig?.extra ?? {};
const APP_VERSION = Constants.expoConfig?.version ?? '?';
const BUILD_LABEL = extra.buildLabel ?? '?';

export const FeedbackModal = ({ visible, onClose }: FeedbackModalProps): React.JSX.Element => {
  const theme = useTheme();
  const [type, setType]       = useState<FeedbackType>('bug');
  const [title, setTitle]     = useState('');
  const [body, setBody]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    setType('bug'); setTitle(''); setBody(''); setSubmitted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Titel ontbreekt', 'Vul een korte omschrijving in.');
      return;
    }
    const selected = TYPES.find((t) => t.type === type)!;
    const deviceInfo = `**App:** v${APP_VERSION} (Build #${BUILD_LABEL})\n**Platform:** ${Platform.OS} ${Platform.Version}`;
    const issueBody = [
      body.trim() ? `## Omschrijving\n${body.trim()}` : '## Omschrijving\n\n',
      `## Apparaatinfo\n${deviceInfo}`,
    ].join('\n\n');

    const params = new URLSearchParams({
      labels: selected.ghLabel,
      title:  title.trim(),
      body:   issueBody,
    });
    const url = `https://github.com/kanifu/floramap/issues/new?${params.toString()}`;
    Linking.openURL(url).then(() => setSubmitted(true));
  };

  const styles = StyleSheet.create({
    overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet:     { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
    handle:    { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
    title:     { fontSize: 20, fontWeight: '800', color: theme.primaryDark },
    subtitle:  { fontSize: 13, color: theme.textSecondary, marginTop: -8 },
    typeRow:   { flexDirection: 'row', gap: 8 },
    typeBtn:   {
      flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
      borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardAlt, gap: 4,
    },
    typeBtnActive:  { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    typeIcon:  { fontSize: 20 },
    typeLabel: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
    typeLabelActive: { color: theme.primary },
    label:     { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    input:     {
      backgroundColor: theme.cardAlt, borderRadius: 12, borderWidth: 1,
      borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: theme.primaryDark,
    },
    bodyInput: { minHeight: 90, textAlignVertical: 'top', fontSize: 14 },
    hint:      { fontSize: 11, color: theme.textMuted, marginTop: -10 },
    submitBtn: {
      backgroundColor: theme.primary, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center', marginTop: 4,
    },
    submitBtnText: { color: theme.card, fontWeight: '700', fontSize: 16 },
    cancelBtn: {
      borderRadius: 14, paddingVertical: 14, alignItems: 'center',
      borderWidth: 1, borderColor: theme.border,
    },
    cancelBtnText: { color: theme.textSecondary, fontWeight: '600', fontSize: 15 },
    successBox: { alignItems: 'center', gap: 12, paddingVertical: 20 },
    successIcon: { fontSize: 52 },
    successTitle: { fontSize: 20, fontWeight: '700', color: theme.primaryDark },
    successSub:   { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20 },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>🌱</Text>
              <Text style={styles.successTitle}>Bedankt!</Text>
              <Text style={styles.successSub}>
                Je feedback is doorgezet naar GitHub. Dank je voor het verbeteren van FloraMap!
              </Text>
              <TouchableOpacity style={[styles.submitBtn, { alignSelf: 'stretch', marginTop: 8 }]} onPress={handleClose}>
                <Text style={styles.submitBtnText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>📣 Feedback geven</Text>
              <Text style={styles.subtitle}>Meld een bug of stel een verbetering voor</Text>

              {/* Type selector */}
              <View style={styles.typeRow}>
                {TYPES.map(({ type: t, icon, label }) => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                    onPress={() => setType(t)}>
                    <Text style={styles.typeIcon}>{icon}</Text>
                    <Text style={[styles.typeLabel, type === t && styles.typeLabelActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Korte omschrijving *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Bijv. App crasht bij scannen"
                  placeholderTextColor={theme.textMuted}
                  returnKeyType="next"
                  maxLength={120}
                />
              </View>

              {/* Body */}
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Details (optioneel)</Text>
                <TextInput
                  style={[styles.input, styles.bodyInput]}
                  value={body}
                  onChangeText={setBody}
                  placeholder="Stappen om te reproduceren, wat je verwachtte, wat er echt gebeurde…"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                />
                <Text style={styles.hint}>
                  App v{APP_VERSION} · Build #{BUILD_LABEL} · {Platform.OS} {Platform.Version} wordt automatisch meegestuurd
                </Text>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Versturen via GitHub →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
