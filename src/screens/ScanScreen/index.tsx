import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useGardenStore } from '@/store/gardenStore';
import { plantIdentificationService, IdentificationResult } from '@/services/PlantIdentificationService';
import { Plant, Garden } from '@/models';
import { ScanStackParamList } from '@/navigation/AppNavigator';

type ScanNavProp = StackNavigationProp<ScanStackParamList, 'Scan'>;
type ScanStep = 'idle' | 'processing' | 'results' | 'error';

const DEFAULT_GARDEN_ID = 'main-garden';

const makeDefaultGarden = (): Garden => ({
  id: DEFAULT_GARDEN_ID,
  userId: 'local',
  name: 'Mijn tuin',
  polygons: [],
  plants: [],
  lastScannedAt: new Date().toISOString(),
});

const makePlant = (result: IdentificationResult, gardenId: string, position: number): Plant => {
  const id = `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    gardenId,
    species: result.species,
    commonName: result.commonName,
    x: 1 + (position % 5),
    y: 1 + Math.floor(position / 5),
    z: 0,
    plantedDate: new Date().toISOString(),
    maintenanceTasks: [
      {
        id: `task-${Date.now()}`,
        plantId: id,
        type: 'water',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    identificationConfidence: result.confidence,
  };
};

const ScanScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ScanNavProp>();
  const [step, setStep] = useState<ScanStep>('idle');
  const [results, setResults] = useState<IdentificationResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const garden = useGardenStore((s) => s.garden);
  const setGarden = useGardenStore((s) => s.setGarden);
  const addPlant = useGardenStore((s) => s.addPlant);

  const identify = async (uri: string) => {
    setStep('processing');
    try {
      const identified = await plantIdentificationService.identifyFromImageUri(uri);
      if (identified.length === 0) {
        setErrorMessage('Geen plant herkend. Probeer een duidelijkere foto.');
        setStep('error');
      } else {
        setResults(identified);
        setStep('results');
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Er ging iets mis.');
      setStep('error');
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage('Cameratoegang geweigerd.');
      setStep('error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled) {
      await identify(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled) {
      await identify(result.assets[0].uri);
    }
  };

  const handleSelectPlant = (result: IdentificationResult) => {
    const activeGarden = garden ?? makeDefaultGarden();
    if (!garden) setGarden(activeGarden);
    const plant = makePlant(result, activeGarden.id, activeGarden.plants.length);
    addPlant(plant);
    navigation.getParent()?.navigate('MapTab');
  };

  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6a4f" />
        <Text style={styles.processingText}>Plant herkennen...</Text>
      </SafeAreaView>
    );
  }

  if (step === 'error') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>🌿</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('idle')}>
          <Text style={styles.primaryButtonText}>Opnieuw proberen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (step === 'results') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('idle')}>
            <Text style={styles.backText}>← Opnieuw</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gevonden planten</Text>
        </View>
        <ScrollView contentContainerStyle={styles.resultsList}>
          {results.map((result, i) => (
            <TouchableOpacity
              key={i}
              style={styles.resultRow}
              onPress={() => handleSelectPlant(result)}
              activeOpacity={0.75}>
              <View style={styles.resultEmoji}>
                <Text style={styles.resultEmojiText}>🌿</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultCommonName}>{result.commonName}</Text>
                <Text style={styles.resultSpecies}>{result.species}</Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(result.confidence * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.hint}>Tik op een resultaat om het aan je tuin toe te voegen</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.idleIcon}>📷</Text>
      <Text style={styles.idleTitle}>Plant scannen</Text>
      <Text style={styles.idleSubtitle}>
        Maak een foto van een plant om hem te identificeren
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleCamera}>
        <Text style={styles.primaryButtonText}>Camera openen</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleGallery}>
        <Text style={styles.secondaryButtonText}>Kies uit galerij</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
    gap: 16,
  },
  idleIcon: { fontSize: 64 },
  idleTitle: { fontSize: 22, fontWeight: '700', color: '#1b4332' },
  idleSubtitle: {
    fontSize: 15,
    color: '#6b705c',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#f1f8f3',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d6a4f',
  },
  secondaryButtonText: { color: '#2d6a4f', fontSize: 16, fontWeight: '600' },
  processingText: { fontSize: 16, color: '#2d6a4f', fontWeight: '600' },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 15, color: '#495057', textAlign: 'center', lineHeight: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  backText: { color: '#2d6a4f', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  resultsList: { padding: 16, gap: 12 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 12,
  },
  resultEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d8f3dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultEmojiText: { fontSize: 22 },
  resultInfo: { flex: 1 },
  resultCommonName: { fontSize: 16, fontWeight: '700', color: '#1b4332' },
  resultSpecies: { fontSize: 13, fontStyle: 'italic', color: '#6b705c', marginTop: 2 },
  confidenceBadge: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confidenceText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hint: { textAlign: 'center', fontSize: 13, color: '#aaa', padding: 16 },
});

export default ScanScreen;
