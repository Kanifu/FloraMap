# FloraMap — Product Design Document

> **Versie:** 1.3.0 · **Datum:** mei 2026 · **Auteur:** Jordy Zinkstok

---

## 1. Product Vision

FloraMap is een mobiele tuinplannerapp die de kloof overbrugt tussen het spontaan aan de slag gaan in de tuin en het bewust bijhouden van plantenverzorging. De gebruiker legt zijn tuin digitaal vast op een interactieve kaart, laat planten herkennen via AI, en krijgt een persoonlijk onderhoudsschema met dagelijkse herinneringen.

**Kernbelofte:** Jouw tuin in één oogopslag, met AI die het zware denkwerk overneemt.

**Doelgroep:** Hobbytuiniers (25–55 jaar) die meer structuur willen in hun tuin maar geen professionele tuinierssoftware nodig hebben.

---

## 2. Huidige staat (v1.3.0)

### Versiegeschiedenis

| Versie | Release | Wat er nieuw was |
|--------|---------|------------------|
| 1.0.0  | 2026-04 | MVP: kaart, AI-scan, assistent, onderhoud |
| 1.1.0  | 2026-05 | Scan-fix, gestylede menus, zone-kleuren, app-icoon, About-scherm |
| 1.2.0  | 2026-05 | Cloudflare Worker proxy, privacy policy, Play Store prep |
| 1.3.0  | 2026-05 | Timeline-tabs, zaai-flow, plant-notities, Play Store vereisten |

---

## 3. Schermen & functionaliteiten

### 3.1 Tuin (MapScreen) — `src/screens/MapScreen/`

De centrale kaartweergave. Toont een interactief SVG-raster van 25 × 25 cellen (elke cel = 30 × 30 cm).

**Functies:**
- **Plant plaatsen via scan** — camera of galerij → Google Gemini herkent plant → tik op kaart om te plaatsen
- **Handmatig toevoegen** — teken een enkel punt of een zone door twee hoeken aan te tikken
- **Type selector** bij handmatige invoer: 🌿 Plant / 🌱 Zaad / 🪴 Zaailing / ✂️ Stek (elk met eigen starttaken)
- **Notitie** — vrij tekstveld bij aanmaken of via lang-indruk menu
- **Lang-indruk menu** (gestijld, in app-kleurenschema):
  - Verplaatsen
  - Formaat wijzigen / uitrekken tot zone
  - Kleur wijzigen (kleurenpalet, alleen voor zones)
  - Notitie bewerken (inline tekstveld)
  - Verwijderen
  - Annuleren
- **Overdue badge** in header: aantal verlopen taken
- **Tuin verwijderen** — knop in header met bevestigingsdialoog
- **Lege staat** — twee knoppen: Scan planten + Handmatig toevoegen

**Plant types en hun starttaken:**

| Type | Begieten | Extra taak |
|------|----------|------------|
| Plant | elke 7 dagen | — |
| Zaad | elke 2 dagen | Verspeen/verplant na 6 weken |
| Zaailing | elke 3 dagen | Verplant naar buiten na 3 weken |
| Stek | elke 2 dagen | Controleer beworteling na 2 weken |

---

### 3.2 Assistent (AssistantScreen) — `src/screens/AssistantScreen/`

Chatinterface met Google Gemini als tuinassistent.

**Functies:**
- Vrij tekstgesprek over tuinadvies, companion planting, seizoenstips
- Foto meesturen (camera of galerij) voor plantherkenning tijdens chat
- Gestructureerde output parsing:
  - `PLANTS:[...]` — herkende planten direct toeveogen aan de tuin
  - `TASKS:[...]` — gedetecteerde onderhoudsproblemen (urgentie: high/medium/low)
- Kaarten volledig breed en variabele hoogte (geen afkapping)
- Contextbewust: de assistent weet welke planten al in de tuin staan

---

### 3.3 Onderhoud (MaintenanceScreen) — `src/screens/MaintenanceScreen/`

Persoonlijk onderhoudsschema met drie tabs.

**Tab 1 — Taken (standaard)**
- Taken ingedeeld in: Vandaag & achterstallig / Deze week / Later
- Overdue taken gemarkeerd in rood
- Herhalende taken tonen ↺-badge
- ✓ Klaar knop per taak → volgende herhaling wordt automatisch ingepland
- Regencheck (Open-Meteo API): bij verwachte regen krijgen begietingstaken een grijze stijl met melding
- Seizoenstip bovenaan (maandspecifiek)
- Oogstmaand-alert (geel, toont planten die deze maand geoogst kunnen worden)
- Tuintaken (van AI gedetecteerde problemen) onderaan

