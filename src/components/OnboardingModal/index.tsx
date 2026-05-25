/**
 * OnboardingModal — Issue #38
 * Enhanced onboarding wizard: locatie, tuintype en ervaring instellen bij eerste start.
 *
 * Flow:
 *  Step 0 — Welkom
 *  Step 1 — Tuintype (balkon / achtertuin / voortuin / volkstuin)
 *  Step 2 — Ervaring (beginner / hobbyist / expert)
 *  Step 3 — Locatie (stad / regio, vrij tekstveld)
 *  Step 4 — Klaar + tips
 *
 * The collected preferences are passed back via onDone(prefs) so the
 * parent (MapScreen) can persist them in AsyncStorage / gardenStore.
 */

import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';

export type GardenType = 'balkon' | 'achtertuin' | 'voortuin' | 'volkstuin';
export type ExperienceLevel = 'beginner' | 'hobbyist' | 'expert';

export interface OnboardingPreferences {
  gardenType: GardenType;
  experienceLevel: ExperienceLevel;
  location: string;
}

const GARDEN_TYPES: { value: GardenType; emoji: string; label: string; desc: string }[] = [
  { value: 'balkon',     emoji: '🏙️', label: 'Balkon',     desc: 'Pot- en balkonplanten' },
  { value: 'achtertuin', emoji: '🏡', label: 'Achtertuin', desc: 'Vollegrond of verhoogde bakken' },
  { value: 'voortuin',   emoji: '🌳', label: 'Voortuin',   desc: 'Gevel, border of perkje' },
  { value: 'volkstuin',  emoji: '🌾', label: 'Volkstuin',  desc: 'Huurperceel / volkstuinpark' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; emoji: string; label: string; desc: string }[] = [
  { value: 'beginner',  emoji: '🌱', label: 'Beginner',  desc: 'Nog maar net begonnen' },
  { value: 'hobbyist',  emoji: '🌿', label: 'Hobbyist',  desc: 'Tuin al een paar jaar' },
  { value: 'expert',    emoji: '🌳', label: 'Expert',    desc: 'Serieuze tuinier' },
];

const TOTAL_STEPS = 5;

interface Props {
  visible: boolean;
  onDone: (prefs: OnboardingPreferences) => void;
}

export function OnboardingModal({ visible, onDone }: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [gardenType, setGardenType] = useState<GardenType>('achtertuin');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [location, setLocation] = useState('');

  const handleFinish = () => {
    setStep(0);
    onDone({ gardenType, experienceLevel, location: location.trim() });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((n) => n + 1);
    else handleFinish();
  };

  const goBack = () => {
    if (step > 0) setStep((n) => n - 1);
  };

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kav}
      >
        <View style={s.overlay}>
          <View style={s.card}>
            {/* Progress dots */}
            <View style={s.dots}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View key={i} style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]} />
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {/* ── Step 0: Welkom ── */}
              {step === 0 && (
                <View style={s.stepContent}>
                  <Text style={s.bigEmoji}>🌱</Text>
                  <Text style={s.title}>Welkom bij FloraMap</Text>
                  <Text style={s.body}>
                    Plan en beheer je tuin op één plek. We stellen je een paar snelle vragen
                    zodat FloraMap tips en schema's op jouw situatie kan afstemmen.
                  </Text>
                </View>
              )}

              {/* ── Step 1: Tuintype ── */}
              {step === 1 && (
                <View style={s.stepContent}>
                  <Text style={s.bigEmoji}>🏡</Text>
                  <Text style={s.title}>Wat voor tuin heb je?</Text>
                  <Text style={s.body}>Kies de optie die het beste past — je kunt dit later aanpassen.</Text>
                  <View style={s.optionGrid}>
                    {GARDEN_TYPES.map((gt) => (
                      <TouchableOpacity
                        key={gt.value}
                        style={[s.optionCard, gardenType === gt.value && s.optionCardActive]}
                        onPress={() => setGardenType(gt.value)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.optionEmoji}>{gt.emoji}</Text>
                        <Text style={[s.optionLabel, gardenType === gt.value && s.optionLabelActive]}>
                          {gt.label}
                        </Text>
                        <Text style={s.optionDesc}>{gt.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Step 2: Ervaring ── */}
              {step === 2 && (
                <View style={s.stepContent}>
                  <Text style={s.bigEmoji}>🌿</Text>
                  <Text style={s.title}>Hoeveel tuinervaring heb je?</Text>
                  <Text style={s.body}>Dit helpt FloraMap de juiste mate van detail te geven in tips en schema's.</Text>
                  <View style={s.experienceList}>
                    {EXPERIENCE_LEVELS.map((el) => (
                      <TouchableOpacity
                        key={el.value}
                        style={[s.experienceRow, experienceLevel === el.value && s.experienceRowActive]}
                        onPress={() => setExperienceLevel(el.value)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.expEmoji}>{el.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.expLabel, experienceLevel === el.value && s.expLabelActive]}>
                            {el.label}
                          </Text>
                          <Text style={s.expDesc}>{el.desc}</Text>
                        </View>
                        {experienceLevel === el.value && (
                          <Text style={s.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Step 3: Locatie ── */}
              {step === 3 && (
                <View style={s.stepContent}>
                  <Text style={s.bigEmoji}>📍</Text>
                  <Text style={s.title}>Waar woon je?</Text>
                  <Text style={s.body}>
                    Optioneel. FloraMap gebruikt je stad of regio voor seizoenstips en vorstdata.
                    Geen exacte locatie nodig — stad is genoeg.
                  </Text>
                  <TextInput
                    style={s.locationInput}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="bijv. Utrecht, Groningen, Antwerpen…"
                    placeholderTextColor="#aaa"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  <Text style={s.skipHint}>Je kunt dit ook overslaan — tap op Volgende.</Text>
                </View>
              )}

              {/* ── Step 4: Klaar ── */}
              {step === 4 && (
                <View style={s.stepContent}>
                  <Text style={s.bigEmoji}>🎉</Text>
                  <Text style={s.title}>Je tuin staat klaar!</Text>
                  <Text style={s.body}>
                    FloraMap is ingesteld voor jouw situatie. Begin met het toevoegen van je eerste plant
                    via de camera, de plantendatabase, of handmatig op de kaart.
                  </Text>
                  <View style={s.tipList}>
                    {[
                      '📸  Scan een plantfoto voor automatische herkenning',
                      '🔍  Zoek in de plantendatabase (30+ soorten)',
                      '✅  Vink taken af — herhaling wordt automatisch ingepland',
                      '🤖  Vraag de AI-assistent om tuinadvies',
                    ].map((tip, i) => (
                      <View key={i} style={s.tipRow}>
                        <Text style={s.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Navigation */}
            <View style={s.navRow}>
              {step > 0 ? (
                <TouchableOpacity style={s.backBtn} onPress={goBack}>
                  <Text style={s.backBtnText}>← Terug</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
                <Text style={s.nextBtnText}>{isLast ? 'Beginnen 🌿' : 'Volgende'}</Text>
              </TouchableOpacity>
            </View>

            {step === 3 && !location.trim() && (
              <TouchableOpacity style={s.skipLink} onPress={goNext}>
                <Text style={s.skipLinkText}>Overslaan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  kav: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxHeight: '90%',
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 7, marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d8f3dc' },
  dotActive: { backgroundColor: '#2d6a4f', width: 22 },
  dotDone: { backgroundColor: '#95d5b2' },
  stepContent: { alignItems: 'center', paddingBottom: 12 },
  bigEmoji: { fontSize: 52, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 10, color: '#1b4332' },
  body: { fontSize: 15, lineHeight: 23, textAlign: 'center', color: '#6b705c', marginBottom: 20 },
  // Garden type grid
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%' },
  optionCard: {
    width: '46%', padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#e8f0eb',
    alignItems: 'center', backgroundColor: '#f8fdf9',
  },
  optionCardActive: { borderColor: '#2d6a4f', backgroundColor: '#f0faf5' },
  optionEmoji: { fontSize: 30, marginBottom: 6 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#4a7c5e', marginBottom: 2 },
  optionLabelActive: { color: '#1b4332' },
  optionDesc: { fontSize: 11, color: '#7a9e8a', textAlign: 'center' },
  // Experience levels
  experienceList: { width: '100%', gap: 10 },
  experienceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#e8f0eb', backgroundColor: '#f8fdf9',
  },
  experienceRowActive: { borderColor: '#2d6a4f', backgroundColor: '#f0faf5' },
  expEmoji: { fontSize: 26 },
  expLabel: { fontSize: 15, fontWeight: '700', color: '#4a7c5e' },
  expLabelActive: { color: '#1b4332' },
  expDesc: { fontSize: 12, color: '#7a9e8a', marginTop: 1 },
  checkmark: { fontSize: 18, color: '#2d6a4f', fontWeight: '800' },
  // Location
  locationInput: {
    width: '100%', borderRadius: 14, borderWidth: 1.5, borderColor: '#c8e6d0',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1b4332', backgroundColor: '#f8fdf9',
    marginBottom: 8,
  },
  skipHint: { fontSize: 12, color: '#aaa', textAlign: 'center' },
  // Tips list
  tipList: { width: '100%', gap: 10, alignItems: 'flex-start' },
  tipRow: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#f0faf5', borderRadius: 12, width: '100%' },
  tipText: { fontSize: 14, color: '#2d6a4f', lineHeight: 20 },
  // Navigation
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 20, gap: 12 },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e8f0eb', alignItems: 'center' },
  backBtnText: { fontSize: 15, color: '#7a9e8a', fontWeight: '600' },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2d6a4f', alignItems: 'center' },
  nextBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  skipLink: { marginTop: 10 },
  skipLinkText: { fontSize: 13, color: '#aaa' },
});
