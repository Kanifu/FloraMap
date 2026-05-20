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
  identifiedPlant?: IdentifiedPlant;
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
      gardenPlants.length > 0 ? gardenPlants.join(', ') : 'nog geen planten toegevoegd';

    return `Je bent FloraMap, een behulpzame tuinassistent. Je helpt gebruikers planten te identificeren, vragen over plantenverzorging te beantwoorden en hun tuin te beheren.

Huidige tuin: ${plantList}

Wanneer je een plant herkent in een foto, geef:
1. De gewone naam en wetenschappelijke naam
2. Korte verzorgingstips
3. Relevante seizoensgebonden informatie

Houd antwoorden beknopt en praktisch. Antwoord in de taal van de gebruiker.

Als je een plant identificeert vanuit een foto, voeg dan op de LAATSTE REGEL van je antwoord dit toe (en niets anders op die regel):
PLANT:{"species":"wetenschappelijke naam","commonName":"gewone naam","confidence":0.9}
Laat deze regel weg als er geen plant identificatie is.`;
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
            { text: turn.text || 'Wat is deze plant?' },
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
      if (!userText) currentParts.unshift({ text: 'Wat is deze plant?' });
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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
    let identifiedPlant: IdentifiedPlant | undefined;
    let displayText = fullText;

    if (lastLine.startsWith('PLANT:')) {
      try {
        identifiedPlant = JSON.parse(lastLine.slice(6)) as IdentifiedPlant;
        displayText = lines.slice(0, -1).join('\n').trim();
      } catch {
        // keep fullText as-is
      }
    }

    return { text: displayText, identifiedPlant };
  }
}

export const gardenAssistantService = new GardenAssistantService();