**Tab 2 — Planning**
- Komende 30 dagen, gegroepeerd per datum
- Alleen dagen met taken worden getoond
- Datum labels: "Vandaag", "Morgen", "di 26 mei", etc.
- Taken direct klaar markeren vanuit de planning

**Tab 3 — Geschiedenis**
- Alle voltooide taken, gesorteerd op datum aflopend
- Gegroepeerd per kalendermaand
- Toont tijdstip van voltooiing

---

### 3.4 PlantCard (PlantCardScreen) — `src/screens/PlantCardScreen/`

Detailweergave van een individuele plant. Toegankelijk via tik op plant in Onderhoud of navigatie vanuit kaart.

---

### 3.5 About (AboutScreen) — `src/screens/AboutScreen/`

Informatiescherm.

**Bevat:**
- App-versienummer (pill-badge)
- Technische info: platform, AI-model, weerdata
- Licentie (MIT) en copyright
- Open source libraries
- Ontwikkelaarsgegevens (Jordy Zinkstok, LinkedIn, e-mail)
- Links: Privacybeleid, Open-Meteo, Google Gemini API

---

## 4. Datamodel

```typescript
// src/models/index.ts

interface Plant {
  id: string;
  gardenId: string;
  species: string;           // wetenschappelijke naam
  commonName: string;        // gewone naam
  x: number;                 // kolom op raster (1-indexed)
  y: number;                 // rij op raster (1-indexed)
  z: number;
  width?: number;            // cellen breed (1 = stip)
  height?: number;           // cellen hoog (1 = stip)
  color?: string;            // vulkleur voor zones
  plantedDate?: string;      // ISO 8601
  sowDate?: string;          // ISO 8601 (voor zaden)
  lastMaintenanceDate?: string;
  maintenanceTasks: MaintenanceTask[];
  lightExposure?: 'full_sun' | 'partial_shade' | 'full_shade';
  identificationConfidence: number;  // 0–1
  imageUri?: string;         // lokaal pad naar foto
  careTips?: string[];
  harvestMonths?: number[];  // 0-indexed (0=jan, 11=dec)
  notes?: string;            // vrije notitie
  addedVia?: 'scan' | 'manual' | 'seed' | 'seedling' | 'cutting';
}

interface MaintenanceTask {
  id: string;
  plantId: string;
  type: 'water' | 'prune' | 'fertilize' | 'repot' | 'treat';
  dueDate: string;           // ISO 8601
  completedDate?: string;    // ISO 8601 — ingevuld bij voltooiing
  notes?: string;
  intervalDays?: number;     // indien ingesteld: herhalende taak
}

interface Garden {
  id: string;
  userId: string;
  name: string;
  polygons: GardenPolygon[];
  plants: Plant[];
  zones?: PlantZone[];
  tasks?: GardenTask[];      // AI-gedetecteerde tuintaken
  lastScannedAt?: string;
  northOrientationDeg?: number;
}
```

**State management:** Zustand v5 met AsyncStorage persistentie (alles lokaal op apparaat).

---

## 5. Technische architectuur

### 5.1 Stack

| Laag | Technologie |
|------|------------|
| Framework | React Native 0.76 + Expo SDK 52 |
| Taal | TypeScript (strict) |
| Navigatie | React Navigation v7 (bottom tabs + stack) |
| State | Zustand v5 + AsyncStorage persistentie |
| Kaart | react-native-svg 15.8 — SVG-raster rendering |
| AI | Google Gemini 3.5 Flash (chat + plantherkenning) |
| Weer | Open-Meteo API (gratis, geen sleutel) |
| Notificaties | expo-notifications ~0.28 |
| Camera | expo-camera + expo-image-picker |
| Build | EAS Build (Expo Application Services) |
| Deploy | EAS Submit → Google Play Store |

### 5.2 Navigatiestructuur

```
AppNavigator (Bottom Tabs)
├── MapTab  🗺️  "Tuin"
│   └── MapStack
│       ├── MapScreen          (kaart + planten)
│       └── PlantCardScreen    (plantdetail)
├── AssistantTab  🌿  "Assistent"
│   └── AssistantStack
│       └── AssistantScreen    (AI-chat)
└── MaintenanceTab  🔔  "Onderhoud"
    └── MaintenanceStack
        ├── MaintenanceScreen  (taken + planning + geschiedenis)
        ├── PlantCardScreen    (plantdetail)
        └── AboutScreen        (info)
```

