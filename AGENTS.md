# AGENTS.md — Herakles

Ce fichier est la référence de travail pour tout agent ou contributeur automatisé sur ce dépôt.

## Règle prioritaire

Avant toute lecture approfondie, modification, création de fichier, commit ou PR : **lire `AGENTS.md` en premier** et respecter ses règles.

## Contexte utilisateur

Le propriétaire du projet possède :

- un bon niveau en **HTML** ;
- un bon niveau en **CSS** ;
- des bases en **JavaScript**.

Adapter les explications en conséquence : ne pas sur-expliquer HTML/CSS, mais expliquer clairement les choix JavaScript, les APIs navigateur, IndexedDB, PWA, service workers et tout outillage nouveau lorsqu'ils apparaissent.

Après **chaque action effectuée sur le dépôt distant**, fournir au propriétaire les commandes Git simples nécessaires pour récupérer proprement les changements en local. Privilégier des commandes courtes, copiables telles quelles.

## Workflow Git obligatoire

- **Ne jamais travailler directement sur `master`.**
- La branche de travail principale est **`develop`**.
- Toute modification effectuée par un agent doit être commitée sur `develop`, ou sur une branche de fonctionnalité créée depuis `develop` si cela devient nécessaire.
- `master` est réservé aux versions stables / publiées et ne doit recevoir des changements que par fusion volontaire depuis `develop`.
- Avant d'écrire dans le dépôt, vérifier la branche ciblée.
- Ne jamais utiliser `git push --force` sur `master` ou `develop`.
- Pour une petite évolution normale, préférer un commit directement sur `develop` plutôt que de multiplier inutilement les branches.

### Commandes à communiquer après une modification sur `develop`

Si `develop` existe déjà en local :

```bash
git switch develop
git pull origin develop
```

Si c'est la première récupération de `develop` sur la machine :

```bash
git fetch origin
git switch --track origin/develop
```

Si une branche de fonctionnalité est utilisée, donner explicitement les commandes adaptées à cette branche et indiquer ensuite comment revenir sur `develop`.

## Objectif produit

Herakles est une application personnelle de suivi d'entraînement, pensée d'abord pour être :

- simple et rapide pendant une séance ;
- utilisable hors ligne ;
- sans abonnement, publicité ni compte obligatoire ;
- accessible comme site statique via GitHub Pages ;
- installable sur Android comme **PWA (Progressive Web App)** ;
- éventuellement empaquetable plus tard en APK Android (par exemple avec Capacitor) sans dépendre d'un app store.

Les entraînements sont **spontanés** : Herakles ne doit pas imposer de planification ou de programme préalable pour commencer une séance.

## Flux produit de référence

Le cheminement principal doit rester le suivant :

```text
Créer / commencer une séance
        ↓
Choisir un exercice
        ↓
Configurer puis réaliser ses séries ou son cardio
        ↓
Récapitulatif de l'exercice
        ↓
Enregistrer l'exercice dans la séance active
        ↓
Choisir un autre exercice et recommencer si nécessaire
        ↓
Terminer la séance
        ↓
Récapitulatif global de la séance
        ↓
Enregistrer la séance complète
```

Règles importantes :

