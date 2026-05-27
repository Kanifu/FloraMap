/**
 * FeedbackModal — Issue #56
 *
 * Allows users to report a bug, request a feature, or send general feedback.
 * On submit, opens the GitHub issue-creation URL pre-filled with the report,
 * so no API key is needed. Users can also attach a screenshot after the
 * browser/GitHub form opens.
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Linking, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import Constants from 'expo-constants';

const VERSION    = Constants.expoConfig?.version ?? '?';
const BUILD_LABEL = (Constants.expoConfig?.extra?.buildLabel ?? '?') as string;

type ReportType = 'bug' | 'feature' | 'feedback' | 'error';

interface ReportTypeOption {
  type: ReportType;
  icon: string;
  label: string;
  description: string;
  ghLabel: string;  // GitHub label to apply
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    type: 'bug',
    icon: '🐛',
    label: 'Bug / Fout',
    description: 'Iets werkt niet goed',
    ghLabel: 'bug',
  },
  {
    type: 'error',
    icon: '⚠️',
    label: 'App-fout',
    description: 'App geeft een foutmelding',
    ghLabel: 'bug',
  },
  {
    type: 'feature',
    icon: '💡',
    label: 'Verbetervoorstel',
    description: 'Ik heb een idee voor een nieuwe feature',
    ghLabel: 'enhancement',
  },
  {
    type: 'feedback',
    icon: '💬',
    label: 'Algemene feedback',
    description: 'Overige opmerkingen of vragen',
    ghLabel: 'feedback',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: Props): React.JSX.Element {
  const theme = useTheme();
  const s = makeStyles(theme);

  const [selectedType, setSelectedType] = useState<ReportType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedOption = REPORT_TYPES.find((r) => r.type === selectedType)!;

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Titel ontbreekt', 'Voer een korte beschrijving in.');
      return;
    }

    const deviceInfo = `\n\n---\n**Apparaatinfo:**\n- App versie: v${VERSION} (Build #${BUILD_LABEL})\n- Platform: ${Platform.OS}`;
    const screenshotNote = '\n- 📎 *Voeg een screenshot toe (optioneel): sleep het naar het tekstveld hieronder)*';
    const fullBody = `${description.trim()}${deviceInfo}${screenshotNote}`;

    // GitHub issue creation URL — pre-filled, no API key needed
    const ghTitle = encodeURIComponent(
      `[${selectedOption.icon} ${selectedOption.label}] ${title.trim()}`,
    );
    const ghBody = encodeURIComponent(fullBody);
    const ghLabel = encodeURIComponent(selectedOption.ghLabel);
    const url = `https://github.com/kanifu/floramap/issues/new?title=${ghTitle}&body=${ghBody}&labels=${ghLabel}`;

    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Kan browser niet openen', 'Kopieer de link handmatig.');
        return;
      }
      await Linking.openURL(url);
      setSubmitted(true);
    } catch {
      Alert.alert('Fout', 'Kon de browser niet openen. Controleer je verbinding.');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedType('bug');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {submitted ? (
            /* ── Success state ── */
            <View style={s.successState}>
              <Text style={s.successIcon}>✅</Text>
              <Text style={s.successTitle}>Bedankt voor je feedback!</Text>
              <Text style={s.successBody}>
                Je browser is geopend met het GitHub-formulier. Klik op{' '}
                <Text style={{ fontWeight: '700' }}>Submit new issue</Text> om in te dienen.
                Je kunt ook een screenshot toevoegen via het GitHub-formulier.
              </Text>
              <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
                <Text style={s.closeBtnText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form ── */
            <ScrollView
              contentContainerStyle={s.form}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={s.sheetTitle}>📣 Feedback melden</Text>
              <Text style={s.sheetSub}>
                Meld een probleem of stuur een verbetervoorstel. Je melding wordt
                direct aangemaakt als GitHub-issue.
              </Text>

              {/* Type selector */}
              <Text style={s.sectionLabel}>Type melding</Text>
              <View style={s.typeGrid}>
                {REPORT_TYPES.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[s.typeCard, selectedType === opt.type && s.typeCardActive]}
                    onPress={() => setSelectedType(opt.type)}
                    activeOpacity={0.75}>
                    <Text style={s.typeIcon}>{opt.icon}</Text>
                    <Text style={[s.typeLabel, selectedType === opt.type && s.typeLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={s.typeDesc}>{opt.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={s.sectionLabel}>Korte beschrijving *</Text>
              <TextInput
                style={s.input}
                placeholder="Wat is er precies mis / wat wil je verbeteren?"
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                maxLength={120}
              />

              {/* Description */}
              <Text style={s.sectionLabel}>Details (optioneel)</Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                placeholder="Beschrijf wat er mis gaat, stappen om het te reproduceren, of je idee…"
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={s.screenshotHint}>
                📸 Na het openen van GitHub kun je een screenshot uploaden via het formulier
              </Text>

              {/* Actions */}
              <View style={s.actions}>
                <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
                  <Text style={s.cancelBtnText}>Annuleren</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, !title.trim() && s.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!title.trim()}>
                  <Text style={s.submitBtnText}>
                    {selectedOption.icon} Meld via GitHub
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 32,
  },
  handle: {
    width: 38, height: 4,
    backgroundColor: t.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  form: { padding: 20, gap: 4, paddingBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: t.primaryDark, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: t.textSecondary, lineHeight: 18, marginBottom: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginTop: 12, marginBottom: 8,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeCard: {
    flex: 1, minWidth: '45%',
    borderWidth: 1, borderColor: t.border,
    backgroundColor: t.background,
    borderRadius: 14, padding: 12, gap: 2,
  },
  typeCardActive: { borderColor: t.primary, backgroundColor: t.primaryLight },
  typeIcon: { fontSize: 22, marginBottom: 2 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: t.text },
  typeLabelActive: { color: t.primaryDark },
  typeDesc: { fontSize: 11, color: t.textMuted, lineHeight: 15 },
  input: {
    borderWidth: 1, borderColor: t.border, borderRadius: 12,
    backgroundColor: t.background, color: t.text,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    marginBottom: 4,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  screenshotHint: { fontSize: 12, color: t.textMuted, marginTop: 6, fontStyle: 'italic', lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: t.border, borderRadius: 12,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: t.textSecondary },
  submitBtn: {
    flex: 2, backgroundColor: t.primary, paddingVertical: 14,
    alignItems: 'center', borderRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: t.textMuted },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Success state
  successState: { padding: 32, alignItems: 'center', gap: 12 },
  successIcon: { fontSize: 52 },
  successTitle: { fontSize: 20, fontWeight: '700', color: t.primaryDark, textAlign: 'center' },
  successBody: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 22 },
  closeBtn: {
    marginTop: 8, backgroundColor: t.primary, paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%',
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
