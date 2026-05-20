import React, { useRef, useState } from 'react';
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
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useGardenStore } from '@/store/gardenStore';
import { plantIdentificationService, IdentificationResult } from '@/services/PlantIdentificationService';
import { Plant, Garden } from '@/models';
import { ScanStackParamList } from '@/navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';

type ScanNavProp = StackNavigationProp<ScanStackParamList, 'Scan'>;
type ScanStep = 'camera' | 'processing' | 'results' | 'error';

const DEFAULT_GARDEN_ID = 'main-garden';

const makeDefaultGarden = (): Garden => ({
  id: DEFAULT_GARDEN_ID,
  userId: 'local',
  name: 'Mijn tuin',
  polygons: [],
  plants: [],
  lastScannedAt: new Date().toISOString(),
});

const makePlant = (result: IdentificationResult, gardenId: string, position: number): Plant => ({
  id: `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      plantId: '',
      type: 'water',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  identificationConfidence: result.confidence,
});

const ScanScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ScanNavProp>();
  const cameraRef = useRef<CameraView>(null);
  const [facing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  const [step, setStep] = useState<ScanStep>('camera');
  const [results, setResults] = useState<IdentificationResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const garden = useGardenStore((s) => s.garden);
  const setGarden = useGardenStore((s) => s.setGarden);
  const addPlant = useGardenStore((s) => s.addPlant);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setStep('processing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      if (!photo) throw new Error('Foto mislukt');
      const identified = await plantIdentificationService.identifyFromImageUri(photo.uri);
      if (identified.length === 0) {
        setErrorMessage('Geen plant herkend. Probeer dichter bij de plant te fotograferen.');
        setStep('error');
      } else {
        setResults(identified);
        setStep('results');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      setErrorMessage(`Fout: ${msg}`);
      setStep('error');
    }
  };

  const handleSelectPlant = (result: IdentificationResult) => {
    const activeGarden = garden ?? makeDefaultGarden();
    if (!garden) {
      setGarden(activeGarden);
    }
    const plant = makePlant(result, activeGarden.id, activeGarden.plants.length);
    plant.maintenanceTasks[0].plantId = plant.id;
    addPlant(plant);
    navigation.getParent()?.navigate('MapTab');
  };

  if (!permission) {
    return <View style={styles.centered} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permissionText}>
          FloraMap heeft cameratoegang nodig om planten te scannen.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Toestemming geven</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('camera')}>
          <Text style={styles.primaryButtonText}>Opnieuw proberen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (step === 'results') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('camera')}>
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
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} isActive={true} />
      <SafeAreaView style={styles.cameraOverlay}>
        <Text style={styles.instruction}>Richt op een plant en maak een foto</Text>
      </SafeAreaView>
      <View style={styles.captureRow}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
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
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 24,
  },
  instruction: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  captureRow: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  processingText: {
    fontSize: 16,
    color: '#2d6a4f',
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 15,
    color: '#495057',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorIcon: { fontSize: 48 },
  errorText: {
    fontSize: 15,
    color: '#495057',
    textAlign: 'center',
    lineHeight: 22,
  },
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
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#aaa',
    padding: 16,
  },
});

export default ScanScreen;
