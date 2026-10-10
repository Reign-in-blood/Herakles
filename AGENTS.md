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

## Architecture initiale

Priorité à une architecture minimale, statique et durable :

- `index.html` : coque de l'application ;
- `src/styles.css` : styles ;
- `src/app.js` : logique UI ;
- `src/storage.js` : persistance locale ;
- `manifest.webmanifest` : installation PWA ;
- `sw.js` : service worker/offline ;
- `data/schema/` : schémas versionnés des données ;
- `data/examples/` : exemples fictifs, jamais de données personnelles réelles ;
- `docs/` : décisions d'architecture et documentation.

Éviter un framework ou une chaîne de build tant qu'ils ne sont pas justifiés. Le site doit pouvoir fonctionner directement depuis GitHub Pages.

## Données et confidentialité

Herakles est **local-first** :

1. les données utilisateur sont stockées sur l'appareil (IndexedDB) ;
2. l'utilisateur doit pouvoir exporter/importer ses données en JSON ;
3. aucune donnée personnelle ou de santé réelle ne doit être commitée dans ce dépôt public ;
4. les exemples du dépôt doivent être fictifs/anonymisés ;
5. tout format de données doit contenir un `schema_version` pour permettre les migrations futures.

Le JSON est le format d'échange canonique. IndexedDB est le stockage applicatif local recommandé.

## Modèle de données — principes

Une séance contient au minimum :

- identifiant unique ;
- date/heure de début et de fin ;
- durée ;
- snapshot optionnel des mensurations (`weight_kg`, `height_cm`) ;
- exercices ;
- séries et répétitions pour la musculation ;
- charge/résistance et détails machine ;
- temps de repos prévu et réel ;
- volume total de séance calculable ;
- notes et indicateurs facultatifs (RPE, douleur, énergie).

Les valeurs calculées comme `volume_kg` ou `session_volume_kg` peuvent être mises en cache, mais doivent toujours pouvoir être recalculées à partir des données brutes.

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
- le service worker doit être versionné et son cache facile à invalider.

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

Consulter également `STYLE.md` si ce fichier contient des règles de design supplémentaires.
