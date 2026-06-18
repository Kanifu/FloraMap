# FloraMap — Testplan v2.0.0 (Build #13.7)

Test op een fysiek Android-apparaat via EAS build of Expo Dev Client.

---

## 1. Onboarding & eerste start

| Test | Verwacht resultaat |
|------|--------------------|
| Eerste keer openen | Welkomstscherm / OnboardingModal getoond |
| Onboarding doorlopen | Tuin aangemaakt, kaartscherm zichtbaar |
| Tweede keer openen | Onboarding overgeslagen, bestaande tuin geladen |

---

## 2. Kaartscherm (MapScreen)

### 2a. Navigatie & lay-out
| Test | Verwacht resultaat |
|------|--------------------|
| Kaartscherm opent | Grid zichtbaar, geen crashes |
| Weer-widget zichtbaar | Temperatuur, regen, droogte-indicator getoond |
| Locatie beschikbaar | Weer op basis van GPS-locatie |
| Locatie geweigerd | Weerpil toont "📍 Amsterdam ↗" |
| Tikken op Amsterdam-chip | Apparaatinstellingen (locatie) openen |
| Droogte ≥3 dagen | "🔥 Xd droog" getoond in weerpil |
| Regen verwacht | "🌧️" getoond in weerpil |

### 2b. Planten toevoegen
| Test | Verwacht resultaat |
|------|--------------------|
| Camera-scan knop | Camera opent |
| Plant gescand | Herkenningsresultaat getoond in CorrectionSheet |
| CorrectionSheet: naam corrigeren | Naam/soort bewerkbaar, opgeslagen na bevestiging |
| Plant plaatsen na scan | Plant verschijnt op getikt coördinaat op kaart |
| Plant toevoegen via database | Zoeklijst toont planten, geselecteerde plant klaar voor plaatsing |
| Plant handmatig toevoegen | Naam invoeren, plant op kaart geplaatst |
| 20e plant toevoegen (gratis tier) | UpgradeModal getoond, plant NIET toegevoegd |
| 21e plant (plus/premium tier) | Plant gewoon toegevoegd |

### 2c. Plant interactie
| Test | Verwacht resultaat |
|------|--------------------|
| Plant tikken | PlantQuickSheet schuift omhoog |
| QuickSheet: taak zichtbaar | Onderhoudstaak getoond |
| QuickSheet: taak afronden | Taak verdwijnt, groene ring op plant |
| QuickSheet: details openen | PlantCardScreen opent voor die plant |
| Plant lang indrukken | PlantMenu verschijnt |
| PlantMenu: verplaatsen | Plant volgt vinger, nieuwe positie opgeslagen |
| PlantMenu: verwijderen | Bevestigingsdialoog, plant weg van kaart |
| PlantMenu: kleur wijzigen | Kleurkiezer werkt |
| PlantMenu: notitie | Notitieveld bewerkbaar |

### 2d. Zones en grenzen
| Test | Verwacht resultaat |
|------|--------------------|
| Zone uitrekken (≥2×2 cellen) | Gekleurd vlak zichtbaar op kaart |
| Zone kleur wijzigen | Kleurkiezer werkt, zone kleur veranderd |
| Zone textuur (patroon) | Patroon zichtbaar bij fill-pattern instelling |
| Grens (hek) toevoegen | Hek-lijn op kaart getoond |
| Grens (gras/terras) toevoegen | Vlak op kaart getoond |
| Grens tikken | Verwijder-alert verschijnt |
| Grens verwijderen | Grens weg van kaart |

### 2e. Kaartinstellingen
| Test | Verwacht resultaat |
|------|--------------------|
| Plantnamen toggle (🏷️) | Namen aan/uit op kaart |
| Companion overlay toggle | Kleurboringen tonen compatibiliteit per plant |
| Zoomen (2 vingers) | Kaart zoomt in/uit, planten op juiste plek |
| Plaatsing na zoom | Plant op tikpositie, niet op 100%-coördinaat |
| Kaart wissen | Alle planten, zones, grenzen en bodems gewist |

### 2f. Navigatieknoppen
| Test | Verwacht resultaat |
|------|--------------------|
| Assistent-knop | AssistantScreen opent |
| Mijn tuin-knop | MaintenanceScreen opent |
| Zaadkast-knop | SeedInventoryScreen opent |
| Profiel/info-knop | AboutScreen opent |
| Virtuele tuin-knop | VirtualGardenScreen opent |

---

## 3. Plantkaart (PlantCardScreen)

| Test | Verwacht resultaat |
|------|--------------------|
| Naam/soort bewerken | Velden bewerkbaar, opslaan werkt |
| Lichtinval instellen | Dropdown met volle zon / halfschaduw / schaduw |
| Waterschema instellen | Interval-kiezer, volgende taak herberekend |
| Bemestingsschema instellen | Interval-kiezer, taak aangemaakt |
| Snoeischema instellen | Idem |
| Notitie opslaan | Tekst bewaard na herstart |
| Foto toevoegen | Camera opent, foto zichtbaar in fotolijst |
| Foto verwijderen | Bevestigingsdialoog, foto weg |
| Oogst registreren | Gewicht / aantal / datum opgeslagen |
| Oogstlog zichtbaar | Lijst van oogsten per datum |
| Opvolgteelt suggesties | Tabel zichtbaar bij ingestelde oogstmaanden |
| Gewasrotatie-history | Voorgaande gewassen getoond |

---

## 4. Onderhoud (MaintenanceScreen)

