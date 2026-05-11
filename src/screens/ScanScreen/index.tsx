import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useGardenStore } from '@/store/gardenStore';
import { arService } from '@/services/ARService';
import { SmartScan } from '@/modules/scan/SmartScan';
import { Garden, DiffProposal } from '@/models';
import { ScanStackParamList } from '@/navigation/AppNavigator';

type ScanNavProp = StackNavigationProp<ScanStackParamList, 'Scan'>;

type ScanStep = 'preview' | 'processing' | 'confirm' | 'diff';

const smartScan = new SmartScan();

const ScanScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ScanNavProp>();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  void cameraRef;

  const [step, setStep] = useState<ScanStep>('preview');
  const [scannedGarden, setScannedGarden] = useState<Garden | null>(null);
  const [proposals, setProposals] = useState<DiffProposal[]>([]);
  const [currentProposalIndex, setCurrentProposalIndex] = useState(0);

  const existingGarden = useGardenStore((s) => s.garden);
  const setGarden = useGardenStore((s) => s.setGarden);
  const acceptDiffProposal = useGardenStore((s) => s.acceptDiffProposal);
  const rejectDiffProposal = useGardenStore((s) => s.rejectDiffProposal);

  const handleCapture = async () => {
    setStep('processing');
    try {
      if (existingGarden) {
        const diffProposals = await smartScan.runUpdateScan(existingGarden);
        setProposals(diffProposals);
        setCurrentProposalIndex(0);
        setStep(diffProposals.length > 0 ? 'diff' : 'preview');
      } else {
        const garden = await smartScan.runFullScan();
        setScannedGarden(garden);
        setStep('confirm');
      }
    } catch {
      setStep('preview');
    }
  };

  const handleConfirm = () => {
    if (scannedGarden) {
      setGarden(scannedGarden);
    }
    navigation.getParent()?.navigate('MapTab');
  };

  const handleAcceptProposal = () => {
    const proposal = proposals[currentProposalIndex];
    if (!proposal) return;
    acceptDiffProposal(proposal.id);
    advanceProposal();
  };

  const handleRejectProposal = () => {
    const proposal = proposals[currentProposalIndex];
    if (!proposal) return;
    rejectDiffProposal(proposal.id);
    advanceProposal();
  };

  const advanceProposal = () => {
    if (currentProposalIndex + 1 >= proposals.length) {
      navigation.getParent()?.navigate('MapTab');
    } else {
      setCurrentProposalIndex((i) => i + 1);
    }
  };

  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#2d6a4f" />
        <Text style={styles.processingText}>Tuin analyseren...</Text>
      </SafeAreaView>
    );
  }

  if (step === 'confirm' && scannedGarden) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan voltooid</Text>
        </View>
        <View style={styles.confirmContent}>
          <Text style={styles.confirmTitle}>{scannedGarden.name}</Text>
          <Text style={styles.confirmDetail}>
            {scannedGarden.plants.length} planten gedetecteerd
          </Text>
          <Text style={styles.confirmDetail}>
            {scannedGarden.polygons.length} zones in kaart gebracht
          </Text>
        </View>
        <View style={styles.confirmActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('preview')}>
            <Text style={styles.secondaryButtonText}>Opnieuw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
            <Text style={styles.primaryButtonText}>Bevestig</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'diff') {
    const proposal = proposals[currentProposalIndex];
    const remaining = proposals.length - currentProposalIndex;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wijzigingen ({remaining} over)</Text>
        </View>
        <View style={styles.diffContent}>
          <Text style={styles.diffBadge}>
            {proposal.type === 'add' ? '+ Nieuw' : proposal.type === 'remove' ? '− Verwijderd' : '~ Gewijzigd'}
          </Text>
          <Text style={styles.diffPlantName}>{proposal.plant.commonName}</Text>
          <Text style={styles.diffSpecies}>{proposal.plant.species}</Text>
          <Text style={styles.diffConfidence}>
            Betrouwbaarheid: {Math.round(proposal.confidence * 100)}%
          </Text>
        </View>
        <View style={styles.diffActions}>
          <TouchableOpacity style={styles.neeButton} onPress={handleRejectProposal}>
            <Text style={styles.diffActionText}>Nee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.jaButton} onPress={handleAcceptProposal}>
            <Text style={styles.diffActionText}>Ja</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      {device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
        />
      ) : (
        <View style={styles.noCameraPlaceholder}>
          <Text style={styles.noCameraText}>Camera niet beschikbaar</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.overlayInner}>
          <Text style={styles.overlayInstruction}>
            Sweep your camera over the garden
          </Text>
        </SafeAreaView>
      </View>
      <View style={styles.captureRow}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  noCameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCameraText: {
    color: '#aaa',
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  overlayInner: {
    alignItems: 'center',
    paddingTop: 24,
  },
  overlayInstruction: {
    color: '#fff',
    fontSize: 16,
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
    marginTop: 16,
    fontSize: 16,
    color: '#2d6a4f',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b4332',
  },
  confirmContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 16,
  },
  confirmDetail: {
    fontSize: 16,
    color: '#6b705c',
    marginBottom: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2d6a4f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1b4332',
    fontSize: 16,
    fontWeight: '600',
  },
  diffContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  diffBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#2d6a4f',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  diffPlantName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 8,
  },
  diffSpecies: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#6b705c',
    marginBottom: 16,
  },
  diffConfidence: {
    fontSize: 14,
    color: '#aaa',
  },
  diffActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  neeButton: {
    flex: 1,
    backgroundColor: '#e63946',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  jaButton: {
    flex: 1,
    backgroundColor: '#2d6a4f',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  diffActionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ScanScreen;
