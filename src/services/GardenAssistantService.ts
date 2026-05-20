import * as FileSystem from 'expo-file-system';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface IdentifiedPlant {
  species: string;
  commonName: string;
  confidence: number;
}

export interface AssistantResponse {
  text: string;
  identifiedPlants?: IdentifiedPlant[];
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  imageUri?: string;
}

export class GardenAssistantService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  }

  private buildSystemPrompt(gardenPlants: string[]): string {
    const plantList =
      gardenPlants.length > 0 ? gardenPlants.join(', ') : 'nog geen planten';

    return `Je bent FloraMap, een beknopte tuinassistent. Antwoord altijd in de taal van de gebruiker.
Tuin: ${plantList}.
Geef korte, directe antwoorden — maximaal 3-4 zinnen tenzij meer detail echt nodig is.
Bij plantenidentificatie vanuit een foto: noem gewone naam, wetenschappelijke naam en 1-2 concrete verzorgingstips.

Als je een of meer planten herkent in een foto, voeg op de LAATSTE REGEL van je antwoord exact dit toe:
PLANTS:[{"species":"wetenschappelijke naam","commonName":"gewone naam","confidence":0.92}]
Je mag meerdere objecten in de array plaatsen als er meerdere planten zichtbaar zijn.
Laat deze regel volledig weg als er geen plant te identificeren is.`;
  }

  async chat(
    userText: string,
    imageUri: string | null,
    history: ChatTurn[],
    gardenPlants: string[],
  ): Promise<AssistantResponse> {
    if (!this.apiKey) {
      throw new Error('Geen Gemini API-sleutel gevonden. Voeg EXPO_PUBLIC_GEMINI_API_KEY toe aan .env.');
    }

    const contents = [];

    for (const turn of history) {
      if (turn.imageUri) {
        const base64 = await FileSystem.readAsStringAsync(turn.imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        contents.push({
          role: 'user',
          parts: [
            { text: turn.text || 'Wat zijn de planten in deze foto?' },
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          ],
        });
      } else {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.text }],
        });
      }
    }

    const currentParts: object[] = [];
    if (userText) currentParts.push({ text: userText });
    if (imageUri) {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
      if (!userText) currentParts.unshift({ text: 'Identificeer alle planten in deze foto.' });
    }
    contents.push({ role: 'user', parts: currentParts });

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: this.buildSystemPrompt(gardenPlants) }],
        },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API fout: ${response.status}`);
    }

    const data = await response.json();
    const fullText: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Geen antwoord ontvangen.';

    const lines = fullText.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    let identifiedPlants: IdentifiedPlant[] | undefined;
    let displayText = fullText;

    if (lastLine.startsWith('PLANTS:')) {
      try {
        const parsed = JSON.parse(lastLine.slice(7));
        identifiedPlants = Array.isArray(parsed) ? parsed as IdentifiedPlant[] : [parsed as IdentifiedPlant];
        displayText = lines.slice(0, -1).join('\n').trim();
      } catch {
        // keep fullText as-is
      }
    }

    return { text: displayText, identifiedPlants };
  }
}

export const gardenAssistantService = new GardenAssistantService();
