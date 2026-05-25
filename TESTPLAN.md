# FloraMap — Testplan v1.7.0 (Build #6.1)

## Hoe testen
Installeer de app via EAS build of Expo Go. Test op een fysiek Android-apparaat.

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

## Bekende beperkingen
- EAS build vereist Expo-account en `eas login`
- Open-Meteo API vereist internet + locatietoestemming
- Gemini API vereist geldige `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`
