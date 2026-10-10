# Herakles

Herakles est une application personnelle de suivi d'entraînement, local-first, pensée pour fonctionner rapidement sur téléphone.

## Cibles

- site statique sur GitHub Pages ;
- PWA installable directement sur Android depuis le navigateur ;
- fonctionnement hors ligne après une première visite ;
- stockage local IndexedDB ;
- export/import JSON ;
- possibilité d'ajouter plus tard un paquet APK avec Capacitor et GitHub Releases.

> Le format recherché pour une application web installable est **PWA** (Progressive Web App). Une PWA n'a pas besoin du Play Store. Si un vrai fichier `.apk` est souhaité, la même application pourra ensuite être enveloppée avec Capacitor.

## Structure

```text
Herakles/
├── AGENTS.md
├── STYLE.md
├── README.md
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   └── icons/
│       └── herakles.svg
├── src/
│   ├── app.js
│   ├── storage.js
│   └── styles.css
├── data/
│   ├── schema/
│   │   └── session.schema.json
│   └── examples/
│       └── session.example.json
└── docs/
    └── DATA_MODEL.md
```

## GitHub Pages

L'application n'a pas de build : `index.html` peut être servi directement depuis la branche `master`.

Dans les paramètres du dépôt, activer GitHub Pages avec la branche `master` et le dossier racine `/`. Les chemins utilisés par l'application sont relatifs afin de fonctionner sous `/Herakles/`.

## Données

Le format d'échange canonique est JSON. Les données réelles restent sur l'appareil ; le dépôt public ne contient que des exemples fictifs.

Voir :

- `docs/DATA_MODEL.md`
- `data/schema/session.schema.json`
- `data/examples/session.example.json`

## État du projet

Socle initial uniquement. Les prochaines étapes seront l'écran de séance, le chronomètre de repos, la saisie rapide des séries, l'historique et l'import/export JSON.
