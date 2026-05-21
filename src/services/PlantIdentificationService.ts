import * as FileSystem from 'expo-file-system';
import { geminiEndpoint, hasApiAccess } from './ApiConfig';

const GEMINI_PATH = '/v1beta/models/gemini-2.5-flash:generateContent';

const IDENTIFY_PROMPT = `Look at this image and identify any plant(s) you can see.
Return a JSON array of up to 5 results, sorted by confidence (highest first).
Each result must have exactly these fields:
- species: scientific name (e.g. "Cucumis sativus")
- commonName: common name in English (e.g. "Cucumber")
- confidence: number between 0 and 1

If no plant is visible, return an empty array [].
Return ONLY the JSON array, no markdown, no explanation.`;

export interface IdentificationResult {
  species: string;
  commonName: string;
  confidence: number;
}

export class PlantIdentificationService {
  async identifyFromImageUri(imageUri: string): Promise<IdentificationResult[]> {
    if (!hasApiAccess()) {
      throw new Error(
        'Geen API-toegang. Stel EXPO_PUBLIC_GEMINI_API_KEY of EXPO_PUBLIC_API_PROXY_URL in.',
      );
    }

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { url, headers } = geminiEndpoint(GEMINI_PATH);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: IDENTIFY_PROMPT },
              { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API fout: ${response.status}`);
    }

    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const results = JSON.parse(cleaned);
      return Array.isArray(results) ? results : [];
    } catch {
      return [];
    }
  }
}

export const plantIdentificationService = new PlantIdentificationService();
