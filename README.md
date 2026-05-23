# 🌿 FloraMap

**Jouw slimme tuinplanner** — plan en beheer je tuin, herken planten met AI, en houd onderhoudstaken bij.

[![Version](https://img.shields.io/badge/versie-1.4.0-2d6a4f?style=flat-square)](app.json)
[![Platform](https://img.shields.io/badge/platform-Android-brightgreen?style=flat-square)](https://play.google.com)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052-000?style=flat-square&logo=expo)](https://expo.dev)
[![License](https://img.shields.io/badge/licentie-MIT-blue?style=flat-square)](LICENSE)

---

## 📋 Inhoudsopgave

- [Wat doet FloraMap?](#wat-doet-floramap)
- [Schermen](#schermen)
- [Technische stack](#technische-stack)
- [Architectuur](#architectuur)
- [Installatie & lokaal draaien](#installatie--lokaal-draaien)
- [Omgevingsvariabelen](#omgevingsvariabelen)
- [Cloudflare Worker proxy](#cloudflare-worker-proxy)
- [Bouwen voor Play Store](#bouwen-voor-play-store)
- [Versiegeschiedenis](#versiegeschiedenis)
- [GitHub Issues & backlog](#github-issues--backlog)
- [Licentie](#licentie)

---

## Wat doet FloraMap?

FloraMap is een React Native tuinplanner voor Android (iOS-ready) die je helpt bij het plannen, bijhouden en verzorgen van je tuin.

| Functie | Details |
|---|---|
| 🗺️ **Interactieve tuinkaart** | Sleep-en-drop planten op een 25×25 raster (1 cel = 30×30 cm), teken zones |
| 📷 **AI-plantenherkenning** | Foto scannen → Google Gemini 2.5 Flash herkent de soort en geeft verzorgingstips |
| ✅ **Onderhoudstaken** | Water geven, snoeien, bemesten, verpotten, behandelen — herhalen automatisch |
| 📅 **Planning & tijdlijn** | 30-dagenplanning gegroepeerd per dag, inclusief seizoenstips |
| 📋 **Taakgeschiedenis** | Alle voltooide taken gesorteerd per maand |
| 🌧️ **Weersintegratie** | Lokale regenvoorspelling via Open-Meteo — begieten wordt gemarkeerd bij verwachte neerslag |
| 📸 **Groeifotodagboek** | Voeg foto's toe per plant om de groei bij te houden |
| 🌱 **Zaad/zaailing/stek** | Specifieke starttaken per toevoegmethode |
| 💾 **Backup & herstel** | JSON-export en -import van je volledige tuin |
| 📆 **Kalenderexport** | Exporteer taken als .ics-bestand (Apple Calendar, Google Calendar, Outlook) |
| 🤖 **AI-assistent** | Stel vragen over je tuin in een chatinterface |
| 🔔 **Dagelijkse notificaties** | Push-herinnering elke ochtend om 08:00 |

---

## Schermen

| Scherm | Beschrijving |
|---|---|
| **MapScreen** | Interactieve tuinkaart met drag-drop, zones, scan-knop en onboarding |
| **MaintenanceScreen** | Taken (swipe-to-complete), Planning (30d), Geschiedenis |
| **PlantCardScreen** | Plantdetails, bewerken, fotodagboek, taakgeschiedenis |
| **AssistantScreen** | AI-chatbot voor tuinvragen |
| **AboutScreen** | App-info, backup/restore, links |

---

## Technische stack

| Laag | Technologie |
|---|---|
| Framework | React Native 0.76 + Expo SDK 52 (managed workflow) |
| Taal | TypeScript (strict mode) |
| Navigatie | React Navigation v7 — bottom tabs + stack |
| State | Zustand v5 met AsyncStorage persistentie |
| Kaart | react-native-svg 15.8 — SVG grid renderer |
| AI | Google Gemini 2.5 Flash (plantenherkenning + assistent) |
| API-beveiliging | Cloudflare Worker proxy — sleutel nooit in de app |
| Weer | Open-Meteo REST API (gratis, geen account nodig) |
| Locatie | expo-location — GPS gecached 6 uur, fallback Amsterdam |
| Notificaties | expo-notifications — dagelijkse push om 08:00 |
| Foto's | expo-image-picker — camera + galerij |
| Delen | expo-sharing + expo-file-system |
| Kalender | RFC 5545 .ics generatie |
| Gebaren | react-native-gesture-handler (swipe-to-complete) |

---

## Architectuur

```
FloraMap/
├── App.tsx                         # Root: GestureHandlerRootView + navigatie
├── app.json                        # Expo config (v1.4.0)
├── cloudflare-worker/
│   └── worker.js                   # Gemini API proxy (deploy naar Cloudflare)
└── src/
    ├── components/
    │   ├── GardenMap/              # SVG tuinkaart component
    │   └── OnboardingModal/        # 3-staps welkomsmodal
    ├── models/
    │   └── index.ts                # TypeScript interfaces (Plant, Garden, etc.)
    ├── navigation/
    │   └── AppNavigator.tsx        # Bottom tabs + stack navigators
    ├── screens/
    │   ├── MapScreen/              # Tuinkaart + handmatig/scan toevoegen
    │   ├── MaintenanceScreen/      # Onderhoudstaken met tabs
    │   ├── PlantCardScreen/        # Plantdetailpagina
    │   ├── AssistantScreen/        # AI-chatbot
    │   └── AboutScreen/            # Info + backup/restore
    ├── services/
    │   ├── ApiConfig.ts            # Proxy/direct API routing
    │   ├── GardenAssistantService.ts  # Gemini chat + plantenherkenning
    │   └── NotificationService.ts  # Dagelijkse push-notificaties
    ├── store/
    │   └── gardenStore.ts          # Zustand store + persistentie
    └── utils/
        ├── dateUtils.ts            # relativeDueLabel(), shortDate(), fullDateTime()
        ├── icsExport.ts            # RFC 5545 kalenderexport
        └── location.ts             # GPS + 6-uurs cache
```

### Datamodel (kern)

```typescript
Plant {
  id, gardenId, species, commonName
  x, y, z                   // rastercoördinaten
  width?, height?, color?    // voor zones
  maintenanceTasks[]         // water/prune/fertilize/repot/treat
  photoLog[]                 // groeifoto's
  addedVia                   // scan | manual | seed | seedling | cutting
  notes?, careTips?, harvestMonths[]
}

MaintenanceTask {
  id, plantId, type, dueDate
  completedDate?             // ingevuld na voltooiing
  intervalDays?              // herhalende taak — volgende wordt auto-aangemaakt
}
```

---

## Installatie & lokaal draaien

### Vereisten

- Node.js ≥ 18
- [Expo Go](https://expo.dev/go) op je telefoon **of** een Android-emulator
- (Optioneel) Cloudflare account voor API-proxy

```bash
git clone https://github.com/kanifu/floramap.git
cd FloraMap
npm install
```

Maak een `.env`-bestand aan (zie [Omgevingsvariabelen](#omgevingsvariabelen)).

```bash
npx expo start
```

Scan de QR-code met Expo Go of druk `a` voor de Android-emulator.

---

## Omgevingsvariabelen

Maak `.env` aan in de projectroot. **Commit dit bestand nooit.**

```env
# Optie A — via Cloudflare Worker proxy (aanbevolen voor productie)
EXPO_PUBLIC_API_PROXY_URL=https://jouw-worker.jouw-naam.workers.dev
EXPO_PUBLIC_FLORAMAP_TOKEN=jouw-geheime-token

# Optie B — directe Gemini API (alleen voor lokale ontwikkeling)
EXPO_PUBLIC_GEMINI_API_KEY=AIza...
```

De app kiest automatisch: als `EXPO_PUBLIC_API_PROXY_URL` ingesteld is, wordt de proxy gebruikt en is de Gemini-sleutel nooit zichtbaar in de app.

---

## Cloudflare Worker proxy

De Gemini API-sleutel wordt **nooit** in de app opgeslagen. De Worker:

1. Ontvangt verzoeken van de app met een `X-FloraMap-Token` header
2. Valideert het token
3. Stuurt het verzoek door naar de Gemini API met de geheime sleutel
4. Optioneel: rate limiting via Cloudflare KV (60 verzoeken/dag/IP)

```bash
cd cloudflare-worker
wrangler deploy
wrangler secret put GEMINI_API_KEY
wrangler secret put FLORAMAP_TOKEN
```

---

## Bouwen voor Play Store

```bash
# Preview APK (testen)
eas build --profile preview --platform android

# Productie AAB (Play Store)
eas build --profile production --platform android
```

> ⚠️ Verhoog `android.versionCode` in `app.json` bij elke Play Store-upload.

**EAS Secrets instellen** (voor builds zonder lokale `.env`):

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_PROXY_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_FLORAMAP_TOKEN --value "..."
```

---

## Versiegeschiedenis

| Versie | Highlights |
|---|---|
| **1.4.0** | Swipe-to-complete taken, ICS kalenderexport, GPS-weerlocatie, onboarding modal, foto-dagboek, bewerkbare plantkaarten, taakgeschiedenis, backup/restore, aftellende datumweergave |
| **1.3.0** | Onderhoudstijdlijn + geschiedenis tabs, zaad/zaailing/stek-flow, plantnotities, Play Store vereisten |
| **1.2.0** | Cloudflare Worker API-proxy, veilige sleutelopslag |
| **1.1.0** | Zones, assistent-chatbot, dagelijkse notificaties |
| **1.0.0** | Eerste release: kaart, plantenherkenning, basistaken |

---

## GitHub Issues & backlog

Alle bekende bugs en geplande features worden bijgehouden als [GitHub Issues](https://github.com/kanifu/floramap/issues).

### Opgelost in v1.4.0

| Issue | Titel |
|---|---|
| #6 | Taak voltooien via PlantCard werkt niet correct |
| #7 | Taaklabels en -iconen in het Engels |
| #8 | Verkeerd Gemini-model (`gemini-3.5-flash` → `gemini-2.5-flash`) |
| #9 | Dood ScanScreen-bestand veroorzaakt TypeScript-fouten |
| #10 | Plantnotities niet zichtbaar op PlantCard |
| #11 | Hardgecodeerde coördinaten voor weerdata (nu echte GPS) |
| #13 | Swipe-to-complete voor onderhoudstaken |
| #14 | Plantdetails bewerken in de app |
| #16 | Onboarding voor nieuwe gebruikers |
| #17 | Groeifoto-dagboek per plant |
| #18 | JSON backup exporteren en importeren |
| #19 | ICS kalenderexport van taken |

### Nog op de backlog

| Issue | Titel | Prioriteit |
|---|---|---|
| #12 | Dark mode ondersteuning | Medium |
| #15 | Companion planting overlay op kaart | Low |

---

## Licentie

MIT © 2025 Jordy Zinkstok

---

> Gebouwd met ❤️ en veel water geven. 🌱
