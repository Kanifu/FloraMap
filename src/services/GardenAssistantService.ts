import * as FileSystem from 'expo-file-system';

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, init: RequestInit, retries = 3): Promise<Response> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 503 || attempt === retries) return res;
    await sleep(1000 * Math.pow(2, attempt));
  }
  throw new Error('Gemini niet beschikbaar na meerdere pogingen.');
};

export interface IdentifiedPlant {
  species: string;
  commonName: string;
  confidence: number;
  careTips?: string[];
}

export interface AssistantTask {
  description: string;
  urgency: 'high' | 'medium' | 'low';
  plantName?: string;
}

export interface AssistantResponse {
  text: string;
  identifiedPlants?: IdentifiedPlant[];
  detectedTasks?: AssistantTask[];
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
      gardenPlants.length > 0 ? gardenPlants.join('; ') : 'nog geen planten';

    return `Je bent FloraMap, een beknopte tuinassistent. Antwoord altijd in de taal van de gebruiker.
Geef korte, directe antwoorden — maximaal 3-4 zinnen tenzij meer detail echt nodig is.

Huidige tuin (naam, soort, positie op raster):
${plantList}

Je kunt advies geven over:
- Companion planting: welke planten goed of slecht naast elkaar groeien
- Waar nieuwe planten het beste passen (zon, schaduw, ruimte, buren)
- Verzorging, ziektes en seizoenstips

Als je een of meer planten herkent in een foto, scan elke plant voor 2-3 concrete verzorgingstips en voeg toe (één regel, geen markdown):
PLANTS:[{"species":"wetenschappelijke naam","commonName":"gewone naam","confidence":0.92,"careTips":["tip1","tip2"]}]

Als je in een foto ook onderhoudsproblemen ziet (onkruid, zieke bladeren, droogstress, beschadiging, overrijpe vruchten), voeg toe (één regel, geen markdown):
TASKS:[{"description":"wat er gedaan moet worden","urgency":"high","plantName":"plantnaam of leeg"}]
urgency: "high" = vandaag, "medium" = binnen 3 dagen, "low" = binnen een week.

Beide regels mogen tegelijk aanwezig zijn. Laat een regel weg als die niet van toepassing is.`;
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
      if (!userText) currentParts.unshift({ text: 'Identificeer alle planten en eventuele onderhoudsproblemen in deze foto.' });
    }
    contents.push({ role: 'user', parts: currentParts });

    const response = await fetchWithRetry(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: this.buildSystemPrompt(gardenPlants) }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 503) throw new Error('Gemini is momenteel overbelast. Probeer het opnieuw.');
      if (status === 429) throw new Error('Te veel verzoeken. Even wachten en opnieuw proberen.');
      throw new Error(`Gemini API fout: ${status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const finishReason: string = candidate?.finishReason ?? '';
    const rawText: string = candidate?.content?.parts?.[0]?.text ?? 'Geen antwoord ontvangen.';
    const fullText = finishReason === 'MAX_TOKENS'
      ? rawText + '\n\n_(Antwoord afgekapt — stel een kortere vraag voor meer detail.)_'
      : rawText;

    // Scan all lines for structured markers, then strip them from display text
    let identifiedPlants: IdentifiedPlant[] | undefined;
    let detectedTasks: AssistantTask[] | undefined;

    const displayLines = fullText.split('\n').filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('PLANTS:')) {
        try {
          const parsed = JSON.parse(trimmed.slice(7));
          identifiedPlants = Array.isArray(parsed) ? parsed : [parsed];
        } catch { /* ignore parse error */ }
        return false;
      }
      if (trimmed.startsWith('TASKS:')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          detectedTasks = Array.isArray(parsed) ? parsed : [parsed];
        } catch { /* ignore parse error */ }
        return false;
      }
      return true;
    });

    return {
      text: displayLines.join('\n').trim(),
      identifiedPlants,
      detectedTasks,
    };
  }
}

export const gardenAssistantService = new GardenAssistantService();
