# FloraMap Publishing Checklist

Doel: FloraMap opnieuw publiceren als afgerond hobbytraject, met een realistische app-store flow inclusief gratis, Plus en Premium positionering.

## 1. Releasebasis

- `npm run lint` moet draaien zonder configuratiefouten.
- `npm test` moet groen zijn, ook als er nog geen tests zijn.
- `npx tsc --noEmit` moet groen zijn.
- `app.json` is de bron voor storeversie, buildlabel en Android `versionCode`.
- `package.json`, README en app-store metadata gebruiken dezelfde publieke versie.

## 2. Productscope Voor Publicatie

Publiceer alleen functionaliteit die in de app zichtbaar en bruikbaar is:

- Tuinkaart met planten, zones en grenzen.
- Planten toevoegen via handmatig, database, camera en galerij.
- Onderhoudstaken, planning, zaaikalender, geschiedenis en kalenderexport.
- Plantdetails met notities, groeifoto's en oogstlog.
- Weeradvies en notificaties.
- Backup en import.
- Zaadvoorraad, meerdere tuinen, achievements en virtuele tuin.
- AI-assistent via Cloudflare Worker proxy.

Niet als werkende store-feature claimen zolang het niet volledig aangesloten is:

- AR-scan of ruimtelijke scan.
- Betaalde aankoopverwerking.
- Serveraccounts of cloudsync.

## 3. Freemium En Premium

Gratis tier:

- Maximaal 20 planten.
- Basis tuinkaart, taken, planning, zaaikalender, backup en weeradvies.

Plus positionering:

- Meer dan 20 planten.
- Onbeperkte AI-assistent.
- Uitgebreide foto- en oogstlogs.
- Extra notificaties en maankalender.

Premium positionering:

- Meerdere tuinen.
- Bodemgezondheid.
- PDF-export.
- Gewasrotatie.
- Uitgebreide statistieken en alle achievements.

Belangrijk voor publicatie: als echte in-app aankopen nog niet actief zijn, noem dit in storetekst niet als koopbare functionaliteit. Gebruik de app intern als demo van de tiers of zet aankoopclaims uit.

## 4. Android Build

- Controleer `.env` of EAS secrets:
  - `EXPO_PUBLIC_API_PROXY_URL`
  - `EXPO_PUBLIC_API_TOKEN`
- Worker secrets:
  - `GEMINI_API_KEY`
  - `FLORAMAP_TOKEN`
- Build lokaal of via EAS:
  - `npm run build:android`
- Build automatisch met commit en push:
  - `npm run build:android:auto -- production`
- Optioneel eigen commitbericht:
  - `BUILD_COMMIT_MESSAGE="chore: prepare Play Store build" npm run build:android:auto -- production`
- Upload de `.aab` naar Google Play Console.

## 5. Store Assets

Benodigd:

- Appnaam: FloraMap.
- Korte beschrijving.
- Volledige beschrijving.
- Privacybeleid URL.
- App-icoon.
- Feature graphic.
- Minimaal twee Android screenshots.
- Data safety-formulier:
  - Camera voor plantfoto's.
  - Locatie voor weeradvies.
  - Lokale opslag voor tuindata.
  - AI-verzoeken via proxy wanneer AI wordt gebruikt.

## 6. Laatste Preflight

- Fresh install getest.
- Onboarding getest.
- Plant handmatig toevoegen getest.
- Plant via database toevoegen getest.
- Camera/galerij scan getest met geldige proxy.
- Taak afronden getest zonder dubbele stats.
- Backup export/import getest.
- Notificatiepermissie getest.
- App zonder API-config geeft duidelijke foutmelding bij AI.
