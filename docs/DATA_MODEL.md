# Modèle de données Herakles

## Choix initial

Le JSON est retenu comme format d'échange et de sauvegarde. Dans l'application, les objets sont stockés localement dans IndexedDB une fois la séance terminée.

Le JSON est adapté à Herakles car il est :

- lisible à la main ;
- simple à exporter/importer ;
- versionnable ;
- facile à valider avec JSON Schema ;
- utilisable plus tard par une PWA, un APK Capacitor ou un autre client.

## Hiérarchie métier

La donnée principale est la **séance**. Une séance est composée d'un ou plusieurs **exercices** réalisés successivement. Chaque exercice contient ensuite ses données propres : séries pour la musculation, mesures de durée/distance pour le cardio, etc.

```text
séance
├── thème / groupe actif
├── informations globales
├── exercice 1
│   ├── données brutes
│   └── résumé calculable
├── exercice 2
│   ├── données brutes
│   └── résumé calculable
└── résumé global calculable
```

Le cycle applicatif associé est :

```text
commencer séance
→ choisir un thème / groupe
→ choisir un exercice dans ce thème
→ réaliser exercice
→ récapitulatif exercice
→ ajouter exercice à la séance active
→ retour à la liste des exercices du même thème
→ exercice suivant éventuel ou terminer séance
→ récapitulatif global
→ enregistrer séance complète
```

**Terminer un exercice ne termine jamais implicitement la séance.**

Le thème choisi reste le contexte de sélection jusqu'à la fin de la séance. Après l'enregistrement d'un exercice, l'interface revient directement à la liste des exercices de ce thème, sans repasser par le choix des groupes.

## Séance active et séance terminée

Pendant l'entraînement, la séance active doit pouvoir être restaurée après rafraîchissement ou fermeture accidentelle. Elle contient progressivement les exercices déjà validés et, si nécessaire, l'exercice actuellement en cours.

Le thème actif est conservé séparément pendant la séance afin de pouvoir restaurer directement la bonne liste d'exercices.

Une fois la séance explicitement terminée, l'objet complet est enregistré dans IndexedDB. L'enregistrement final doit conserver l'ordre des exercices.

## Refonte prévue — programme initial et exécution du jour (non implémentée)

Décision validée pour les futures séances programmées : pendant la séance en cours, l'utilisateur pourra ajouter des exercices non prévus. **Ces ajouts appartiennent exclusivement à l'exécution du jour** ; ils apparaissent dans la séance réalisée et dans son historique lorsqu'ils ont été effectivement effectués, mais **ne modifient pas le programme initial** et ne se propagent pas aux autres séances planifiées ou à un éventuel programme réutilisable.

La représentation exacte et la persistance des programmes programmés restent à définir avant modification du schéma ou de la base locale. Les séances enregistrées dans les formats existants restent inchangées.

## Refonte prévue — réutilisation des séances (décision validée, non implémentée)

La programmation offrira deux chemins : **choisir une séance de l'utilisateur pour la reprogrammer**, ou **créer une séance entièrement nouvelle**. La réutilisation doit produire une **nouvelle occurrence datée**, reprenant les exercices et leurs paramètres prévus comme point de départ. Modifier, réaliser ou compléter cette occurrence ne doit pas modifier la séance d'origine ni ses données historiques.

Pour la conception future, distinguer conceptuellement :
- **référence réutilisable** : composition et paramètres d'une séance que l'utilisateur souhaite pouvoir reproduire ;
- **séance programmée** : occurrence personnelle à une date et heure, avec sa propre copie des exercices prévus ;
- **séance effectuée** : données réelles (temps, séries, charges, cardio) de cette occurrence ou d'une séance libre, seules prises en compte dans les statistiques.

