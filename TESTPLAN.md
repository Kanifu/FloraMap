# FloraMap — Testplan v2.0.0 (Build #13.4)

## Hoe testen
Installeer de app via EAS build of Expo Go. Test op een fysiek Android-apparaat.

## 1. Kaart & Tuin

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| App openen zonder tuin | Onboarding/welkomstscherm getoond | ⬜ |
| Plant toevoegen via camera scan | Camerapermissie gevraagd indien nodig, foto geanalyseerd, herkende planten getoond met plaatsingsvoorstel | ⬜ |
| Scan zonder cameratoegang | Duidelijke melding i.p.v. silent fail | ⬜ |
| Plant naam corrigeren voor plaatsing | CorrectionSheet toont naam/soort velden, aanpassing opgeslagen | ⬜ |
| Plant toevoegen via database | Zoekscherm, plant geselecteerd, klaar om te plaatsen | ⬜ |
| Plant toevoegen handmatig | Invoerveld, naam invullen, plant verschijnt op kaart | ⬜ |
| Nieuwe plant/zone-modal sluiten via terugknop (Android) | Modal sluit netjes via `onRequestClose` | ⬜ |
| Plant op kaart tikken | PlantQuickSheet schuift omhoog | ⬜ |
| QuickSheet: taak afronden | Taak verdwijnt, groene ring op plant | ⬜ |
| QuickSheet: tips zichtbaar | Max 2 tips getoond, "meer in details" bij >2 | ⬜ |
| QuickSheet: naam corrigeren (plant met bestaande taken) | Invoervelden verschijnen; na opslaan blijven voltooide taken, eigen vervaldatums en prune/repot/treat-taken behouden — alleen ontbrekende taaktypes worden toegevoegd | ⬜ |
| QuickSheet → Details | PlantCard opent voor de juiste plant | ⬜ |
| Plant lang indrukken | PlantMenu verschijnt voor **die specifieke plant** (verplaatsen, verwijderen, kleur, notitie) | ⬜ |
| Twee planten dicht bij elkaar lang indrukken (snel na elkaar) | Elke plant reageert op zijn eigen long-press, geen kruisbesmetting tussen timers | ⬜ |
| Plant verplaatsen | Plant volgt vinger, nieuwe positie opgeslagen | ⬜ |
| Plant verwijderen | Bevestigingsdialoog, plant weg van kaart, rotatiehistorie bijgewerkt indien `plantFamily` bekend | ⬜ |
| Nieuwe plant exact op bestaande plant plaatsen | Overcrowding-waarschuwing verschijnt (ook bij volledige overlap, niet alleen bij 1 cel afstand) | ⬜ |
| Zone uitrekken | Twee tikken, zone verschijnt met kleur | ⬜ |
| Zone kleur wijzigen | Kleurkiezer werkt, zone kleur veranderd | ⬜ |
| Zoomen (2 vingers + zoomknoppen) | Kaart zoomt in/uit, planten blijven op juiste plek; zoomknoppen zijn 44×44 met toegankelijkheidslabel | ⬜ |
| Plaatsing na zoom | Plant verschijnt op tik-positie, niet op 100%-positie | ⬜ |
| Namen toggle (🏷️) | Plantnamen aan/uit op kaart | ⬜ |
| Companion planting overlay aan | Lijnen tussen goede/slechte buren zichtbaar, kleur klopt met `companionPlanting.ts` | ⬜ |
| Tuingrens overschreden bij plaatsing | Waarschuwing verschijnt éénmaal per plaatsing (niet herhaaldelijk bij her-renders) | ⬜ |

## 2. Grenzen (Boundaries)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Hek toevoegen | Hek-iconen op lijn getoond | ⬜ |
| Pad toevoegen | Tegelvlak getoond | ⬜ |
| Gras toevoegen | Groen vlak met 🌿 getoond | ⬜ |
| Schuine lijnen tekenen | Lijn volgt diagonale richting correct | ⬜ |
| Grens tikken | Verwijder-alert verschijnt | ⬜ |
| Grens verwijderen | Grens weg van kaart | ⬜ |