- une **séance** est le conteneur global ;
- une séance contient **un ou plusieurs exercices réalisés successivement** ;
- terminer un exercice **ne termine pas la séance** ;
- le chrono global de séance commence au démarrage de la séance et continue entre les exercices et pendant les récupérations ;
- chaque exercice possède aussi son propre début, sa propre fin et sa propre durée ;
- le bouton d'enregistrement du récapitulatif d'exercice ajoute l'exercice à la séance active puis revient au choix des exercices ;
- seul le flux explicite **Terminer la séance** clôt la séance et déclenche son récapitulatif global ;
- les agrégats de séance (répétitions, volume, durée, calories estimées, nombre d'exercices) doivent être calculables depuis les exercices enregistrés.

### Musculation pendant un exercice

- chaque série possède ses propres répétitions et sa propre charge modifiable ;
- le bouton de récupération placé après la première série non réalisée valide cette série puis lance son repos ;
- à la fin du repos, retour automatique aux séries ;
- une série terminée devient une ligne de lecture seule avec ses valeurs réelles ;
- la dernière série conduit à **Terminer l'exercice**, puis au récapitulatif de l'exercice.

### Chronomètre de repos

Deux usages distincts doivent rester possibles :

1. récupération liée à une série : durée issue de l'exercice, démarrage immédiat, sans menu de presets ;
2. futur chrono libre indépendant d'une séance : presets disponibles et fonctionnement autonome.

## Architecture actuelle

Priorité à une architecture minimale, statique et durable :

- `index.html` : coque et écrans de l'application ;
- `src/styles.css` : styles globaux ;
- `src/session.css` : styles spécifiques au suivi de séance ;
- `src/app.js` : navigation et logique principale ;
- `src/exercises.js` : catalogue et catégories d'exercices ;
- `src/rest-timer.js` : chronomètre de récupération ;
- `src/notifications.js` : notifications liées au repos ;
- `src/storage.js` : persistance IndexedDB ;
- `manifest.webmanifest` : installation PWA ;
- `sw.js` : cache/service worker ;
- `data/schema/` : schémas versionnés des données ;
- `data/examples/` : exemples fictifs, jamais de données personnelles réelles ;
- `docs/` : décisions d'architecture et documentation.

Éviter un framework ou une chaîne de build tant qu'ils ne sont pas justifiés. Le site doit pouvoir fonctionner directement depuis GitHub Pages.

## Données et confidentialité

Herakles est **local-first** :

1. les données utilisateur sont stockées sur l'appareil ;
2. une séance en cours doit pouvoir être restaurée après rafraîchissement ou fermeture accidentelle ;
3. la séance terminée est persistée dans IndexedDB ;
4. l'utilisateur devra pouvoir exporter/importer ses données en JSON ;
5. aucune donnée personnelle ou de santé réelle ne doit être commitée dans ce dépôt public ;
6. les exemples du dépôt doivent être fictifs/anonymisés ;
7. tout format de données doit contenir un `schema_version` pour permettre les migrations futures.

Le JSON est le format d'échange canonique. IndexedDB est le stockage applicatif local recommandé.

## Modèle de données — principes

Une séance contient au minimum :

- identifiant unique ;
- date/heure de début et de fin ;
- durée globale ;
- snapshot optionnel des mensurations (`weight_kg`, `height_cm`) ;
- liste ordonnée des exercices réalisés ;
- résumé calculable de la séance ;
- notes et indicateurs facultatifs.

Chaque exercice enregistré dans une séance contient au minimum :

- identifiant/type/nom de l'exercice ;
- date/heure de début et de fin ;
- durée de l'exercice ;
- données brutes propres au type d'exercice ;
- résumé calculable de l'exercice.

Pour la musculation, les données brutes comprennent notamment les séries, répétitions, charges et repos. Pour le cardio, elles comprennent notamment durée, distance, vitesse/allure et inclinaison lorsqu'elles sont disponibles.

Les valeurs calculées comme `volume_kg`, `exercise_volume_kg` ou `session_volume_kg` peuvent être mises en cache, mais doivent toujours pouvoir être recalculées à partir des données brutes.

### Calories estimées

Les calories ne sont qu'une **estimation**, jamais une donnée mesurée. Conserver si possible la méthode et les paramètres utilisés pour permettre un recalcul ultérieur.

Pour une première approximation, une formule MET peut être utilisée :

```text
kcal = MET × 3.5 × weight_kg / 200 × duration_minutes
```

Ne pas présenter cette estimation comme précise. Lorsque le profil utilisateur contiendra un poids réel, utiliser un snapshot de ce poids au moment de la séance plutôt qu'une valeur de référence fixe.

### Charges machine

Ne pas mélanger les notions suivantes :

- poids ajouté (`plates_total_kg`) ;
- poids ajouté par côté (`plates_per_side_kg`) ;
- résistance de départ de la machine (`machine_base_resistance_kg`) ;
- charge nominale totale (`nominal_load_kg`) ;
- poids du corps (`body_weight_kg`).

Le poids du corps ne doit pas être automatiquement ajouté à la charge nominale d'une machine. Il reste une donnée séparée sauf modèle biomécanique explicitement défini.

## Types d'exercices

Prévoir au moins :

- `strength` : séries, répétitions, charge, repos ;
- `cardio` : durée, distance, dénivelé, vitesse/allure, inclinaison ;
- extensible plus tard à d'autres types sans casser les anciennes données.

## Chronomètre de repos

Le chrono est une fonctionnalité centrale :

- démarrage rapide après validation d'une série ;
- durée par défaut configurable par exercice ;
- temps prévu et temps réellement pris conservés séparément ;
- fonctionnement fiable écran allumé ou application en arrière-plan autant que les APIs web le permettent ;
- reprise correcte après rafraîchissement/rechargement en stockant un timestamp de fin, pas seulement un compteur décrémenté.

## Compatibilité GitHub Pages / PWA

- utiliser des chemins relatifs compatibles avec un sous-chemin tel que `/Herakles/` ;
- ne pas supposer que l'application est servie à la racine d'un domaine ;
- la PWA doit rester utilisable hors ligne après une première visite ;
- le service worker doit être versionné et son cache facile à invalider ;
- toute nouvelle ressource nécessaire hors ligne doit être ajoutée au cache applicatif.

## Qualité

Pour chaque modification significative :

- garder l'interface utilisable sur téléphone en priorité ;
- éviter les dépendances inutiles ;
- ne pas casser les anciennes données sans migration ;
- documenter toute évolution du schéma ;
- vérifier que les fichiers JSON restent valides ;
- privilégier des unités explicites dans les noms de champs (`_kg`, `_cm`, `_seconds`, `_km`, `_m`).

## Style produit

Identité visuelle : **Herakles**, ambiance grecque sobre. Pas de surcharge décorative ; la lisibilité pendant l'entraînement prime.

Consulter également `STYLE.md` avant toute modification visuelle importante.
