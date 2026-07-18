#!/bin/zsh

set -euo pipefail

SITE="/Users/chris/Documents/Codex/2026-07-13/c-estan/outputs/folio-site"
PROJECT="/Users/chris/nocturne/Nocturne.xcodeproj"
DERIVED="/Users/chris/Documents/Codex/2026-07-13/c-estan/work/FolioRelease"
APP="$DERIVED/Build/Products/Release/Folio.app"
STAGING="$DERIVED/DiskImage"
DMG="$SITE/assets/Folio.dmg"
LOG="/Users/chris/Documents/Codex/2026-07-13/c-estan/work/folio-release-user.log"

finish() {
  local result=$?
  echo
  if [[ $result -eq 0 ]]; then
    echo "✓ La dernière version de Folio est maintenant en ligne."
    echo "  https://folio-site-kappa.vercel.app"
  else
    echo "✗ La mise à jour s'est arrêtée."
    echo "  Le détail est enregistré ici : $LOG"
  fi
  echo
  read -k 1 "?Appuie sur une touche pour fermer cette fenêtre."
  exit $result
}
trap finish EXIT

mkdir -p "${DERIVED:h}" "${LOG:h}"
rm -rf "$DERIVED"

echo "1/5  Compilation de la dernière version de Folio…"
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild \
  -project "$PROJECT" \
  -scheme Nocturne \
  -configuration Release \
  -destination 'platform=macOS' \
  -derivedDataPath "$DERIVED" \
  CODE_SIGNING_ALLOWED=NO \
  ENABLE_USER_SCRIPT_SANDBOXING=NO \
  COMPILER_INDEX_STORE_ENABLE=NO \
  clean build 2>&1 | tee "$LOG"

[[ -d "$APP" ]] || { echo "Folio.app n'a pas été produit."; false; }

echo
echo "2/5  Signature locale de l'application…"
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

echo
echo "3/5  Création de l'image disque…"
rm -rf "$STAGING"
mkdir -p "$STAGING"
ditto "$APP" "$STAGING/Folio.app"
ln -s /Applications "$STAGING/Applications"
rm -f "$DMG"
hdiutil create -volname "Folio" -srcfolder "$STAGING" -ov -format UDZO "$DMG"
hdiutil verify "$DMG"

VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist")
ARCHS=$(lipo -archs "$APP/Contents/MacOS/Folio")
SIZE=$(du -h "$DMG" | awk '{print $1}')
echo "  Folio $VERSION · $ARCHS · $SIZE"

echo
echo "4/5  Vérification du site…"
cd "$SITE"
/usr/bin/env node --check script.js

echo
echo "5/5  Publication sur Vercel…"
if ! npx vercel whoami >/dev/null 2>&1; then
  npx vercel login
fi
npx vercel --prod --yes