## 3. Zijmenu & Tuinbeheer

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Zijmenu openen | Toont planten-aantal, badge-chip (indien badges behaald) | ⬜ |
| Companion planting toggle in menu | Schakelt overlay op kaart | ⬜ |
| Plantnamen toggle in menu | Schakelt naamlabels op kaart | ⬜ |
| "Wissel van tuin" | Tuinkiezer toont alle tuinen, wisselen werkt en kaart ververst | ⬜ |
| "Nieuwe tuin" aanmaken | Nieuwe lege tuin aangemaakt en actief gezet, `multi_garden` achievement bij 2e tuin | ⬜ |
| "Tuin leegmaken" | Bevestigingsdialoog ("Wil je de hele tuin wissen?"), planten/zones/taken verwijderd | ⬜ |
| "Tuin verwijderen" | Bevestigingsdialoog, tuin definitief weg, andere tuin (indien aanwezig) wordt actief | ⬜ |
| "Bug melden" | FeedbackModal opent | ⬜ |
| "Over FloraMap" | Toont huidige versie/build (uit `app.json` via Constants) | ⬜ |

## 4. Onderhoud (Mijn tuin tab)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Tab "Taken" | Lijst van openstaande taken per plant, gesorteerd op vervaldatum | ⬜ |
| Taak afronden | Taak gemarkeerd als gedaan, streakteller +1, `recentUnlockId` getoond als toast bij nieuwe badge | ⬜ |
| Badge ontvangen (1 nieuwe badge) | Toast toont **de daadwerkelijk behaalde badge** (niet de eerste in `BADGE_DEFINITIONS`) | ⬜ |
| Droge periode (≥3 dagen) | Banner toont "🔥 X droge dagen · Y° — watertaken naar voren gehaald" | ⬜ |
| Regen verwacht + watertaak | Hint "🌧️ Regen verwacht — echt nodig?" zichtbaar in QuickSheet en takenlijst | ⬜ |
| Tab "Planning" | Aankomende taken per week/maand overzicht | ⬜ |
| Tab "Zaaikal." | Seizoensgebonden zaai-tips zichtbaar, gepersonaliseerd indien locatie bekend | ⬜ |
| Tab "Log" (geschiedenis) | Voltooide taken in chronologische volgorde | ⬜ |
| Statistieken-modal openen (via badge-chip) | Toont streak, behaalde achievements, oogststatistieken | ⬜ |
| Oogststatistieken (Statistieken-modal) | Totaal oogstgewicht en top-5 ranking gebruiken `weightG` (komt overeen met `StatsModal`/`countHarvestGrams`) | ⬜ |

