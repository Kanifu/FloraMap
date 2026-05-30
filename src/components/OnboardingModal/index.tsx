import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';

export interface OnboardingResult {
  gridCols: number;
  gridRows: number;
  gardenName: string;
}

interface Props {
  visible: boolean;
  onDone: (result: OnboardingResult) => void;
}

const SIZE_PRESETS = [
  { label: '🪴 Balkon',      cols: 6,  rows: 4,  sub: '1.8 × 1.2 m' },
  { label: '🌿 Kleine tuin', cols: 10, rows: 8,  sub: '3 × 2.4 m'  },
  { label: '🥬 Moestuin',    cols: 15, rows: 12, sub: '4.5 × 3.6 m' },
  { label: '🌳 Groot',       cols: 25, rows: 20, sub: '7.5 × 6 m'  },
];

type GardenType = 'moestuin' | 'siertuin' | 'balkon' | 'kruidentuin' | 'fruitbomen';
type Experience = 'beginner' | 'gevorderd' | 'expert';

const GARDEN_TYPES: { key: GardenType; emoji: string; label: string }[] = [
  { key: 'moestuin',    emoji: '🥬', label: 'Moestuin' },
  { key: 'siertuin',   emoji: '🌸', label: 'Siertuin' },
  { key: 'balkon',     emoji: '🪴', label: 'Balkon' },
  { key: 'kruidentuin',emoji: '🌿', label: 'Kruidentuin' },
  { key: 'fruitbomen', emoji: '🌳', label: 'Fruitbomen' },
];

const EXPERIENCE_OPTIONS: { key: Experience; emoji: string; label: string }[] = [
  { key: 'beginner',  emoji: '🌱', label: 'Beginner' },
  { key: 'gevorderd', emoji: '🌿', label: 'Gevorderd' },
  { key: 'expert',    emoji: '🌳', label: 'Expert' },
];

