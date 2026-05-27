#!/usr/bin/env bash
#
# safe-build.sh — dummy-proof pre-flight voor een EAS build.
#
# Het script controleert én herstelt (waar veilig) de problemen die we
# eerder tegenkwamen:
#   1. Stale commit          → branch achter op origin
#   2. Dirty working tree    → blokkeert checkout, EAS bouwt verkeerde staat
#   3. Deps out of sync       → 'expo config' faalt
#   4. Verkeerde SDK-versies  → Gradle plugin 'expo-module-gradle-plugin' not found
#
# Gebruik:
#   npm run build:android                  # preview APK (default)
#   npm run build:android -- production    # productie AAB
#
set -euo pipefail

# ── flags ──────────────────────────────────────────────────────────────────────
# --yes / -y : sla alle bevestigingsvragen over en mail de link automatisch
AUTO_YES=0
PROFILE="preview"
for arg in "$@"; do
  case "$arg" in
    --yes|-y) AUTO_YES=1 ;;
    production|preview) PROFILE="$arg" ;;
  esac
done

PLATFORM="android"

# ── kleuren ────────────────────────────────────────────────────────────────
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
red()    { printf "\033[31m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
blue()   { printf "\033[36m%s\033[0m\n" "$1"; }
step()   { printf "\n\033[1m▸ %s\033[0m\n" "$1"; }

# Vraag ja/nee. Default = ja (Enter). Bij --yes altijd ja.
confirm() {
  local prompt="$1"
  if [[ "$AUTO_YES" == "1" ]]; then
    yellow "→ (auto-ja) $prompt"
    return 0
  fi
  read -r -p "$(printf "\033[33m%s [J/n] \033[0m" "$prompt")" answer
  case "${answer:-j}" in
    [Nn]*) return 1 ;;
    *)     return 0 ;;
  esac
}

# Open een URL in de standaard browser (Mac + Linux).
open_url() {
  local url="$1"
  if command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$url" 2>/dev/null &
  elif command -v open > /dev/null 2>&1; then
    open "$url" 2>/dev/null &
  else
    yellow "! Kan URL niet automatisch openen: $url"
  fi
}

echo "──────────────────────────────────────────────"
echo " 🌿 FloraMap safe build — profiel: $PROFILE"
echo "──────────────────────────────────────────────"

# ── 0. Staan we wel in een git-repo? ────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  red "✗ Dit is geen git-repository. Ben je in de FloraMap-map?"
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
blue "Branch: $BRANCH"

# ── 1. Branch in sync met origin ────────────────────────────────────────────
step "Stap 1/5 — Branch synchroniseren met GitHub"
git fetch origin "$BRANCH" --quiet 2>/dev/null || true
LOCAL="$(git rev-parse @)"
REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo 'none')"

if [[ "$REMOTE" == "none" ]]; then
  yellow "! Branch '$BRANCH' bestaat nog niet op origin."
  if confirm "Nu pushen naar origin?"; then
    git push -u origin "$BRANCH"
  fi
elif [[ "$LOCAL" != "$REMOTE" ]]; then
  BASE="$(git merge-base @ "origin/$BRANCH")"
  if [[ "$LOCAL" == "$BASE" ]]; then
    yellow "! Je loopt achter op origin/$BRANCH."
    if confirm "Nu 'git pull' uitvoeren?"; then
      git pull origin "$BRANCH"
      green "✓ Bijgewerkt — herstart het script: npm run build:android"
      exit 0
    else
      red "✗ Kan niet veilig bouwen vanaf een oude commit. Gestopt."
      exit 1
    fi
  elif [[ "$REMOTE" == "$BASE" ]]; then
    yellow "! Je hebt lokale commits die nog niet op origin staan."
    if confirm "Nu pushen?"; then
      git push origin "$BRANCH"
    fi
  else
    red "✗ Branch is uiteengelopen met origin (allebei eigen commits)."
    red "  Los dit handmatig op met: git pull origin $BRANCH"
    exit 1
  fi
fi
green "✓ Branch is in sync ($(git rev-parse --short @))"

# ── 2. Schone werkmap ───────────────────────────────────────────────────────
step "Stap 2/5 — Werkmap controleren"
if [[ -n "$(git status --porcelain)" ]]; then
  yellow "! Er zijn niet-gecommitte wijzigingen:"
  git status --short
  echo
  yellow "  EAS bouwt alleen wat is GECOMMIT. Niet-gecommitte wijzigingen"
  yellow "  gaan NIET mee in de build."
  if confirm "Wijzigingen nu committen en pushen?"; then
    read -r -p "Commit-bericht: " msg
    git add -A
    git commit -m "${msg:-chore: pre-build commit}"
    git push origin "$BRANCH"
    green "✓ Gecommit en gepusht"
  else
    red "✗ Bouwen met een dirty tree geeft onbetrouwbare builds. Gestopt."
    exit 1
  fi
fi
green "✓ Werkmap is schoon"

# ── 3. Dependencies synchroniseren ──────────────────────────────────────────
step "Stap 3/5 — Dependencies installeren"
npm install --no-audit --no-fund
green "✓ npm install klaar"

