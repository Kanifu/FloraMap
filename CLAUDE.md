# FloraMap — Claude-instructies

Dit bestand wordt door Claude gelezen aan het begin van elke sessie.
Het beschrijft verplichte werkwijzen voor dit project.

---

## 📦 Versiebeheer — VERPLICHT bij elke commit naar main

Bij **elke commit naar `main`** die iets verandert aan de app (code, assets, config)
**moet** `app.json` bijgewerkt worden. Geen uitzonderingen.

### Wat aanpassen in `app.json`

| Veld | Wanneer |
|------|---------|
| `extra.buildLabel` | **Altijd** — zie tabel hieronder |
| `extra.buildDate` | **Altijd** — huidige datum in Nederlands formaat (bijv. `"24 mei 2026"`) |
| `android.versionCode` | **Altijd** — altijd +1 t.o.v. vorige waarde (Play Store eis) |
| `version` | Alleen bij grote feature-releases |

### Buildlabel-strategie

| Type wijziging | Voorbeeld | `buildLabel` |
|----------------|-----------|-------------|
| Grote nieuwe feature | companion overlay | `"5"` (volgende geheel getal) |
| Bugfix of kleine verbetering | Gemini 400 fix | `"4.1"`, `"4.2"`, … |
| Meerdere fixes in één commit | 2 bugfixes | `"4.1"` (één stap) |

Huidige stand: **Build #7.4 · v1.8.0 · versionCode 24**

### Checklist vóór elke push naar main

- [ ] `extra.buildLabel` bijgewerkt
- [ ] `extra.buildDate` bijgewerkt naar vandaag
- [ ] `android.versionCode` is vorige waarde + 1
- [ ] `version` aangepast indien grote feature

### Voorbeeld — bugfix commit

```json
"version": "1.5.0",
"extra": {
  "buildLabel": "4.1",
  "buildDate": "25 mei 2026",
  ...
},
"android": {
  "versionCode": 5,
  ...
}
```

---

## 🗂️ Projectstructuur

```
FloraMap/
├── app.json                         ← versie-info (ALTIJD bijwerken)
├── src/
│   ├── data/
│   │   └── companionPlanting.ts     ← companion planting database
│   ├── components/
│   │   ├── GardenMap/               ← SVG tuinkaart + companion overlay
│   │   ├── FeedbackModal/           ← in-app feedback → GitHub issues (#56)
│   │   ├── OnboardingModal/         ← onboarding wizard
│   │   └── PlantQuickSheet/         ← tap-plant quick actions (taken, tips)
│   ├── hooks/
│   │   └── useTheme.ts              ← auto light/dark theme hook
│   ├── screens/
│   │   ├── MapScreen/               ← hoofdscherm met kaart
│   │   ├── AssistantScreen/         ← Gemini chat
│   │   ├── MaintenanceScreen/       ← onderhoudstaken
│   │   ├── PlantCardScreen/         ← plantenpaspoort
│   │   └── AboutScreen/             ← leest versie uit app.json via Constants
│   ├── services/
│   │   ├── ApiConfig.ts             ← Gemini endpoint (proxy of direct)
│   │   └── GardenAssistantService.ts
│   ├── store/
│   │   └── gardenStore.ts           ← Zustand store
│   └── theme/
│       └── index.ts                 ← lightTheme + darkTheme tokens
├── cloudflare-worker/worker.js      ← API proxy (Cloudflare)
└── scripts/safe-build.sh            ← build-script (npm run build:android)
```

### Thema-patroon (verplicht voor nieuwe schermen)

Elk scherm/component dat kleuren gebruikt moet het `makeStyles(t: Theme)` factory-patroon gebruiken:

```ts
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

const MyScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  // ...
};

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { backgroundColor: t.background },
  card:      { backgroundColor: t.card, borderColor: t.border },
  text:      { color: t.text },
  title:     { color: t.primaryDark },
});
```

**Nooit** hardcoded hex-kleuren gebruiken in StyleSheet (behalve `'#fff'` op gekleurde knoppen waar de achtergrond altijd donker is, of `rgba(...)` overlays).

---

## 🔑 API-configuratie

- Directe key: `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`
- Via proxy: `EXPO_PUBLIC_API_PROXY_URL` + `EXPO_PUBLIC_API_TOKEN`
- Model: `gemini-2.5-flash` via `v1beta`

---

## 🚫 Bekende valkuilen

- `thinkingConfig.thinkingLevel` bestaat **niet** in de Gemini API → geeft 400.
  Gebruik `thinkingConfig.thinkingBudget` (integer) of laat het weg.
- `npx expo-doctor` geeft een installatie-prompt → gebruik `npx --yes expo-doctor`.
- `android.versionCode` moet een **integer** zijn en altijd stijgen voor de Play Store.
