# FloraMap — Testplan v1.7.0 (Build #6.1)

## Hoe testen
Installeer de app via EAS build of Expo Go. Test op een fysiek Android-apparaat.
Voer elke test handmatig uit en zet ✅ bij geslaagd, ❌ bij mislukt (noteer oorzaak).

---

## 1. Kaart & Tuin

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| App openen zonder tuin | Welkomstscherm / onboarding getoond | ⬜ |
| Plant toevoegen via camera scan | Camera opent, plant herkend, correctiesheet schuift omhoog | ⬜ |
| Plant naam corrigeren in correctiesheet | Naam/soort velden aanpasbaar, na "Tik op kaart" → plant geplaatst met gecorrigeerde naam | ⬜ |
| Lage zekerheid (<85%) scan | Oranje waarschuwing zichtbaar in correctiesheet | ⬜ |
| Scan overslaan in correctiesheet | Plant wordt verwijderd uit wachtrij, volgende plant (indien aanwezig) | ⬜ |
| Plant toevoegen via database | Zoekscherm opent, plant geselecteerd, correctiesheet getoond | ⬜ |
| Plant toevoegen handmatig | Invoerveld met naam, plant verschijnt op kaart | ⬜ |
| Plant op kaart tikken | PlantQuickSheet schuift omhoog | ⬜ |
| QuickSheet: taak afronden | Taak verdwijnt, groene ✓ ring op plant | ⬜ |
| QuickSheet: verzorgingstips zichtbaar | Max 2 tips getoond, "+ N meer in details" bij >2 tips | ⬜ |
| QuickSheet: naam corrigeren | "✏️ Naam corrigeren" toont tekstinvoer, opslaan werkt direct | ⬜ |
| QuickSheet: long-press hint zichtbaar | "💡 Houd vast om te verplaatsen of verwijderen" onderaan | ⬜ |
| QuickSheet → Volledig plantenpaspoort | PlantCard opent voor de juiste plant | ⬜ |
| QuickSheet sluiten | Tik op backdrop → sheet sluit | ⬜ |
| Plant lang indrukken | PlantMenu verschijnt (verplaatsen, zone uitrekken, kleur, notitie, verwijderen) | ⬜ |
| Plant verplaatsen | Plant volgt vinger, nieuwe positie opgeslagen | ⬜ |
| Plant verwijderen | Bevestigingsdialoog → plant weg van kaart | ⬜ |
| Zone uitrekken (2 tikken) | Zone verschijnt met kleur op kaart | ⬜ |
| Zone kleur wijzigen | Kleurkiezer werkt, zone kleur veranderd | ⬜ |
| Zoomen met 2 vingers | Kaart zoomt in/uit soepel | ⬜ |
| Plant plaatsen na uitzoomen | Plant verschijnt op tik-positie (niet op 100%-positie) | ⬜ |
| Namen toggle (🏷️ knop) | Plantnamen aan/uit op kaart | ⬜ |
| Companion overlay | Groene/rode lijnen tussen buurplanten ≤4 vakjes | ⬜ |

## 2. Grenzen (Boundaries)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Hek toevoegen | Hek-iconen op lijn getoond | ⬜ |
| Pad toevoegen | Tegelvlak getoond | ⬜ |
| Gras toevoegen | Groen vlak met 🌿 iconen getoond | ⬜ |
| Vijver toevoegen | Blauw vlak met golven getoond | ⬜ |
| Grens tikken | Verwijder-alert verschijnt | ⬜ |
| Grens verwijderen | Grens weg van kaart | ⬜ |