# ── 4. Expo doctor: SDK-versies & config valideren ──────────────────────────
step "Stap 4/5 — Expo-checks (SDK-versies, config)"

# 4a. Versie-mismatch automatisch repareren (de '^56.x op SDK 52'-val)
yellow "→ Controleren of alle expo-* packages bij je SDK-versie passen…"
NEEDS_COMMIT=0
if npx expo install --fix > /tmp/expo-fix.log 2>&1; then
  if ! git diff --quiet -- package.json package-lock.json 2>/dev/null; then
    yellow "! 'expo install --fix' heeft versies gecorrigeerd:"
    git --no-pager diff --stat -- package.json package-lock.json
    NEEDS_COMMIT=1
  else
    green "✓ Alle expo-packages passen bij de SDK"
  fi
else
  yellow "! Kon versies niet automatisch controleren (geen netwerk?). Doorgaan."
fi

if [[ "$NEEDS_COMMIT" == "1" ]]; then
  if confirm "De versie-correcties committen en pushen?"; then
    git add package.json package-lock.json
    git commit -m "fix: pin expo modules to SDK-compatible versions"
    git push origin "$BRANCH"
    green "✓ Versie-fix gecommit en gepusht"
  else
    red "✗ Zonder commit bouwt EAS de oude (verkeerde) versies. Gestopt."
    exit 1
  fi
fi

# 4b. Config moet laadbaar zijn
yellow "→ Expo config valideren…"
if ! npx expo config --json > /dev/null 2>&1; then
  red "✗ 'expo config' faalt — controleer app.json en je plugins/env."
  npx expo config --json || true
  exit 1
fi
green "✓ Expo config is geldig"

# 4c. Algemene gezondheidscheck (waarschuwt, blokkeert niet)
yellow "→ npx expo-doctor (waarschuwingen)…"
npx --yes expo-doctor || yellow "! expo-doctor gaf waarschuwingen — lees ze hierboven."

# ── 5. Build-identiteit tonen + bouwen ──────────────────────────────────────
step "Stap 5/5 — Bouwen"
VERSION="$(node -p "require('./app.json').expo.version")"
VCODE="$(node -p "require('./app.json').expo.android.versionCode")"
COMMIT="$(git rev-parse --short @)"

echo "──────────────────────────────────────────────"
green " Bouwen: v$VERSION · versionCode $VCODE · commit $COMMIT"
echo "──────────────────────────────────────────────"
echo " ✅ Verifieer dit straks in de app onder:"
echo "    Onderhoud → ℹ️ → Over FloraMap"
echo "    Daar moet staan: v$VERSION · Build #… · versionCode $VCODE"
echo "──────────────────────────────────────────────"
echo

if ! confirm "Alles gecontroleerd. Nu de EAS build starten?"; then
  yellow "Gestopt op jouw verzoek. Niets gebouwd."
  exit 0
fi

BUILD_LOG="$(mktemp /tmp/floramap-build-XXXXXX)"

if [[ "$AUTO_YES" == "1" ]]; then
  # Niet-interactief: stroom output naar scherm én naar logbestand
  npx --yes eas-cli build --profile "$PROFILE" --platform "$PLATFORM" --non-interactive \
    2>&1 | tee "$BUILD_LOG"
else
  npx --yes eas-cli build --profile "$PROFILE" --platform "$PLATFORM" \
    2>&1 | tee "$BUILD_LOG"
fi

# ── Bouw-URL opvangen ──────────────────────────────────────────────────────────
BUILD_URL=$(grep -oE 'https://expo\.dev/[^ ]+' "$BUILD_LOG" | head -1 || true)
rm -f "$BUILD_LOG"

if [[ -n "$BUILD_URL" ]]; then
  BUILD_LABEL_VAL="$(node -p "require('./app.json').expo.extra.buildLabel" 2>/dev/null || echo '?')"
  echo
  green "✓ Build-URL: $BUILD_URL"

  if [[ "$AUTO_YES" == "1" ]]; then
    # URL-encode de relevante velden voor mailto
    SUBJECT="FloraMap Build %23${BUILD_LABEL_VAL} %C2%B7 v${VERSION} (versionCode ${VCODE})"
    BODY="Hoi%2C%0A%0AJe nieuwe FloraMap-build staat klaar!%0A%0A"\
"Build%3A %23${BUILD_LABEL_VAL} %C2%B7 v${VERSION} %C2%B7 versionCode ${VCODE}%0A"\
"Commit%3A ${COMMIT}%0A%0A"\
"Download%2Finstalleer via%3A%0A${BUILD_URL}%0A%0A"\
"Groetjes%2C Claude"
    MAILTO="mailto:jordyzinkstok%40gmail.com?subject=${SUBJECT}&body=${BODY}"

    blue "→ Mail-concept openen…"
    open_url "$MAILTO"
    green "✓ Concept geopend — klik 'Verzenden' in je mailprogramma."
  fi
else
  yellow "! Kon de build-URL niet automatisch vinden in de output."
fi