### Tab: Taken
| Test | Verwacht resultaat |
|------|--------------------|
| Taken zichtbaar | Lijst gesorteerd op urgentie / datum |
| Taak afronden (swipe of tik) | Taak verdwijnt, streak +1, druppels +2 |
| Achterstallige taak | Rood/oranje kleurmarkering |
| Taken naar plant navigeren | Tikken op plant-naam → PlantCardScreen |

### Tab: Planning
| Test | Verwacht resultaat |
|------|--------------------|
| Weekoverzicht | Taken per dag de komende 7 dagen |
| ICS exporteren | Bestand gedeeld via systeemdialoog |

### Tab: Zaai
| Test | Verwacht resultaat |
|------|--------------------|
| Seizoenstip zichtbaar | Actuele maandtip getoond |
| Zaaibare planten | Lijst van planten die nu gezaaid kunnen worden |

### Tab: Geschiedenis
| Test | Verwacht resultaat |
|------|--------------------|
| Afgeronde taken zichtbaar | Lijst van voltooide taken per datum |
| Statistieken aanwezig | Totale taken, streak-info |

---

## 5. AI-Assistent (AssistantScreen)

| Test | Verwacht resultaat |
|------|--------------------|
| Chat openen | Leeg chatscherm met suggestievragen |
| Vraag over plant stellen | Gemini geeft tuingerelateerd antwoord |
| Foto meesturen | Camera/galerijoption, plant-analyse in antwoord |
| "Voeg toe aan tuin" | Plant toegevoegd aan actieve tuin |
| Gratis tier: 20 planten vol | UpgradeModal bij "Voeg toe aan tuin" |
| Fout bij API-call | Foutmelding getoond, app crasht niet |
| Lange conversatie | Scroll werkt, geen layout-overflow |

---

## 6. Virtuele tuin (VirtualGardenScreen)

| Test | Verwacht resultaat |
|------|--------------------|
| Scherm opent | Plantenpot-animatie zichtbaar |
| Fase 1 (0 taken) | Emoji 🌱 "Zaadje" |
| Fase 2 na 3 taken | Emoji 🌿 "Spruit" |
| Fase 3 na 7 taken | Emoji 🌾 "Jonge plant" |
| Fase 4 na 30 taken | Emoji 🌸 "Bloeiende plant" met glow |
| Fase 5 na 100 taken | Emoji 🏆 "Meesterplant" met gouden glow |
| Druppels correct | = totalTasksCompleted × 2 + currentStreak |
| Progressiebalk | Toont voortgang naar volgende fase |
| Statistieken-row | Druppels, streak, scans, planten correct |
| Prestaties grid | Ontgrendelde badges zichtbaar, vergrendeld gedempt |
| Groeifasen-lijst | Huidige fase gemarkeerd met ⭐ Nu |

---

## 7. Zaadkast (SeedInventoryScreen)

| Test | Verwacht resultaat |
|------|--------------------|
| Zaad toevoegen | Formulier invullen, pakket zichtbaar in lijst |
| Verloopdatum | Jaar getoond, verlopen pakket gemarkeerd |
| Zaad als opgemaakt markeren | Pakket doorgestreept / gedempt |
| Zaad verwijderen | Pakket weg na bevestiging |
| Lege staat | "Geen zaadpakketten" placeholder |

---

## 8. Over (AboutScreen)

| Test | Verwacht resultaat |
|------|--------------------|
| Buildlabel zichtbaar | Huidig buildnummer getoond |
| Plantenteller | Plants: X / 20 (gratis tier) |
| Tier-vergelijking | Tabel met free / plus / premium functies |
| Tier wisselen (debug) | Tier verandert, app reageert |

---

## 9. Tier-gates & Upgrade-flows

| Test | Verwacht resultaat |
|------|--------------------|
| 21e plant toevoegen (free) | UpgradeModal: "Onbeperkt planten" |
| AI "voeg toe" bij vol (free) | UpgradeModal getoond |
| Dark mode (free tier) | UpgradeModal bij activeren |
| Oogstdagboek (free tier) | UpgradeModal bij openen |
| Multi-garden (free/plus) | UpgradeModal voor premium |
| UpgradeModal sluiten | Modal verdwijnt, app normaal |

---

## 10. Notificaties

| Test | Verwacht resultaat |
|------|--------------------|
| Toestemming aanvragen | Systeem-popup bij eerste start |
| Dagelijkse herinnering | Om 08:00 melding met openstaande taken |
| Vorstmelding (plus) | Melding bij prognose ≤2°C 's nachts |
| Droogte-waarschuwing | Melding na 3+ droge dagen |

---

## 11. Persistentie & data-integriteit

| Test | Verwacht resultaat |
|------|--------------------|
| App sluiten en heropen | Tuin, planten, taken intact |
| Taak afronden, herstart | Afgeronde taak blijft afgerond |
| Streak na herstart | Streak-waarde bewaard |
| Badges na herstart | Ontgrendelde badges bewaard |
| Stats na herstart | Streak, totale taken correct (niet 0) |
| Kaart wissen | Plants + polygons + taken + grenzen + bodem leeg |

---

## 12. TypeScript & build

| Test | Verwacht resultaat |
|------|--------------------|
| `npx tsc --noEmit` | 0 fouten |
| `npx --yes expo-doctor` | Geen kritieke waarschuwingen |
| EAS build Android | Build slaagt, APK installeert |

---

## Bekende beperkingen

- EAS build vereist Expo-account en `eas login`
- Open-Meteo API vereist internet; locatietoestemming voor eigen weer
- Gemini API vereist `EXPO_PUBLIC_GEMINI_API_KEY` of proxy-config in `.env`
- Foto-log limiet (gratis: max 3 foto's/plant) nog NIET gehandhaafd in app — zie issue #115
- `npx expo-doctor` geeft installatie-prompt → gebruik `npx --yes expo-doctor`
