# AGENTS.md — Herakles

Ce fichier est la référence de travail pour tout agent ou contributeur automatisé sur ce dépôt.

## Règle prioritaire

**Ta mémoire de contexte va être compressée régulièrement. Maintiens donc régulièrement à jour :**

- `AGENTS.md`
- `STYLE.md`
- `docs/DATA_MODEL.md`
- `TODO.md`

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

```bash
git switch develop
git pull origin develop
```

Si c'est la première récupération de `develop` :

```bash
git fetch origin
git switch --track origin/develop
```

## Objectif produit

Herakles est une application personnelle de suivi d'entraînement, pensée d'abord pour être :

- simple et rapide pendant une séance ;
- utilisable hors ligne ;
- **local-first** ;
- sans abonnement, publicité ni compte obligatoire ;
- accessible comme site statique via GitHub Pages ;
- installable sur Android comme PWA ;
- éventuellement empaquetable plus tard en APK Android avec Capacitor.

Les entraînements sont **spontanés** : Herakles ne doit pas imposer de planification ou de programme préalable pour commencer une séance.

## Flux produit de référence

```text
Créer / commencer une séance
        ↓
Choisir un thème / groupe (dos, jambes, bras, etc.)
        ↓
Choisir un exercice dans ce thème
        ↓
Configurer la musculation ou démarrer immédiatement le cardio machine
        ↓
Réaliser l'exercice
        ↓
Récapitulatif de l'exercice
        ↓
Enregistrer l'exercice dans la séance active
        ↓
Revenir directement à la liste des exercices du même thème
        ↓
Ajouter un autre exercice du thème, ou Terminer la séance
        ↓
Récapitulatif global de la séance
        ↓
Enregistrer et clôturer la séance complète
```

Règles importantes :

- une **séance** est le conteneur global ;
- une séance contient un ou plusieurs exercices réalisés successivement ;
- le thème/groupe est choisi au début de la séance et reste le contexte de sélection jusqu'à la fin ;
- après validation d'un exercice, revenir à la liste des exercices du thème actif, pas au choix des groupes ;
- terminer un exercice ne termine pas la séance ;
- seul **Terminer la séance** clôt la séance ;
- le chrono global continue entre les exercices et pendant les récupérations ;
- chaque exercice possède son propre début, sa propre fin et sa propre durée ;
- les agrégats de séance doivent rester recalculables depuis les exercices enregistrés.

### Musculation pendant un exercice

- chaque série possède ses propres répétitions et sa propre charge modifiable ;
- la récupération valide la série courante puis lance son repos ;
- à la fin du repos, retour automatique aux séries ;
- une série terminée devient une ligne de lecture seule ;
- la dernière série conduit à **Terminer l'exercice**, puis au récapitulatif ;
- l'exercice courant peut être corrigé ou abandonné sans perdre les exercices déjà enregistrés dans la séance.

### Cardio machine pendant un exercice

Le tapis de course, le rameur, le vélo et le vélo elliptique suivent un flux distinct de la musculation :

- sélectionner le cardio démarre immédiatement l'exercice, sans formulaire préalable ;
- `started_at` pilote le chrono propre à l'exercice et doit rester persisté pour survivre au rechargement ;
- **Terminer l'exercice** fige `ended_at` et donc la durée réelle ;
- après l'arrêt, demander la distance parcourue en kilomètres ;
- calculer la vitesse moyenne depuis la distance et la durée réelles, sans la demander à l'utilisateur ;
- le tapis de course peut recevoir une inclinaison moyenne facultative ;
- conserver les mesures finales dans l'état de séance avant d'afficher le récapitulatif ;
- si la page est rechargée après l'arrêt mais avant validation des mesures, revenir au formulaire de fin de cardio, pas directement au récapitulatif ;
- enregistrer ensuite explicitement le cardio dans la séance active comme n'importe quel autre exercice.

### Chronomètre de repos

Deux usages distincts :

1. récupération liée à une série : durée issue de l'exercice, démarrage immédiat, sans presets ;
2. futur chrono libre indépendant d'une séance : presets disponibles.