## 5. Assistent

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Chat openen | Leeg chatscherm met "Stel een vraag of scan een plant" | ⬜ |
| Vraag stellen (tekst) | Antwoord van Gemini in het Nederlands | ⬜ |
| Foto meesturen | Camera/galerij keuze, antwoord met plant-analyse + herkende planten | ⬜ |
| Herkende plant toevoegen aan tuin | Plant verschijnt in tuin; bij gratis tier op de plantenlimiet (20) verschijnt UpgradeModal i.p.v. silent no-op | ⬜ |
| "Voeg alles toe" met meerdere herkende planten op de limiet | Toont UpgradeModal zodra de limiet bereikt wordt, planten tot de limiet worden wél toegevoegd | ⬜ |
| Plaatsingsvoorstel (PLAATSING) | Voorgestelde posities tonen op kaart, bevestigen plaatst plant | ⬜ |
| Lange/trage Gemini-respons | Laadindicator zichtbaar; *(bekend probleem: geen annuleerknop, zie issue #122)* | ⬜ |
| Netwerkfout tijdens chat | Foutmelding in chatbubbel; *(bekend probleem: kan Engelse/technische tekst tonen, zie issue #125)* | ⬜ |
| Toetsenbord openen tijdens chatten (iOS) | Inputveld blijft zichtbaar boven toetsenbord; *(bekend aandachtspunt: berichtenlijst schuift niet mee, zie issue #131)* | ⬜ |

## 6. Plantkaart (PlantCardScreen)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Plant naam/soort bewerken | Bewerken-knop, velden invullen, opslaan | ⬜ |
| Begietinterval wijzigen (actieve waterbeurt-taak aanwezig) | Interval aanpassen, volgende taak herberekend | ⬜ |
| Begietinterval wijzigen (geen actieve waterbeurt-taak) | *(bekend probleem: wijziging wordt stilletjes genegeerd, zie issue #123)* | ⬜ |
| AI-verrijking ("Vul aan met AI") | Verzorgingsinfo, oogstmaanden en intervallen aangevuld zonder bestaande data te overschrijven | ⬜ |
| Foto toevoegen aan groeilogboek | Foto verschijnt in horizontale lijst, lang indrukken om te verwijderen | ⬜ |
| Oogst registreren (plant met `harvestMonths`) | Gewicht/aantal/datum invullen, opgeslagen in logboek, totaal bijgewerkt | ⬜ |
| Oogst registreren (plant zonder `harvestMonths`) | *(bekend probleem: hele oogstsectie onzichtbaar, zie issue #124)* | ⬜ |
| Opvolgteelt suggesties | Sectie met aanbevelingen na oogstmaand | ⬜ |
| Gewasrotatie-waarschuwing | Bij opnieuw planten van zelfde plantfamilie binnen X jaar verschijnt waarschuwing (gebaseerd op `rotationHistory`) | ⬜ |

## 7. Zaadvoorraad

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Zaad toevoegen | Formulier invullen, pakket zichtbaar in lijst | ⬜ |
| Zaad als opgemaakt markeren | Pakket doorgestreept | ⬜ |
| Verloopdatum zichtbaar | Jaar getoond, oud pakket gemarkeerd | ⬜ |

## 8. Virtuele Tuin

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Virtuele tuin openen | Groeiende digitale tuin gebaseerd op voltooide taken/streak | ⬜ |
| Voortgang na taken voltooien | Visuele groei neemt toe na nieuwe voltooide taken | ⬜ |

## 9. Freemium & Abonnementen

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Gratis tuin tot 20 planten | Planten toevoegen werkt normaal tot de limiet | ⬜ |
| Plant toevoegen op de limiet (handmatig, scan, "voeg alles toe") | UpgradeModal verschijnt, plant wordt NIET toegevoegd, geen vals "✓ toegevoegd"-icoon | ⬜ |
| Tieromschrijving bekijken | TierComparisonModal toont gratis/plus/premium features correct | ⬜ |
| AI-assistent gebruik (`unlimited_ai`-flag) | *(bekend aandachtspunt: limiet wordt nog niet afgedwongen, zie issue #46)* | ⬜ |

## 10. Notificaties

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Toestemming gevraagd | Systeem-popup bij eerste start | ⬜ |
| Dagelijkse herinnering | Om 08:00 notificatie met taak-overzicht | ⬜ |
| Weerwaarschuwing | Vorstmelding bij ≤2°C 's nachts | ⬜ |
| Weerwidget op kaart | Temperatuur + emoji getoond; *(bekend probleem: bij API-fout toont dit "🌡️ 0°C" zonder foutindicatie, zie issue #128)* | ⬜ |

## 11. Persistentie

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| App sluiten en heropen | Tuin(en), planten en taken nog aanwezig | ⬜ |
| Taak afronden, app herstarten | Afgeronde taak blijft afgerond | ⬜ |
| Meerdere tuinen, app herstarten | Actieve tuin en alle tuinen blijven behouden | ⬜ |

## Bekende beperkingen
- EAS build vereist Expo-account en `eas login`
- Open-Meteo API vereist internet + locatietoestemming
- Gemini API vereist geldige `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`
- Open issues uit de laatste audit (10 juni 2026): zie GitHub issues #122–#131 voor bekende bugs/UX-aandachtspunten die nog niet zijn opgelost.
