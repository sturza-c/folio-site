# Folio — vitrine produit et Folio Web

Cette page statique est prête à être ouverte ou déployée sans étape de compilation. Elle comprend une vitrine fidèle au langage visuel de Folio et une adaptation web interactive accessible depuis « Ouvrir Folio Web ».

La vitrine montre le tableau de bord, l’éditeur par blocs, la lecture de PDF avec notes par page, le calendrier, les flashcards, le canvas et un comparatif produit sourcé. La section export met côte à côte la page dans Folio, les réglages d’export et le document PDF final.

Folio Web reprend les principaux modèles de l’application macOS : navigation graphite, pages locales, éditeur par blocs, commandes Markdown et `/`, calendrier, decks de flashcards, canvas, personnalisation par photos et export académique configurable. Les changements sont conservés dans le stockage local du navigateur.

## Aperçu local

Ouvrez `index.html` directement dans votre navigateur, ou servez le dossier avec n’importe quel serveur statique.

## Publication du site

Le projet est relié à Vercel. Les pages de présentation restent statiques, et
les fonctions dans `api/` gèrent les releases Folio.

Variables Vercel requises :

- `ADMIN_PASSWORD` : mot de passe de `/admin`.
- `ADMIN_SESSION_SECRET` : secret aléatoire long utilisé pour signer la session.
- `BLOB_READ_WRITE_TOKEN` : ajouté automatiquement lorsqu’un store Vercel Blob
  est relié au projet.
- `GITHUB_RELEASE_TOKEN` : jeton GitHub à portée limitée avec accès en écriture
  aux releases du dépôt `sturza-c/folio`.
- `GITHUB_RELEASE_REPOSITORY` : facultatif, vaut `sturza-c/folio` par défaut.

## Publier une nouvelle version de Folio

1. Ouvrir `https://folioapp.ch/admin`.
2. Se connecter.
3. Déposer le nouveau fichier `.dmg`.
4. Indiquer la version, le build et les notes de version.
5. Publier.

Le DMG est stocké sous un nom versionné. `/api/download` redirige toujours vers
la version active et `/api/releases/latest` expose le même manifeste au
vérificateur de mises à jour de l’application. L’administration permet aussi de
réactiver une ancienne version sans supprimer les fichiers récents.

Quand `GITHUB_RELEASE_TOKEN` est configuré, la même publication met également
à jour la release GitHub et son fichier `Folio.dmg`. Les versions déjà installées
de Folio la vérifient et peuvent ainsi proposer la nouvelle version.

Si le stockage n’est pas encore configuré, le téléchargement retombe sur
`assets/Folio.dmg` afin que le site reste fonctionnel.