export function OnboardingModal({ visible, onDone }: Props): React.JSX.Element {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<GardenType[]>([]);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [selectedSize, setSelectedSize] = useState(SIZE_PRESETS[2]); // default: Moestuin

  const totalSteps = 7;
  const isLast = step === totalSteps - 1;

  const handleLocationRequest = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        await AsyncStorage.setItem('floramap_location_granted', '1');
      }
    } catch {
      // locatie is optioneel — stil doorgaan
    }
    setStep(2);
  };

  const toggleGardenType = (type: GardenType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleNext = async () => {
    if (step === 1) {
      // Stap 2 navigatie via locationRequest of skip
      await AsyncStorage.setItem('floramap_garden_types', JSON.stringify(selectedTypes));
      setStep(2);
      return;
    }
    if (step === 2) {
      await AsyncStorage.setItem('floramap_garden_types', JSON.stringify(selectedTypes));
      setStep(3);
      return;
    }
    if (step === 3) {
      if (experience) {
        await AsyncStorage.setItem('floramap_experience', experience);
      }
      setStep(4);
      return;
    }
    if (isLast) {
      setStep(0);
      const gardenType = selectedTypes[0] ?? 'moestuin';
      const gardenName = gardenType === 'balkon' ? 'Mijn balkon'
        : gardenType === 'siertuin' ? 'Mijn siertuin'
        : gardenType === 'kruidentuin' ? 'Mijn kruidentuin'
        : gardenType === 'fruitbomen' ? 'Mijn fruitbomen'
        : 'Mijn tuin';
      onDone({ gridCols: selectedSize.cols, gridRows: selectedSize.rows, gardenName });
      return;
    }
    setStep((n) => n + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((n) => n - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={s.emoji}>🌿</Text>
            <Text style={s.title}>Welkom bij FloraMap</Text>
            <Text style={s.body}>
              Plan en beheer je tuin op één plek. Voeg planten toe en houd bij wanneer ze water, snoei of mest nodig hebben.
            </Text>
          </>
        );

      case 1:
        return (
          <>
            <Text style={s.emoji}>📍</Text>
            <Text style={s.title}>Locatie</Text>
            <Text style={s.body}>
              Waar is jouw tuin? FloraMap gebruikt je locatie voor weersdata en zaaikalenders.
            </Text>
            {!locationGranted ? (
              <TouchableOpacity style={s.locationBtn} onPress={handleLocationRequest} activeOpacity={0.85}>
                <Text style={s.locationBtnText}>📍 Locatie toestaan</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.locationGranted}>
                <Text style={s.locationGrantedText}>✅ Locatie toegestaan</Text>
              </View>
            )}
            <TouchableOpacity style={s.skipLink} onPress={() => setStep(2)}>
              <Text style={s.skipLinkText}>Overslaan →</Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            <Text style={s.emoji}>🏡</Text>
            <Text style={s.title}>Tuintype</Text>
            <Text style={s.body}>Wat voor tuin heb je? Je kunt meerdere types kiezen.</Text>
            <View style={s.typeGrid}>
              {GARDEN_TYPES.map(({ key, emoji, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[s.typeBtn, selectedTypes.includes(key) && s.typeBtnActive]}
                  onPress={() => toggleGardenType(key)}
                  activeOpacity={0.8}>
                  <Text style={s.typeBtnEmoji}>{emoji}</Text>
                  <Text style={[s.typeBtnLabel, selectedTypes.includes(key) && s.typeBtnLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={s.emoji}>🌱</Text>
            <Text style={s.title}>Ervaring</Text>
            <Text style={s.body}>Hoe ervaren ben je als tuinier?</Text>
            <View style={s.expRow}>
              {EXPERIENCE_OPTIONS.map(({ key, emoji, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[s.expBtn, experience === key && s.expBtnActive]}
                  onPress={() => setExperience(key)}
                  activeOpacity={0.8}>
                  <Text style={s.expEmoji}>{emoji}</Text>
                  <Text style={[s.expLabel, experience === key && s.expLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 4:
        return (
          <>
            <Text style={s.emoji}>📐</Text>
            <Text style={s.title}>Hoe groot is je tuin?</Text>
            <Text style={s.body}>Kies een formaat dat het beste past. Je kunt dit later aanpassen.</Text>
            <View style={s.typeGrid}>
              {SIZE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[s.typeBtn, selectedSize.cols === preset.cols && s.typeBtnActive]}
                  onPress={() => setSelectedSize(preset)}
                  activeOpacity={0.8}>
                  <Text style={s.typeBtnEmoji}>{preset.label.split(' ')[0]}</Text>
                  <Text style={[s.typeBtnLabel, selectedSize.cols === preset.cols && s.typeBtnLabelActive]}>
                    {preset.label.split(' ').slice(1).join(' ')}
                  </Text>
                  <Text style={[s.typeBtnLabel, { fontSize: 10 }]}>{preset.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      case 5:
        return (
          <>
            <Text style={s.emoji}>📷</Text>
            <Text style={s.title}>Slimme fotoscan</Text>
            <Text style={s.body}>
              Scan een foto om planten te herkennen. FloraMap herkent
              {' '}<Text style={s.bold}>maximaal 3 planten per scan</Text>.
              Maak meerdere foto's voor een volle tuin.
            </Text>
            <View style={s.infoBox}>
              <Text style={s.infoText}>🗺️ Je tuinkaart is{' '}
                <Text style={s.bold}>48 × 48 vakjes</Text>
                {' '}= 14,4 × 14,4 m
              </Text>
              <Text style={s.infoText}>📐 1 vakje = 30 × 30 cm</Text>
            </View>
          </>
        );

      case 6:
        return (
          <>
            <Text style={s.emoji}>🎉</Text>
            <Text style={s.title}>Alles ingesteld!</Text>
            <Text style={s.body}>
              Voeg je eerste plant toe om te beginnen.
            </Text>
          </>
        );

      default:
        return null;
    }
  };

  const getNextLabel = (): string => {
    if (step === 1) return locationGranted ? 'Volgende' : 'Overslaan';
    if (isLast) return '🌿 Beginnen';
    return 'Volgende';
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'flex-end',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 32,
      paddingBottom: 48,
      alignItems: 'center',
    },
    emoji: { fontSize: 56, marginBottom: 16 },
    title: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 10,
      color: theme.primaryDark,
    },
    body: {
      fontSize: 15,
      lineHeight: 23,
      textAlign: 'center',
      color: theme.textSecondary,
      marginBottom: 20,
    },
    dots: { flexDirection: 'row', gap: 7, marginBottom: 28, marginTop: 16 },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.primaryLight,
    },
    dotActive: { backgroundColor: theme.primary, width: 22 },
    btn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 15,
      paddingHorizontal: 32,
      alignItems: 'center',
      width: '100%',
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    backLink: { marginTop: 14, padding: 8 },
    backLinkText: { color: theme.textMuted, fontSize: 14 },
    locationBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    locationBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    locationGranted: {
      backgroundColor: theme.primaryLight,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    locationGrantedText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
    skipLink: { padding: 8 },
    skipLinkText: { color: theme.textMuted, fontSize: 14 },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      width: '100%',
      marginBottom: 8,
    },
    typeBtn: {
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.cardAlt,
      minWidth: 90,
    },
    typeBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    typeBtnEmoji: { fontSize: 24, marginBottom: 4 },
    typeBtnLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    typeBtnLabelActive: { color: theme.primary },
    bold: { fontWeight: '700', color: theme.primaryDark },
    infoBox: {
      backgroundColor: theme.primaryBg, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: theme.borderLight, width: '100%', gap: 6,
    },
    infoText: { fontSize: 14, color: theme.primaryDark, lineHeight: 20 },
    expRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
      marginBottom: 8,
    },
    expBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.cardAlt,
      gap: 6,
    },
    expBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    expEmoji: { fontSize: 24 },
    expLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    expLabelActive: { color: theme.primary },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={s.card}>
            {renderStep()}

            <View style={s.dots}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <View key={i} style={[s.dot, i === step && s.dotActive]} />
              ))}
            </View>

            {step !== 1 && (
              <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={s.btnText}>{getNextLabel()}</Text>
              </TouchableOpacity>
            )}

            {step === 1 && locationGranted && (
              <TouchableOpacity style={s.btn} onPress={() => setStep(2)} activeOpacity={0.85}>
                <Text style={s.btnText}>Volgende</Text>
              </TouchableOpacity>
            )}

            {step > 0 && (
              <TouchableOpacity onPress={handleBack} style={s.backLink}>
                <Text style={s.backLinkText}>← Terug</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

