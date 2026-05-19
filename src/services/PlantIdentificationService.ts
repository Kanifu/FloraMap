const PLANTNET_URL = 'https://my-api.plantnet.org/v2/identify/all';

interface PlantNetSpecies {
  scientificNameWithoutAuthor: string;
  commonNames: string[];
}

interface PlantNetApiResult {
  score: number;
  species: PlantNetSpecies;
}

export interface IdentificationResult {
  species: string;
  commonName: string;
  confidence: number;
}

export class PlantIdentificationService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_PLANTNET_API_KEY ?? '';
  }

  async identifyFromImageUri(imageUri: string): Promise<IdentificationResult[]> {
    if (!this.apiKey) {
      throw new Error('Geen PlantNet API-sleutel gevonden. Maak een .env bestand aan met EXPO_PUBLIC_PLANTNET_API_KEY.');
    }

    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'plant.jpg',
    } as unknown as Blob);
    formData.append('organs', 'auto');

    const response = await fetch(
      `${PLANTNET_URL}?api-key=${this.apiKey}&lang=en&nb-results=5`,
      { method: 'POST', body: formData },
    );

    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`PlantNet API fout: ${response.status}`);
    }

    const data: { results: PlantNetApiResult[] } = await response.json();
    return data.results.map((r) => ({
      species: r.species.scientificNameWithoutAuthor,
      commonName: r.species.commonNames?.[0] ?? r.species.scientificNameWithoutAuthor,
      confidence: r.score,
    }));
  }
}

export const plantIdentificationService = new PlantIdentificationService();
