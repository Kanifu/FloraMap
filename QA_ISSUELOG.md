# FloraMap — QA Issue Log

Doorlopend logboek van usability/kwaliteitsaudits. Wordt bijgewerkt bij elke
QA-sessie (zie CLAUDE.md voor de verplichte werkwijze). Status: `open` ·
`fixed` · `deferred` (GitHub issue aangemaakt) · `wontfix`.

## ⚠️ KRITIEKE BEVINDING — twee ongemergde draft PR's overlappen sterk met deze sessie

Tijdens het aanmaken van GitHub-issues voor deze sessie kwam naar boven dat
**PR #132** en **PR #133** (beide `draft`, beide nog open, van eerdere
sessies op 10/11 juni) een vergelijkbare audit+fix-batch bevatten die **nooit
naar `main` is gemerged**:

- PR #132 ("Phase 2 QA sprint…") raakt o.a. `gardenStore.ts` (`addPlant` →
  `boolean` + UpgradeModal), `PlantQuickSheet`, `GardenMap`, `MaintenanceScreen`
  (227 verwijderde regels — vermoedelijk dezelfde dode "stats"-tab als #17
  hieronder), `models/index.ts`, `AssistantScreen`, `MapScreen`,
  `SeedInventoryScreen`, `PlantCardScreen`, `app.json`, `CLAUDE.md`.
- PR #133 ("Bugfix sprint…") claimt o.a. #126 (chat her-uploadt elke foto
  opnieuw — zie #20 hieronder) en #122-#131 op te lossen.
- Issues #122-#129 en #131 staan al op **closed** met "Fixed in commit
  <hash>"-comments, maar die commits bestaan niet op `main` — de fixes zitten
  alleen in de ongemergde PR-branches. **De issues zijn dus ten onrechte als
  opgelost gemarkeerd.**

