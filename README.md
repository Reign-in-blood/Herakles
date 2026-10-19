# Herakles

Herakles est une application personnelle de suivi d'entraînement, **local-first**, pensée pour fonctionner rapidement sur téléphone pendant une séance réelle.

## Cibles

- site statique sur GitHub Pages ;
- PWA installable directement sur Android depuis le navigateur ;
- fonctionnement hors ligne après une première visite ;
- stockage local avec IndexedDB ;
- export/import JSON local ;
- possibilité d'ajouter plus tard un paquet APK avec Capacitor et GitHub Releases.

## Flux principal

Herakles est conçu pour des entraînements spontanés, sans planification obligatoire.

```text
Séance libre → catégorie / recherche → exercice → commencer
ou
Programmer une séance → nouvelle séance ou favori → nom / date / exercices
→ enregistrer → consulter la séance entière → démarrer la séance
→ choisir librement un exercice → commencer cet exercice
→ réaliser / valider → retour à la liste de séance
→ consulter/corriger les résultats ou ajouter un exercice
→ terminer la séance → récapitulatif global → enregistrer les résultats
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

Une première refonte du parcours est disponible sur **develop** : deux entrées « Séance libre » et « Programmer une séance », création et modification des séances planifiées, réutilisation de favoris indépendants (cœur dans l'agenda), vue complète de séance, ordre d'exécution libre, ajout d'exercices imprévus, correction d'exercices terminés, noms personnalisés, recherche et propositions issues des dernières performances, bandeau de chrono global fixe.

La base IndexedDB utilise désormais la version `3` avec un store additionnel `workout_plans` ; le store `sessions` conserve les séances réellement effectuées. L'export/import JSON comprend les programmes et accepte les anciens backups sans ce champ.

**État** : implémentation initiale à vérifier sur Android et hors ligne. Ne pas fusionner vers `master` sans les tests de non-régression détaillés dans `TODO.md`.

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
│   ├── workout-planner.js
│   ├── workout-plans.js
│   ├── workout.css
│   ├── app.js
│   ├── exercises.js
│   ├── notifications.js
│   ├── rest-timer.js
│   ├── session.css
│   ├── storage.js
│   └── styles.css
├── data/
│   ├── schema/
│   │   ├── session.schema.json
│   │   ├── session-v2.schema.json
│   │   └── workout-plan-v1.schema.json
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
