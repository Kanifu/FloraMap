# FloraMap — Testplan v2.0.0 (Build #13.4)

## Hoe testen
Installeer de app via EAS build of Expo Go. Test op een fysiek Android-apparaat.

## QA-sessie 14 juni 2026 — samenvatting

Volledige statische usability/quality-audit uitgevoerd op de codebase. Bevindingen
en fixes zijn vastgelegd in de PR voor deze sessie. Belangrijkste wijzigingen:

- **#130 (bug)**: `dueDate`-generatie op 5 plekken aangepast om op lokale
  middag (`toLocalNoonISO`/`addDaysISO`) te ankeren, zodat `relativeDueLabel`
  ("Vandaag"/"Morgen"/"Over X dagen") niet meer 1 dag kan verschuiven voor
  gebruikers in negatieve UTC-tijdzones. Unit tests toegevoegd in
  `src/utils/dateUtils.test.ts`.
- Gamificatie: `recordTaskCompletion` telde tuintaken niet altijd mee voor
  `totalTasksCompleted`/achievements als er die dag al een onderhoudstaak was
  afgerond — opgelost, nu consistent met `completeMaintenanceTask`.
- VirtualGardenScreen: ongeldige `rgba(...)`-kleurwaarden in de plantenpot-SVG
  gefixt (decoratieve stippen op de pot renderden niet correct).
- Dode code opgeruimd: ongebruikt `src/theme/index.ts`, en de onbereikbare
  'stats'-tab + bijbehorende stijlen in `MaintenanceScreen` (vervangen door
  StatsModal).
- `HarvestEntry`-interface (was per ongeluk twee keer gedeclareerd in
  `src/models/index.ts`) samengevoegd tot één definitie.
- `@types/jest` toegevoegd zodat de nieuwe testsuite typecheckt.

Nieuwe checklist-items hieronder (sectie 9) zijn toegevoegd om de #130-fix te
verifiëren op een fysiek apparaat in verschillende tijdzones.

## 1. Kaart & Tuin

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| App openen zonder tuin | Welkomstscherm getoond | ⬜ |
| Plant toevoegen via camera scan | Camera opent, plant herkend, correctiesheet getoond | ⬜ |
| Plant naam corrigeren voor plaatsing | CorrectionSheet toont naam/soort velden, aanpassing opgeslagen | ⬜ |
| Plant toevoegen via database | Zoekscherm, plant geselecteerd, klaar om te plaatsen | ⬜ |
| Plant toevoegen handmatig | Invoerveld, naam invullen, plant verschijnt op kaart | ⬜ |
| Plant op kaart tikken | PlantQuickSheet schuift omhoog | ⬜ |
| QuickSheet: taak afronden | Taak verdwijnt, groene ring op plant | ⬜ |
| QuickSheet: tips zichtbaar | Max 2 tips getoond, "meer in details" bij >2 | ⬜ |
| QuickSheet: naam corrigeren | Invoervelden verschijnen, opslaan werkt | ⬜ |
| QuickSheet → Details | PlantCard opent voor de juiste plant | ⬜ |
| Plant lang indrukken | PlantMenu verschijnt (verplaatsen, verwijderen, kleur, notitie) | ⬜ |
| Plant verplaatsen | Plant volgt vinger, nieuwe positie opgeslagen | ⬜ |
| Plant verwijderen | Bevestigingsdialoog, plant weg van kaart | ⬜ |
| Zone uitrekken | Twee tikken, zone verschijnt met kleur | ⬜ |
| Zone kleur wijzigen | Kleurkiezer werkt, zone kleur veranderd | ⬜ |
| Zoomen (2 vingers) | Kaart zoomt in/uit, planten blijven op juiste plek | ⬜ |
| Plaatsing na zoom | Plant verschijnt op tik-positie, niet op 100%-positie | ⬜ |
| Namen toggle (🏷️) | Plantnamen aan/uit op kaart | ⬜ |

## 2. Grenzen (Boundaries)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Hek toevoegen | Hek-iconen op lijn getoond | ⬜ |
| Pad toevoegen | Tegelvlak getoond | ⬜ |
| Gras toevoegen | Groen vlak met 🌿 getoond | ⬜ |
| Grens tikken | Verwijder-alert verschijnt | ⬜ |
| Grens verwijderen | Grens weg van kaart | ⬜ |

## 3. Onderhoud (Mijn tuin tab)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Tab naam "Mijn tuin" | Tab onderaan heet "Mijn tuin" met 🌻 | ⬜ |
| Taken zichtbaar | Lijst van openstaande taken per plant | ⬜ |
| Taak afronden | Taak gemarkeerd als gedaan, streakteller +1 | ⬜ |
| Gamificatie balk | Streak, badges zichtbaar bovenin | ⬜ |
| Badge ontvangen | Bij 3 taken op rij: streak-badge | ⬜ |
| Zaaikalender tab | Seizoensgebonden zaai-tips zichtbaar | ⬜ |
| Statistieken tab | Oogstranking, taken-chart getoond | ⬜ |

## 4. Assistent

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Chat openen | Leeg chatscherm | ⬜ |
| Vraag stellen | Antwoord van Gemini | ⬜ |
| Foto meesturen | Camera/galerij keuze, antwoord met plant-analyse | ⬜ |

## 5. Plantkaart (PlantCardScreen)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Plant naam/soort bewerken | Bewerken-knop, velden invullen, opslaan | ⬜ |
| Waterschema wijzigen | Interval aanpassen, volgende taak herberekend | ⬜ |
| Oogst registreren | Gewicht/datum invullen, opgeslagen in logboek | ⬜ |
| Opvolgteelt suggesties | Sectie met aanbevelingen na oogstmaand | ⬜ |

## 6. Zaadvoorraad

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Zaad toevoegen | Formulier invullen, pakket zichtbaar in lijst | ⬜ |
| Zaad als opgemaakt markeren | Pakket doorgestreept | ⬜ |
| Verloopdatum zichtbaar | Jaar getoond, oud pakket gemarkeerd | ⬜ |

## 7. Notificaties

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Toestemming gevraagd | Systeem-popup bij eerste start | ⬜ |
| Dagelijkse herinnering | Om 08:00 notificatie met taak-overzicht | ⬜ |
| Weerwaarschuwing | Vorstmelding bij ≤2°C 's nachts | ⬜ |

## 8. Persistentie

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| App sluiten en heropen | Tuin, planten en taken nog aanwezig | ⬜ |
| Taak afronden, app herstarten | Afgeronde taak blijft afgerond | ⬜ |

## 9. Tijdzone & datums (i.v.m. #130-fix)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Nieuwe onderhoudstaak aanmaken (water geven) | Vervaldatum toont "Vandaag"/"Over X dagen" correct, ook rond middernacht | ⬜ |
| Taak afronden met herhaling (`intervalDays`) | Volgende vervaldatum klopt en blijft stabiel na app-herstart | ⬜ |
| Plantdatum wijzigen via PlantDateSheet | Herberekende taakdata tonen het juiste "Over X dagen"-label | ⬜ |
| Apparaat in tijdzone UTC-7/8 (bv. America/Los_Angeles) | "Vandaag"/"Morgen"-labels kloppen, geen 1-dag verschuiving | ⬜ |
| `npx jest` (dateUtils) | Alle 12 tests slagen | ⬜ |

## Bekende beperkingen
- EAS build vereist Expo-account en `eas login`
- Open-Meteo API vereist internet + locatietoestemming
- Gemini API vereist geldige `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`
