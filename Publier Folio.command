#!/bin/zsh

set -e

SITE_DIR="/Users/chris/Documents/Codex/2026-07-13/c-estan/outputs/folio-site"
cd "$SITE_DIR"

clear
echo "Publication de Folio sur Vercel"
echo ""

echo "Vérification du JavaScript…"
node --check script.js
echo "JavaScript valide."
echo ""

if ! vercel whoami >/dev/null 2>&1; then
  echo "Une connexion Vercel va s’ouvrir. Valide-la dans le navigateur."
  vercel login
fi

echo ""
echo "Déploiement de la version corrigée…"
vercel --prod --yes

echo ""
echo "Folio est publié : https://folio-site-kappa.vercel.app"
echo "Tu peux fermer cette fenêtre."
read -k 1
