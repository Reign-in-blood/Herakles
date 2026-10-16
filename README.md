# Herakles

Herakles est une application personnelle de suivi d'entraînement, **local-first**, pensée pour fonctionner rapidement sur téléphone pendant une séance réelle.

## Cibles

- site statique sur GitHub Pages ;
- PWA installable directement sur Android depuis le navigateur ;
- fonctionnement hors ligne après une première visite ;
- stockage local avec IndexedDB ;
- export/import JSON à terme ;
- possibilité d'ajouter plus tard un paquet APK avec Capacitor et GitHub Releases.

## Flux principal

Herakles est conçu pour des entraînements spontanés, sans planification obligatoire.

```text
Commencer une séance
→ choisir un exercice
→ configurer la musculation ou ouvrir directement l'écran d'un cardio machine
→ démarrer explicitement le cardio depuis son écran
→ réaliser l'exercice
→ consulter son récapitulatif
→ enregistrer l'exercice dans la séance active
→ ajouter d'autres exercices si nécessaire
→ terminer la séance
→ consulter le récapitulatif global
→ enregistrer la séance complète
```

Une séance est donc un conteneur composé de plusieurs exercices. **Terminer un exercice ne termine pas la séance.**

## État actuel

Le socle PWA et une grande partie du parcours d'entraînement sont en place :

- accueil mobile avec navigation ;
- sélection par catégories et catalogue d'exercices ;
- configuration des exercices de musculation ;
- cardio machine pour tapis de course, rameur, vélo et vélo elliptique, avec chrono à `00:00:00` et bouton **Démarrer l'exercice** sur le même écran ;
- chrono propre au cardio, durée figée à la fin, saisie de la distance puis calcul automatique de la vitesse moyenne ;
- inclinaison moyenne facultative pour le tapis de course ;
- gestion des séries avec répétitions et charges modifiables ;
- validation progressive des séries ;
- chronomètre de récupération fiable avec reprise par timestamps ;
- notifications de fin de repos ;
- suivi d'un chrono global de séance ;
- récapitulatif d'exercice intégré au flux multi-exercices ;
- stockage local IndexedDB ;
- PWA hors ligne avec mécanisme de mise à jour automatique et recherche manuelle des mises à jour.

La priorité actuelle reste la fiabilité des données locales et les tests réels de reprise de séance et de cardio sur téléphone.

## Structure

```text
Herakles/
├── AGENTS.md
├── STYLE.md
├── TODO.md
├── README.md
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
├── src/
│   ├── app.js
│   ├── exercises.js
│   ├── notifications.js
│   ├── rest-timer.js
│   ├── session.css
│   ├── storage.js
│   └── styles.css
├── data/
│   ├── schema/
│   │   └── session.schema.json
│   └── examples/
└── docs/
    └── DATA_MODEL.md
```

## GitHub Pages

L'application n'a pas de chaîne de build : les fichiers sont servis directement par GitHub Pages. `master` est réservé à la version stable publiée ; le développement courant se fait sur `develop`.

Les chemins restent relatifs afin que l'application fonctionne correctement sous `/Herakles/`.

## Données

Le format d'échange canonique est JSON. Les données réelles restent sur l'appareil ; le dépôt public ne doit contenir que des exemples fictifs ou anonymisés.

La hiérarchie métier est :

```text
séance → exercices[] → données propres à chaque exercice
```

Les totaux de séance doivent être recalculables depuis les données des exercices et de leurs séries.

Voir :

- `AGENTS.md` pour les règles de développement et le flux produit de référence ;
- `docs/DATA_MODEL.md` pour la structure des données ;
- `data/schema/session.schema.json` pour le schéma JSON actuel ;
- `TODO.md` pour les prochaines priorités.