Le chrono doit utiliser des timestamps persistés pour survivre au rechargement et à l'arrière-plan.

## Profil utilisateur local

Le profil est **local et distinct d'un éventuel compte cloud futur**. L'application doit rester pleinement utilisable sans compte.

Le profil actuel contient :

- sexe : `male` / `female` ;
- taille en cm ;
- objectif de séances sur 7 jours (`1..7`) ;
- objectif principal : perte de poids, prise de poids, remise en forme, prise de muscle, force ou endurance ;
- poids cible uniquement pour perte/prise de poids.

Le poids réel est historisé séparément dans IndexedDB afin de permettre un graphique dans le temps. Une saisie par jour suffit pour le modèle actuel.

Pour un objectif de poids :

- perte de poids : objectif atteint si le dernier poids est `<= target_weight_kg` ;
- prise de poids : objectif atteint si le dernier poids est `>= target_weight_kg`.

La ligne d'objectif du graphique utilise l'état erreur tant que la cible n'est pas atteinte et l'état succès lorsqu'elle l'est.

Prochaine évolution prévue : ajouter un `user_snapshot` (poids/taille) à chaque nouvelle séance pour figer les données historiques utilisées dans les calculs, notamment les calories.

## Tableau de bord d'accueil

Le tableau de bord d'accueil est une **vue dérivée** des séances terminées du store IndexedDB `sessions`. Ne jamais créer une deuxième source de vérité pour ces statistiques.

Périodes disponibles :

- `7 jours` : 7 jours calendaires incluant aujourd'hui ; graphique par jour ;
- `30 jours` : 30 jours calendaires incluant aujourd'hui ; graphique regroupé par blocs de 5 jours ;
- `12 semaines` : 84 jours calendaires incluant aujourd'hui ; graphique regroupé par blocs de 14 jours.

Les six cartes d'accueil sont calculées depuis les séances de la période sélectionnée :

1. nombre de séances ;
2. durée totale ;
3. évolution de la charge moyenne par série par rapport à la période précédente de même durée ;
4. calories estimées stockées dans les séances ;
5. volume total ;
6. nombre total d'exercices réalisés.

Pour `7 jours`, la première carte affiche également l'objectif `weekly_sessions_goal` du profil lorsqu'il existe.

Les comparaisons utilisent toujours la période immédiatement précédente de même durée. Si les données de charge sont insuffisantes, afficher un état neutre plutôt qu'inventer une progression.

La logique réelle du tableau de bord est dans `src/home-dashboard.js`. L'ancien jeu `chartData` fictif encore présent dans `src/app.js` est historique et ne doit plus être utilisé comme source de données ; le supprimer lors d'un prochain nettoyage ciblé de `app.js`.

## Agenda des séances

L'agenda du profil est une vue dérivée du store `sessions`. Ne pas créer une deuxième source de vérité pour le calendrier : les jours occupés doivent être calculés depuis `session.started_at`.

## Export / import

Les Réglages proposent une sauvegarde JSON locale :

```text
herakles-backup-YYYY-MM-DD.json
```

Elle contient actuellement : profil, historique du poids, séances et réglages persistants.

L'import actuel est un **merge par identifiant** : ajout des nouveaux éléments et remplacement des éléments portant le même identifiant. Ne pas supprimer implicitement les données locales absentes de la sauvegarde.

## Architecture actuelle

- `index.html` : coque et écrans principaux ;
- `src/styles.css` : styles globaux ;
- `src/session.css` : styles de séance ;
- `src/profile.css` : styles profil, poids et agenda ;
- `src/app.js` : navigation et logique principale ;
- `src/session-flow.js` : thème actif, reprise, fin de séance et récap global ;
- `src/profile.js` : profil local, historique du poids, agenda, export/import ;
- `src/home-dashboard.js` : statistiques réelles de l'accueil depuis IndexedDB ;
- `src/exercises.js` : catalogue et catégories ;
- `src/rest-timer.js` : récupération ;
- `src/notifications.js` : notifications ;
- `src/storage.js` : persistance IndexedDB ;
- `manifest.webmanifest` : installation PWA ;
- `sw.js` : cache/service worker ;
- `data/schema/` : schémas versionnés ;
- `docs/DATA_MODEL.md` : modèle de données détaillé.