Piste de conception retenue : **les séances historiques pourront être marquées comme favorites, y compris rétroactivement depuis le calendrier**, chacune individuellement. Le parcours de programmation proposera la réutilisation de ces séances favorites ainsi que la création d'une nouvelle séance. Retirer un favori ne supprime jamais la séance source ou une occurrence déjà programmée. L'opération « Reprogrammer » doit produire une copie des exercices et des paramètres pertinents, pas une copie des mesures ou des timestamps réellement effectués.

Il reste à décider si un favori correspond à une référence vers une séance historique ou à un modèle autonome créé depuis elle, ainsi que le comportement quand l'historique source change ou est supprimé. Aucun nouveau store IndexedDB, schéma ou migration n'est encore validé ; préserver les données v1/v2 existantes et inclure les futurs objets pertinents dans l'export/import local.

## Principe important : données brutes d'abord

Les données brutes et les données calculées sont séparées.

Exemple : une série contient `reps` et `load_kg`. Le volume de cette série est calculable avec :

```text
volume_kg = reps × load_kg
```

Un résumé d'exercice ou de séance peut conserver des agrégats pour accélérer l'affichage, mais l'application doit toujours pouvoir les recalculer à partir des données brutes.

## Versionnement des séances

Le format historique v1 reste décrit par :

```text
data/schema/session.schema.json
```

Le nouveau flux multi-exercices utilise le format v2 décrit par :

```text
data/schema/session-v2.schema.json
```

Le format v2 ajoute notamment :

- un `theme_id` facultatif pour le groupe actif ;
- les dates de début et de fin propres à chaque exercice ;
- la durée propre à chaque exercice ;
- les résumés par exercice ;
- un résumé global de séance calculé depuis `exercises[]`.

Les séances v1 existantes ne doivent pas être réécrites silencieusement. Les futures lectures d'historique devront accepter les deux versions ou appliquer une migration explicite.

## Structure générale v2

```text
session
├── schema_version = 2
├── id
├── theme_id
├── started_at
├── ended_at
├── duration_seconds
├── exercises[]
│   ├── id / type / name
│   ├── started_at
│   ├── ended_at
│   ├── duration_seconds
│   ├── données brutes
│   └── données calculées mises en cache
└── summary
    ├── exercise_count
    ├── total_reps
    ├── volume_kg
    └── estimated_calories_kcal
```

## Durées

Il existe deux niveaux de durée :

- `session.duration_seconds` : durée globale depuis le démarrage jusqu'à la fin explicite de la séance ;
- `exercise.duration_seconds` : durée propre à un exercice, du démarrage de cet exercice jusqu'à son récapitulatif.

Les temps de récupération font partie du temps de l'exercice lorsqu'ils se situent entre ses séries. Le chrono global de séance continue également pendant ces récupérations et entre deux exercices.

## Pourquoi un snapshot du poids et de la taille ?

Le profil utilisateur peut changer avec le temps. Une séance pourra garder facultativement un instantané des mensurations au moment de la séance. Cela évite qu'une modification future du profil réécrive implicitement l'historique.

Le snapshot sera également utile pour recalculer ultérieurement des estimations dépendant du poids, notamment les calories.

## Musculation

Chaque exercice de force possède des séries distinctes. Cela permet de représenter sans problème :

- 5 × 10 à charge constante ;
- une montée progressive de charge ;
- une série interrompue ;
- des répétitions différentes d'une série à l'autre ;
- des temps de repos réels différents.

### Charge

Dans le modèle v2 courant, la charge réelle d'une série est conservée dans `nominal_load_kg`. Le volume est calculable avec :

```text
volume_kg = reps × nominal_load_kg
```

À terme, les détails facultatifs de machine pourront compléter cette charge sans modifier son sens :

- `plates_per_side_kg` ;
- `plates_total_kg` ;
- `machine_base_resistance_kg` ;
- `selected_stack_kg` ;
- `body_weight_kg` ;
- `assistance_kg`.

Le poids du corps reste séparé et n'est pas ajouté automatiquement à la charge nominale.