Omdat `main` deze fixes niet had, heeft de QA-pass van vanavond (op een
verse branch vanaf `main`) **onafhankelijk en deels overlappend** een aantal
van dezelfde problemen gevonden en gefixt (zie #1, #12, #16, #17 hieronder —
deze raken dezelfde bestanden als PR #132/#133).

**Aanbeveling voor de ochtend-review**: bekijk en merge (of sluit) PR #132 en
#133 EERST, vóór de PR van deze sessie. Daarna moet deze sessie's branch
opnieuw worden gerebaset/vergeleken op resterende, niet-overlappende fixes
(met name #2, #3, #4, #5, #6, #7, #9, #11, #13, #14, #15 zijn op het eerste
gezicht niet genoemd in #132/#133's beschrijvingen en dus waarschijnlijk
nieuw). Heropen #122-#129/#131 als ze na controle nog niet op `main` staan.

---

## Sessie 15 juni 2026 — volledige audit (Build #13.3 → #13.4)

Branch gesynchroniseerd met `main` (was 7 builds achter). Audit uitgevoerd
over data-laag, kaart/UI, onderhoud/plantkaart en assistent/overige schermen.
`npx tsc --noEmit` en `npm run lint` schoon vóór start (alleen `curly`
style-warnings, 0 errors).

### Kritiek

| # | Bevinding | Bestand | Status |
|---|-----------|---------|--------|
| 1 | `addPlant` faalt stil op gratis-tier plantlimiet (20); UI toont toch ✓ bij AI-toevoegen, plant verdwijnt | `gardenStore.ts`, `AssistantScreen/index.tsx` | **fixed** |

### Hoog

| # | Bevinding | Bestand | Status |
|---|-----------|---------|--------|
| 2 | SPEC2 statusbadges (water/bemest/snoei/oogst/meerdere-achterstallig) berekend in MapScreen maar nooit gerenderd in GardenMap — kernfeature van Build #11/12 ontbreekt visueel | `GardenMap/index.tsx`, `MapScreen/index.tsx` | **fixed** |
| 3 | Wijzigen van water-interval op PlantCard herberekent `dueDate` niet — nieuwe interval werkt pas na volgende voltooiing | `PlantCardScreen/index.tsx` | **fixed** |
| 4 | ICS-export escaped geen `,`/`;`/`\`/nieuwe regels — kapotte .ics bij komma's in plantnaam/notities | `utils/icsExport.ts` | **fixed** |
| 5 | `ProactiveTipService` notificatietrigger mist verplicht `type`-veld (legacy formaat) — dagelijkse tuintip wordt niet correct gepland | `services/ProactiveTipService.ts` | **fixed** |
| 6 | `gardenStats` (streak/badges) wordt niet herberekend bij app-herstart — toont 0 tot volgende taakvoltooiing | `store/gardenStore.ts` | **fixed** |
| 7 | Dagelijkse 08:00-herinnering gebruikt `CALENDAR`-trigger die per Expo-typen `@platform ios` is — herhaalt mogelijk niet op Android | `services/NotificationService.ts` | **fixed** |

### Middel

| # | Bevinding | Bestand | Status |
|---|-----------|---------|--------|
| 8 | "Tier wisselen (testmodus)" staat in productie-UI — elke gebruiker kan gratis naar premium switchen | `AboutScreen/index.tsx` | **fixed** |
| 9 | Backup-import valideert alleen `id`/`plants`-array, geen veldcontrole — corrupt bestand kan store/rendering breken | `AboutScreen/index.tsx` | **fixed** |
| 10 | `BADGE_DEFINITIONS` bevat 7 van 27 badge-IDs — 20 badges ontgrendelen stil maar tonen nooit in Onderhoud/Statistieken | `models/index.ts`, `store/gardenStore.ts` | **fixed** |
| 11 | PDF-export: `isOverdue` vergelijkt date-only `dueDate` met volledige ISO `now` → taken die vandaag moeten gebeuren staan 's middags al als "te laat" gemarkeerd | `utils/pdfExport.ts` | **fixed** |
| 12 | PlantQuickSheet naamcorrectie: OR-match op naam/soort kan verzorgingsdata van verkeerde plant overnemen | `components/PlantQuickSheet/index.tsx` | **fixed** |
| 13 | Zaadkast: vervaljaar-invoer accepteert NaN/absurde waarden (geen validatie) | `screens/SeedInventoryScreen/index.tsx` | **fixed** |
| 14 | Oogstlogboek accepteert negatieve/foutieve gewicht- en aantalwaarden | `screens/PlantCardScreen/index.tsx` | **fixed** |
| 15 | TodaySheet `isOverdue` vergelijkt date-only met datetime via stringvergelijking — werkt toevallig, fragiel | `components/TodaySheet/index.tsx` | **fixed** |
| 16 | Dubbele `HarvestEntry`-interface in `models/index.ts` (samengevoegde velden, verwarrend) | `models/index.ts` | **fixed** |
| 17 | ~155 regels dode/foutieve "stats"-tab in MaintenanceScreen (onbereikbaar, gebruikt verkeerd veld) | `MaintenanceScreen/index.tsx` | **fixed** |
| 18 | `PLAATSING:`-suggesties worden geparsed maar nooit getoond in Assistent-UI | `AssistantScreen/index.tsx`, `GardenAssistantService.ts` | open → **#138** |
| 19 | Onboarding: voortgang niet opgeslagen vóór laatste stap — app sluiten mid-flow herstart hele onboarding | `OnboardingModal/index.tsx`, `MapScreen/index.tsx` | open → **#139** |
| 20 | Assistent verstuurt bij elke chatbeurt opnieuw alle eerder geüploade foto's (performance/kosten) | `AssistantScreen/index.tsx`, `GardenAssistantService.ts` | **duplicaat van #126** — al "fixed" gemeld in ongemergde draft PR #133, geen nieuw issue aangemaakt |

### Laag (polish/toegankelijkheid/cosmetisch — verzameld in #140)

- Iconen-only knoppen zonder `accessibilityLabel` (AssistantScreen, MaintenanceScreen, SeedInventoryScreen)
- `pdfExport.ts`: `escapHtml`-typo + geen quote-escaping
- Dode `PlantZone`/`Garden.zones?` velden (SPEC2 §4 cleanup nooit uitgevoerd)
- Zone-kleur kan hergebruikt worden na verwijderen van een zone
- `TierComparisonModal` verwijst naar niet-bestaand "instellingen"-scherm voor upgrades
- SeedInventory "binnenkort verlopen" markeert alleen huidig jaar, geen jaar vooraf
- VirtualGardenScreen "Druppels"-totaal kan dalen na streak-reset (verwarrend voor cumulatieve weergave)
- `cropRotation.ts`: mogelijke valse zelf-botsing als `existingPlants` de te plaatsen plant zelf bevat
- `deleteGarden` kiest willekeurig de laatste tuin in de array als nieuwe actieve tuin

### Reeds bekend (GitHub, niet opnieuw aangepakt)

- **#130** — `relativeDueLabel` tijdzone-inconsistentie (bug-label). Grondige analyse bevestigt:
  fix vereist wijziging van hoe `dueDate` wordt gegenereerd én vergeleken op
  ~15 plekken. Te risicovol voor een ongesuperviseerde sessie — aanbeveling:
  apart, goed getest sprintplan. Niet aangepast deze sessie.
- **#134** — dark_mode/multi_garden marketing vs. implementatie — productbeslissing nodig, niet aangepast.