Éviter framework ou chaîne de build tant qu'ils ne sont pas justifiés. Le site doit fonctionner directement depuis GitHub Pages.

## Données et confidentialité

Herakles est local-first :

1. les données utilisateur sont stockées sur l'appareil ;
2. la séance active doit être restaurable après rafraîchissement/fermeture ;
3. les séances terminées sont persistées dans IndexedDB ;
4. profil et historique du poids sont persistés dans IndexedDB ;
5. export/import JSON doit permettre une sauvegarde avant tout compte cloud ;
6. aucune donnée personnelle ou de santé réelle ne doit être commitée dans le dépôt public ;
7. les exemples du dépôt doivent être fictifs/anonymisés ;
8. tout format durable doit contenir un `schema_version` lorsqu'une migration future est plausible.

Le JSON est le format d'échange canonique. IndexedDB est le stockage applicatif local recommandé.

### IndexedDB actuel

Version applicative IndexedDB : `2`.

Stores :

```text
sessions
profile
settings
measurements
```

Ne pas confondre `DB_VERSION` d'IndexedDB avec `session.schema_version`.

`localStorage` est réservé aux états temporaires à restaurer rapidement : séance active, thème actif, chrono, etc.

## Modèle de données — principes

Une séance contient au minimum :

- identifiant unique ;
- thème/groupe actif lorsque pertinent ;
- début, fin et durée globale ;
- futur snapshot utilisateur ;
- liste ordonnée des exercices ;
- résumé recalculable ;
- notes facultatives.

Chaque exercice enregistré contient au minimum :

- identifiant/type/nom ;
- début, fin et durée ;
- données brutes propres au type ;
- résumé calculable.

Les valeurs comme `volume_kg`, `exercise_volume_kg` ou `session_volume_kg` peuvent être mises en cache, mais doivent rester recalculables depuis les données brutes.

### Versionnement actuel des séances

- `data/schema/session.schema.json` : format historique v1 ;
- `data/schema/session-v2.schema.json` : format multi-exercices actuel ;
- ne jamais réécrire silencieusement les anciennes séances v1.

### Calories estimées

Les calories sont une estimation, jamais une mesure.

Formule provisoire possible :

```text
kcal = MET × 3.5 × weight_kg / 200 × duration_minutes
```

Lorsque le profil contient un poids réel, utiliser à terme le poids figé dans le snapshot de séance plutôt qu'une référence générique.

### Charges machine

Ne pas mélanger :

- `plates_total_kg` ;
- `plates_per_side_kg` ;
- `machine_base_resistance_kg` ;
- `nominal_load_kg` ;
- `body_weight_kg`.

Le poids du corps reste séparé sauf modèle biomécanique explicitement défini.

## Types d'exercices

Prévoir au moins :

- `strength` : séries, répétitions, charge, repos ;
- `cardio` : chrono réel, distance, vitesse moyenne dérivée et métriques machine facultatives ;
- extensible plus tard sans casser les anciennes données.

## Compatibilité GitHub Pages / PWA

- utiliser des chemins relatifs compatibles avec `/Herakles/` ;
- ne pas supposer que l'application est servie à la racine ;
- la PWA doit rester utilisable hors ligne après une première visite ;
- toute nouvelle ressource nécessaire hors ligne doit être ajoutée au cache ;
- incrémenter le cache du service worker après modification de ressources applicatives mises en cache.

## Qualité

Pour chaque modification significative :

- garder l'interface mobile-first ;
- éviter les dépendances inutiles ;
- ne pas casser les anciennes données sans migration ;
- documenter toute évolution du schéma ;
- privilégier des unités explicites (`_kg`, `_cm`, `_seconds`, `_km`, `_m`).

## Style produit

Identité visuelle : **Herakles**, ambiance grecque sobre. La lisibilité pendant l'entraînement prime.

Consulter `STYLE.md` avant toute modification visuelle importante.
