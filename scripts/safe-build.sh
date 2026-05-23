#!/usr/bin/env bash
#
# safe-build.sh — pre-flight checks before an EAS build.
#
# Prevents the three failure modes we hit before:
#   1. Building from a stale commit (local branch behind remote)
#   2. Dirty working tree blocking `git checkout` → EAS archives wrong state
#   3. node_modules out of sync with package.json → `expo config` fails
#
# Usage:
#   npm run build:android            # preview APK (default)
#   npm run build:android -- production   # production AAB
#
set -euo pipefail

PROFILE="${1:-preview}"
PLATFORM="android"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

echo "──────────────────────────────────────────────"
echo " FloraMap safe build — profile: $PROFILE"
echo "──────────────────────────────────────────────"

# 1. Working tree must be clean -------------------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  red "✗ Werkmap is niet schoon. Commit of stash je wijzigingen eerst:"
  git status --short
  exit 1
fi
green "✓ Werkmap is schoon"

# 2. Branch must be up to date with its remote ---------------------------------
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin "$BRANCH" --quiet
LOCAL="$(git rev-parse @)"
REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo 'none')"

if [[ "$REMOTE" == "none" ]]; then
  yellow "! Branch '$BRANCH' bestaat niet op origin — push 'm eerst als dat de bedoeling is."
elif [[ "$LOCAL" != "$REMOTE" ]]; then
  red "✗ Lokale branch '$BRANCH' wijkt af van origin/$BRANCH."
  red "  Lokaal:  $LOCAL"
  red "  Remote:  $REMOTE"
  red "  Run:  git pull origin $BRANCH"
  exit 1
fi
green "✓ Branch '$BRANCH' is in sync met origin ($LOCAL)"

# 3. Dependencies in sync ------------------------------------------------------
echo "→ npm install (deps synchroniseren met package.json)…"
npm install --no-audit --no-fund
green "✓ Dependencies geïnstalleerd"

# 4. Expo config must resolve --------------------------------------------------
echo "→ Expo config valideren…"
if ! npx expo config --json > /dev/null 2>&1; then
  red "✗ 'expo config' faalt — controleer app.json en plugins/env."
  npx expo config --json || true
  exit 1
fi
green "✓ Expo config is geldig"

# 5. Show the build identity so you can verify it in the app -------------------
VERSION="$(node -p "require('./app.json').expo.version")"
VCODE="$(node -p "require('./app.json').expo.android.versionCode")"
echo "──────────────────────────────────────────────"
green " Bouwen: v$VERSION · versionCode $VCODE · commit ${LOCAL:0:7}"
echo " Controleer dit straks in: Over FloraMap"
echo "──────────────────────────────────────────────"

# 6. Build ---------------------------------------------------------------------
npx eas build --profile "$PROFILE" --platform "$PLATFORM"
