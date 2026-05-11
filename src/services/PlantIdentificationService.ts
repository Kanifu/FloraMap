import { Plant } from '@/models';

interface IdentificationResult {
  species: string;
  commonName: string;
  confidence: number;
}

export class PlantIdentificationService {
  async identifyFromImage(imageUri: string): Promise<IdentificationResult[]> {
    // Replace with actual CV model API call (e.g. PlantNet API or on-device ML model)
    // PlantNet: POST https://my-api.plantnet.org/v2/identify/all with image file
    // On-device: use react-native-ml-kit or TFLite model bundle
    void imageUri;
    return Promise.resolve([
      {
        species: 'Rosa canina',
        commonName: 'Dog Rose',
        confidence: 0.87,
      },
    ]);
  }

  async identifyFromScan(scanData: unknown): Promise<Plant[]> {
    // Replace with actual CV model API call (e.g. PlantNet API or on-device ML model)
    // Process point cloud + RGB frames from the AR session to locate and classify plants
    void scanData;
    return Promise.resolve([]);
  }
}

export const plantIdentificationService = new PlantIdentificationService();