## 3. Mijn Tuin tab (onderhoud)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Tab naam "Mijn tuin" | Tab onderaan heet "Mijn tuin" met 🌻 icoon | ⬜ |
| Taken zichtbaar | Lijst van openstaande taken per plant | ⬜ |
| Taak afronden | Taak gemarkeerd als gedaan, streakteller +1 | ⬜ |
| Gamificatie balk | Streak, totaal taken, badges zichtbaar bovenin | ⬜ |
| Eerste taak badge | Na eerste taak: "Eerste stap" badge ontvangen | ⬜ |
| Streak-3 badge | Na 3 dagen op rij: streak badge | ⬜ |
| Droogte-waarschuwing | Bij ≥3 droge dagen + ≥20°C: waterwaarschuwing bovenin | ⬜ |
| Zaaikalender tab | Seizoensgebonden zaai-tips zichtbaar | ⬜ |
| Statistieken tab | Oogstranking en taken-grafiek getoond | ⬜ |
| Geschiedenis tab | Afgeronde taken zichtbaar in lijst | ⬜ |

## 4. Assistent

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Chat openen | Leeg chatscherm | ⬜ |
| Vraag stellen | Antwoord van Gemini binnen ~5 seconden | ⬜ |
| Foto meesturen | Camera/galerij keuze → antwoord met plant-analyse | ⬜ |
| Tuincontext meegestuurd | Assistent kent bestaande planten in de tuin | ⬜ |

## 5. Plantkaart (PlantCardScreen)

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Plant naam/soort bewerken | "✏️ Bewerken" opent velden, opslaan werkt | ⬜ |
| Waterschema wijzigen | Interval aanpassen → volgende taak herberekend | ⬜ |
| Verzorgingstips zichtbaar | Alle tips getoond | ⬜ |
| Identificatiezekerheid zichtbaar | "🎯 87% zeker" of vergelijkbaar | ⬜ |
| Oogst registreren | Gewicht/datum invullen → opgeslagen in logboek | ⬜ |
| Oogstlogboek zichtbaar | Eerdere oogsten getoond | ⬜ |
| Opvolgteelt suggesties | Sectie met aanbevelingen na oogstmaand | ⬜ |

## 6. Zaadvoorraad

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Zaad toevoegen | Formulier invullen → pakket zichtbaar in lijst | ⬜ |
| Zaad als opgemaakt markeren | Pakket doorgestreept/gemarkeerd | ⬜ |
| Verloopdatum zichtbaar | Jaar getoond, verlopen pakket gemarkeerd | ⬜ |
| Zaad bewerken | Gegevens aanpassen → opgeslagen | ⬜ |
| Zaad verwijderen | Pakket weg uit lijst | ⬜ |

## 7. Notificaties

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| Toestemming gevraagd | Systeem-popup bij eerste start | ⬜ |
| Dagelijkse herinnering om 08:00 | Notificatie met taak-overzicht | ⬜ |
| Vorstmelding bij ≤2°C | Notificatie om 20:00 | ⬜ |
| Hittegolf bij >30°C 2 dagen | Notificatie om 14:00 | ⬜ |
| Storm bij >60 km/h | Notificatie over 1 uur | ⬜ |

## 8. Persistentie

| Test | Verwacht resultaat | Status |
|------|--------------------|--------|
| App sluiten en heropen | Tuin, planten en taken nog aanwezig | ⬜ |
| Taak afronden → app herstarten | Afgeronde taak blijft afgerond, streak bewaard | ⬜ |
| Badges bewaard | Eerder verdiende badges na herstart nog zichtbaar | ⬜ |
| Zaadpakketten bewaard | Zaadpakketten na herstart nog zichtbaar | ⬜ |

---

## Bekende beperkingen

- EAS build vereist Expo-account en `eas login` op lokale machine
- Open-Meteo API vereist internet + locatietoestemming (weerwaarschuwingen)
- Gemini API vereist geldige `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`
- Fysiek apparaat aanbevolen voor camera/locatie/notificatietests
- Expo Go ondersteunt mogelijk niet alle native modules (gebruik dan EAS build)

## Build uitvoeren

```bash
# Vereist: eas login (eenmalig)
npm run build:android:auto
# of direct:
eas build --platform android --profile preview
```
