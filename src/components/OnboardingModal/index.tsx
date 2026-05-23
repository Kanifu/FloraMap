import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const STEPS = [
  {
    emoji: '🌱',
    title: 'Welkom bij FloraMap',
    body: 'Plan en beheer je tuin op één plek. Voeg planten toe en houd bij wanneer ze water, snoei of mest nodig hebben.',
  },
  {
    emoji: '📸',
    title: 'Voeg je eerste plant toe',
    body: 'Scan een foto met de camera of voeg planten handmatig toe — ook zaden, zaailingen en stekken.',
  },
  {
    emoji: '✅',
    title: 'Houd onderhoud bij',
    body: 'FloraMap herinnert je dagelijks aan watergeven, snoeien en bemesten. Vink taken af — de volgende herhaling wordt automatisch ingepland.',
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function OnboardingModal({ visible, onDone }: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setStep(0);
      onDone();
    } else {
      setStep((n) => n + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.emoji}>{STEPS[step].emoji}</Text>
          <Text style={s.title}>{STEPS[step].title}</Text>
          <Text style={s.body}>{STEPS[step].body}</Text>

          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={s.btn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.btnText}>{isLast ? 'Beginnen 🌿' : 'Volgende'}</Text>
          </TouchableOpacity>

          {step > 0 && (
            <TouchableOpacity onPress={() => setStep((n) => n - 1)} style={s.backLink}>
              <Text style={s.backLinkText}>← Terug</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
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
    color: '#1b4332',
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    color: '#6b705c',
    marginBottom: 28,
  },
  dots: { flexDirection: 'row', gap: 7, marginBottom: 28 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d8f3dc',
  },
  dotActive: { backgroundColor: '#2d6a4f', width: 22 },
  btn: {
    backgroundColor: '#2d6a4f',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 14, padding: 8 },
  backLinkText: { color: '#aaa', fontSize: 14 },
});
