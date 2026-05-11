import { arService } from '@/services/ARService';
import { plantIdentificationService } from '@/services/PlantIdentificationService';
import { Garden, DiffProposal } from '@/models';
import { detectDiff } from '@/modules/diff/DiffDetection';

export class SmartScan {
  async runFullScan(): Promise<Garden> {
    await arService.startScan();
    const scanResult = await arService.stopScan();
    const identifiedPlants = await plantIdentificationService.identifyFromScan(scanResult);
    return {
      ...scanResult.gardenSnapshot,
      plants: identifiedPlants,
    };
  }

  async runUpdateScan(existingGarden: Garden): Promise<DiffProposal[]> {
    const imageUri = await arService.captureUpdatePhoto();
    const identificationResults = await plantIdentificationService.identifyFromImage(imageUri);

    const incomingPlants = identificationResults.map((result, index) => ({
      id: `incoming-${index}`,
      gardenId: existingGarden.id,
      species: result.species,
      commonName: result.commonName,
      x: 0,
      y: 0,
      z: 0,
      maintenanceTasks: [],
      identificationConfidence: result.confidence,
    }));

    return detectDiff(existingGarden.plants, incomingPlants);
  }
}