## Cardio

Les exercices cardio machine actuellement prévus sont :

- tapis de course ;
- rameur ;
- vélo ;
- vélo elliptique.

Un cardio machine ne demande pas de configuration avant le départ. Sa sélection ouvre directement l'écran de l'exercice avec un chrono à `00:00:00`. L'occurrence et son `started_at` ne sont créés qu'au clic sur **Démarrer l'exercice**. L'action **Terminer l'exercice** fige `ended_at`, donc la durée réelle reste exacte même après un rechargement de page.

Après l'arrêt, l'utilisateur renseigne la distance parcourue. La vitesse moyenne est une valeur dérivée :

```text
average_speed_kmh = distance_km / (duration_seconds / 3600)
```

Le tapis de course peut également conserver une inclinaison moyenne facultative. Les autres mesures propres aux machines (résistance, watts, cadence, dénivelé, allure, etc.) pourront être ajoutées plus tard si elles deviennent utiles.

Dans une occurrence cardio v2, les mesures validées sont conservées dans :

```text
cardio
├── distance_km
├── average_speed_kmh
└── incline_percent = nombre | null
```

`distance_km` est la donnée brute saisie après l'effort. `duration_seconds` est dérivée des timestamps de l'exercice. `average_speed_kmh` peut être mise en cache pour l'affichage mais doit rester recalculable depuis la distance et la durée. `incline_percent` vaut `null` lorsqu'elle n'est pas renseignée ou n'est pas applicable.

Un exercice cardio n'utilise pas de séries de répétitions. Son état temporaire doit permettre de restaurer deux situations distinctes après rafraîchissement : cardio encore en cours, ou cardio déjà arrêté mais mesures finales pas encore validées.

## Repos

Pour chaque série de musculation, le temps réellement pris est conservé séparément du temps prévu.

Le chronomètre doit rester piloté par un timestamp de fin afin de continuer à être correct après verrouillage de l'écran, changement d'onglet ou rafraîchissement.

## Calories estimées

Les calories ne sont pas une mesure directe. Elles doivent rester identifiées comme une estimation.

Une approximation simple peut utiliser les MET :

```text
kcal = MET × 3.5 × weight_kg / 200 × duration_minutes
```

Si cette valeur est stockée, conserver autant que possible la méthode de calcul, le MET utilisé et le poids de référence afin de pouvoir la recalculer plus tard. Le poids du futur snapshot utilisateur doit être préféré à une valeur générique dès qu'il est disponible.

## Agrégats de séance

Le résumé global doit pouvoir être recalculé à partir de `exercises[]`. Les agrégats utiles incluent notamment :

- `exercise_count` ;
- total des répétitions ;
- volume total en kg ;
- durée globale de séance ;
- calories estimées totales si elles sont calculées par exercice.

Éviter de dupliquer des valeurs impossibles à vérifier depuis les données sources.

## Identifiants

Utiliser des UUID générés côté client (`crypto.randomUUID()` quand disponible) pour les séances et les occurrences d'exercices lorsque des identifiants uniques sont nécessaires. Cela facilitera une éventuelle synchronisation future sans serveur central.

Ne pas confondre l'identifiant du type d'exercice du catalogue avec l'identifiant d'une occurrence réalisée pendant une séance.

## Dates

Stocker les dates/heures en ISO 8601 avec fuseau, par exemple :

```text
2026-10-10T18:30:00+02:00
```

## Profil local

Le profil n'est pas un compte distant. Il représente les préférences et caractéristiques de l'utilisateur sur l'appareil.

Le store IndexedDB `profile` contient actuellement un enregistrement unique :

```text
id = "local-user"
schema_version = 1
sex = "male" | "female"
height_cm
weekly_sessions_goal = 1..7
goal
    weight_loss
    weight_gain
    fitness
    muscle_gain
    strength
    endurance
target_weight_kg = nombre | null
updated_at
```

