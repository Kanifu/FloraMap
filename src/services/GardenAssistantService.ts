import * as FileSystem from 'expo-file-system';
import { MaintenanceTask, MaintenanceTaskType } from '@/models';
import { geminiEndpoint, hasApiAccess } from './ApiConfig';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_PATH = `/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  waterIntervalDays?: number;     // how often to water (days)
  fertilizeIntervalDays?: number; // how often to fertilize (days)
  harvestMonths?: number[];       // 0-indexed months (0=Jan, 5=Jun)
  plantFamily?: string;           // for crop rotation checks
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

/** Build initial recurring MaintenanceTasks for a newly added plant. */
export const createInitialTasksForPlant = (
  plantId: string,
  identified: IdentifiedPlant,
): MaintenanceTask[] => {
  const tasks: MaintenanceTask[] = [];
  const now = new Date();

  const addTask = (type: MaintenanceTaskType, intervalDays: number) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + intervalDays);
    tasks.push({
      id: `${Date.now()}-${type}-${Math.random().toString(36).slice(2, 6)}`,
      plantId,
      type,
      dueDate: dueDate.toISOString(),
      intervalDays,
    });
  };

  if (identified.waterIntervalDays) addTask('water', identified.waterIntervalDays);
  if (identified.fertilizeIntervalDays) addTask('fertilize', identified.fertilizeIntervalDays);

  return tasks;
};

export class GardenAssistantService {

  private buildSystemPrompt(gardenPlants: string[], hasImage: boolean): string {
    const plantList =
      gardenPlants.length > 0 ? gardenPlants.join('; ') : 'nog geen planten';

    const lengthInstruction = hasImage
      ? 'Bij foto-analyse: geef een volledige analyse. Stuur altijd de complete PLANTS: en TASKS: regels mee — sla deze nooit af.'
      : 'Geef korte, directe antwoorden — maximaal 3-4 zinnen tenzij meer detail echt nodig is.';

    return `Je bent FloraMap, een tuinassistent. Antwoord altijd in de taal van de gebruiker.
${lengthInstruction}

Huidige tuin (naam, soort, positie op raster):
${plantList}

Je kunt advies geven over:
- Companion planting: welke planten goed of slecht naast elkaar groeien
- Waar nieuwe planten het beste passen (zon, schaduw, ruimte, buren)
- Verzorging, ziektes en seizoenstips

Als je een of meer planten herkent in een foto, scan elke plant voor 2-3 concrete verzorgingstips en voeg toe (één regel, geen markdown):
PLANTS:[{"species":"wetenschappelijke naam","commonName":"gewone naam","confidence":0.92,"careTips":["tip1","tip2"],"waterIntervalDays":2,"fertilizeIntervalDays":14,"harvestMonths":[5,6]}]

Veld uitleg:
- waterIntervalDays: hoe vaak begieten in dagen (bijv. 2 voor tomaten, 7 voor cactus). Laat weg als onbekend.
- fertilizeIntervalDays: hoe vaak bemesten in dagen (bijv. 14). Laat weg als onbekend.
- harvestMonths: lijst van maandnummers (0=januari, 5=juni) waarop oogst verwacht kan worden. Laat weg voor niet-oogstbare planten.

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
    if (!hasApiAccess()) {
      throw new Error('Geen API-toegang. Stel EXPO_PUBLIC_GEMINI_API_KEY of EXPO_PUBLIC_API_PROXY_URL in.');
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

    // Foto-analyse heeft meer tokens nodig: PLANTS+TASKS JSON + uitleg kan 2000+ tokens zijn.
    // Text-chat is doorgaans <500 tokens. Gemini 2.5 Flash ondersteunt tot 65 536 output tokens.
    const maxOutputTokens = imageUri ? 8192 : 4096;

    const { url, headers } = geminiEndpoint(GEMINI_PATH);
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: this.buildSystemPrompt(gardenPlants, !!imageUri) }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens,
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

    // Onderscheid: bij foto-analyse is afkappen een technisch probleem, niet de schuld van de vraag.
    const fullText = finishReason === 'MAX_TOKENS'
      ? rawText + (imageUri
          ? '\n\n_(Analyse onvolledig — probeer een foto met minder planten of een betere belichting.)_'
          : '\n\n_(Antwoord afgekapt — stel je vraag in kleinere stukjes.)_')
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