### 5.3 Services

| Service | Verantwoordelijkheid |
|---------|---------------------|
| `ApiConfig.ts` | Kiest proxy-URL (productie) of directe Gemini-URL (dev) |
| `GardenAssistantService.ts` | Gemini chat met PLANTS:/TASKS: output parsing |
| `PlantIdentificationService.ts` | Gemini vision-only identificatie |
| `NotificationService.ts` | Dagelijkse 8:00-push notificatie met taakstatus |
| `StorageService.ts` | Hulpfuncties voor AsyncStorage |
| `ARService.ts` | AR-scanner (toekomstig) |

### 5.4 API-sleutelstrategie

```
Ontwikkeling (lokaal):
  .env  →  EXPO_PUBLIC_GEMINI_API_KEY  →  directe Gemini API

Productie (EAS build):
  EAS Secrets  →  EXPO_PUBLIC_API_PROXY_URL
              →  EXPO_PUBLIC_API_TOKEN
              →  Cloudflare Worker  →  Gemini API
                 (API-sleutel nooit in app binary)
```

De Cloudflare Worker (`cloudflare-worker/`) staat klaar in de repo maar is nog niet deployed (zie Issue #5).

---

## 6. AI-integratie

### Plantherkenning (scan)
- Model: `gemini-2.5-flash`
- Input: base64 JPEG
- Output: JSON-array met `species`, `commonName`, `confidence`
- Foutafhandeling: 3 retries bij 503, specifieke foutmeldingen bij 429/andere

### Tuinassistent (chat)
- Model: `gemini-3.5-flash`
- System prompt: contextbewust (welke planten staan al in de tuin)
- Gestructureerde output markers:
  - `PLANTS:[...]` — herkende planten met `waterIntervalDays`, `fertilizeIntervalDays`, `harvestMonths`
  - `TASKS:[...]` — gedetecteerde problemen met urgentie
- Conversatiegeschiedenis meegegeven voor context
- `thinkingConfig: { thinkingLevel: 'minimal' }` voor snelheid

### Gemini system prompt bevat instructies voor:
- Companion planting advies
- Plantplaatsing (zon, schaduw, ruimte, buren)
- Verzorging, ziektes, seizoenstips
- Herkennen van onderhoudsproblemen in foto's
- Altijd antwoorden in de taal van de gebruiker

---

## 7. Notificaties

- Dagelijks om 08:00 lokale tijd (repeating trigger)
- Inhoud dynamisch berekend bij het inplannen:
  - Aantal achterstallige + vandaag-taken
  - Oogstmaand-alert bij relevante planten
- Permissie gevraagd bij eerste app-start
- Herplanning automatisch bij wijziging in tuindata (via `useEffect` in `App.tsx`)

---

## 8. Beveiliging & privacy

- Geen gebruikersaccounts (v1.x) — alles lokaal opgeslagen
- Gemini API-sleutel nooit in git (`.gitignore` + `.env`)
- Productie: sleutel server-side via Cloudflare Worker
- `google-service-account.json` in `.gitignore`
- Privacy policy: `assets/web/privacy-policy.html` (hostbaar op GitHub Pages)
- AVG/GDPR compliant: geen tracking, geen analytics, data op apparaat

---

## 9. Play Store configuratie

```json
// app.json (relevant fragment)
{
  "version": "1.3.0",
  "android": {
    "package": "com.floramap.app",
    "versionCode": 1,
    "permissions": ["android.permission.CAMERA"]
  }
}
```

```json
// eas.json
{
  "build": {
    "preview":    { "android": { "buildType": "apk" } },
    "production": { "android": { "buildType": "app-bundle" } }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## 10. Backlog & roadmap

De backlog wordt bijgehouden als GitHub Issues op [github.com/kanifu/floramap](https://github.com/kanifu/floramap/issues).

### Open issues

#### #5 — Cloudflare Worker proxy deployen *(infrastructure)*
Code staat klaar in `cloudflare-worker/`. Vereist: Cloudflare account, `wrangler deploy`, secrets instellen. Blokkeert veilige productie release.

#### #4 — Play Store publicatie: listing assets en indiening *(release)*
Checklist: screenshots, feature graphic, beschrijvingstekst NL/EN, data safety sectie, content rating, service account key, `eas submit`.

#### #3 — Plant icoontjes / minifoto's op de tuinkaart *(enhancement)*
Planten op de kaart herkenbaar maken. Voorkeursstrategie: foto-thumbnail als `imageUri` beschikbaar, anders emoji op soort, anders eerste letter. Implementatie in `GardenMap.tsx`.

#### #2 — Freemium model: gebruikersaccounts + gebruikslimieten *(enhancement)*
Firebase Auth voor accounts, Firestore voor cloud sync. Gratis tier: 3 AI-scans/maand, 1 tuin, 25 planten. Premium (€1,99/mnd of €9,99): onbeperkt + cloud backup. Vereist: Worker live (#5) + Play Store actief (#4).

### Suggesties voor toekomstige versies

| Idee | Omschrijving |
|------|-------------|
| Tuinagenda-export | `.ics` export van onderhoudstaken voor Google/Apple Calendar |
| Meerdere tuinen | Meerdere tuinen per account (premiumfunctie) |
| Companion planting overlay | Visualiseer goede/slechte plantcombinaties op de kaart |
| Groeifasen bijhouden | Foto's per plant over tijd, groei-log |
| Widget (Android) | Thuisscherm-widget met eerstvolgende taak |
| Weerlocatie | Echte GPS-coördinaten gebruiken i.p.v. vaste Amsterdam-coördinaten |
| Exporteren/importeren | JSON-backup van tuindata |
| Donkere modus | Dark theme |

---

## 11. Ontwikkelworkflow

```bash
# Lokaal starten
npx expo start --android

# Preview APK bouwen
eas build --platform android --profile preview

# Productie AAB bouwen
eas build --platform android --profile production

# Indienen bij Play Store
eas submit --platform android --profile production
```

**Branches:** Alle ontwikkeling op `claude/project-brief-design-VvdBB` → merge naar `main` bij release.

**Semantic versioning:**
- `0.0.x` — bugfix
- `0.x.0` — nieuwe functionaliteit
- `x.0.0` — volledige overhaul

Bij elke versie: `android.versionCode` met 1 ophogen in `app.json`.

---

## 12. Bestanden overzicht

```
FloraMap/
├── App.tsx                          # Root: notificaties + navigatie
├── app.json                         # Expo config + Android instellingen
├── eas.json                         # Build + submit profielen
├── .env.example                     # API-sleutel documentatie
├── .gitignore                       # .env, google-service-account.json, etc.
│
├── assets/
│   ├── icon.png                     # App-icoon 1024×1024 (donkergroen + blad)
│   ├── adaptive-icon.png            # Android adaptief icoon
│   └── web/
│       └── privacy-policy.html      # AVG-privacybeleid (hostbaar op GitHub Pages)
│
├── cloudflare-worker/
│   ├── worker.js                    # Gemini proxy met token-check + rate limiting
│   ├── wrangler.toml                # Cloudflare deploy config
│   └── README.md                    # Setup instructies
│
└── src/
    ├── models/index.ts              # Plant, Garden, MaintenanceTask interfaces
    ├── store/gardenStore.ts         # Zustand store met AsyncStorage persistentie
    ├── navigation/AppNavigator.tsx  # Bottom tabs + stack navigators
    │
    ├── services/
    │   ├── ApiConfig.ts             # Proxy vs. directe API routing
    │   ├── GardenAssistantService.ts# Gemini chat + structured output parsing
    │   ├── PlantIdentificationService.ts # Gemini vision identificatie
    │   ├── NotificationService.ts   # Dagelijkse push notificatie scheduling
    │   └── StorageService.ts        # AsyncStorage helpers
    │
    ├── components/
    │   ├── GardenMap/               # SVG kaart (raster, planten, zones, polygonen)
    │   └── PlantIcon/               # Plantbadge met emoji + overdue-indicator
    │
    └── screens/
        ├── MapScreen/               # Kaart, scan, handmatig toevoegen, menu
        ├── AssistantScreen/         # AI-chat met foto-ondersteuning
        ├── MaintenanceScreen/       # Taken | Planning | Geschiedenis tabs
        ├── PlantCardScreen/         # Plantdetail
        └── AboutScreen/             # Versie, licentie, developer, privacy
```

---

*FloraMap — Jouw slimme tuinplanner · MIT License · © 2026 Jordy Zinkstok*