`target_weight_kg` n'est pertinent que pour `weight_loss` et `weight_gain`.

Le profil peut évoluer, mais une séance historique ne doit pas dépendre des valeurs actuelles du profil pour ses calculs historiques. La prochaine étape est donc d'ajouter un `user_snapshot` aux nouvelles séances.

## Historique du poids

Le poids est historisé séparément du profil dans le store IndexedDB `measurements` afin de ne pas écraser les valeurs précédentes.

Format actuel :

```text
measurement
├── id               ex. weight-2026-10-13
├── schema_version = 1
├── measured_at
└── weight_kg
```

Une mesure enregistrée le même jour remplace la mesure de ce jour. Cela permet une saisie simple : au maximum un point de poids par journée dans le graphique actuel.

Le graphique relie les mesures dans l'ordre chronologique. Pour un objectif `weight_loss`, l'objectif est atteint lorsque le dernier poids est inférieur ou égal à `target_weight_kg`. Pour `weight_gain`, l'objectif est atteint lorsque le dernier poids est supérieur ou égal à la cible. La ligne d'objectif passe alors de l'état erreur à l'état succès.

## IndexedDB — version applicative

La version IndexedDB est actuellement `2`. Elle est indépendante de `session.schema_version`.

Stores persistants actuels :

```text
sessions
profile
settings
measurements
```

`localStorage` reste réservé aux états temporaires nécessitant une restauration rapide, notamment la séance active et le chronomètre de récupération.

## Export / import JSON

Les Réglages permettent d'exporter une sauvegarde locale complète :

```text
herakles-backup-YYYY-MM-DD.json
```

Structure actuelle :

```text
backup
├── schema_version = 1
├── app = "Herakles"
├── exported_at
├── profile
├── measurements[]
├── sessions[]
└── settings[]
```

L'import est une **restauration complète de snapshot**, pas un merge. Après validation du fichier, les stores persistants `profile`, `measurements`, `sessions` et `settings` sont remplacés dans une seule transaction IndexedDB par le contenu exact de la sauvegarde. Les éléments locaux absents du backup sont donc supprimés.

La restauration est atomique : si la transaction échoue, elle ne doit pas laisser une base partiellement restaurée. Après succès, les états temporaires de séance (`activeSession`, thème actif, chrono de repos et brouillon d'exercice) sont effacés afin qu'une ancienne séance locale ne se mélange pas aux données restaurées.

Un éventuel futur import partiel ou fusion de données devra être une fonctionnalité distincte et explicitement nommée ; il ne doit jamais être appliqué silencieusement lors d'une restauration de backup.

Le format d'export doit rester versionné pour permettre une migration future avant toute synchronisation cloud.

## Agenda

L'agenda du profil n'est pas une nouvelle source de données : il lit directement les séances du store `sessions` et les positionne selon `started_at`. Les détails affichés doivent donc toujours être dérivables des séances enregistrées.

Depuis le calendrier, la modification d'une séance conserve son `id` et utilise `saveSession` dans le store IndexedDB existant. Les horaires de début et de fin sont éditables et `duration_seconds` est dérivé de leur différence ; les dates des exercices et des séries sont décalées si le début change. Les valeurs de séries et les mesures cardio v2 peuvent être rectifiées et les agrégats sont recalculés. La suppression est une opération distincte, confirmée, ciblée par `id` : même si plusieurs séances existent sur une date, une seule est supprimée. Calendrier et statistiques sont réactualisés après l'opération.

## Version du schéma

- v1 : format historique initial des séances ;
- v2 : format actuel multi-exercices avec récapitulatif de séance et mesures cardio machine optionnelles ;
- profil v1 : profil local actuel ;
- mesure v1 : historique du poids actuel ;
- backup v1 : export/import local actuel.

Toute future modification incompatible doit augmenter le `schema_version` concerné et prévoir une migration explicite.
