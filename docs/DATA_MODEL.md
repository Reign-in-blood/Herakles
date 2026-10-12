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
→ réaliser exercice
→ récapitulatif exercice
→ ajouter exercice à la séance active
→ exercice suivant éventuel
→ terminer séance
→ récapitulatif global
→ enregistrer séance complète
```

**Terminer un exercice ne termine jamais implicitement la séance.**

## Séance active et séance terminée

Pendant l'entraînement, la séance active doit pouvoir être restaurée après rafraîchissement ou fermeture accidentelle. Elle contient progressivement les exercices déjà validés et, si nécessaire, l'exercice actuellement en cours.

Une fois la séance explicitement terminée, l'objet complet est enregistré dans IndexedDB. L'enregistrement final doit conserver l'ordre des exercices.

## Principe important : données brutes d'abord

Les données brutes et les données calculées sont séparées.

Exemple : une série contient `reps` et `load_kg`. Le volume de cette série est calculable avec :

```text
volume_kg = reps × load_kg
```

Un résumé d'exercice ou de séance peut conserver des agrégats pour accélérer l'affichage, mais l'application doit toujours pouvoir les recalculer à partir des données brutes.

## Structure générale actuelle

Le schéma JSON v1 actuel représente la séance ainsi :

```text
session
├── schema_version
├── id
├── started_at
├── ended_at
├── duration_seconds
├── user_snapshot
│   ├── weight_kg
│   └── height_cm
├── exercises[]
│   ├── strength
│   │   ├── equipment
│   │   └── sets[]
│   └── cardio
│       ├── equipment
│       ├── duration_seconds
│       ├── distance_km
│       └── elevation_gain_m
├── summary
└── notes
```

## Évolution nécessaire pour les exercices successifs

Le flux validé impose de distinguer la durée globale de séance de la durée de chaque exercice. Lors de la prochaine évolution compatible du modèle, chaque exercice devra pouvoir conserver au minimum :

- `started_at` ;
- `ended_at` ;
- `duration_seconds` ;
- un résumé propre à l'exercice lorsque pertinent.

Pour la musculation, le résumé d'exercice doit pouvoir fournir au minimum :

- nombre total de séries réalisées ;
- nombre total de répétitions ;
- volume total en kg ;
- calories estimées si cette fonctionnalité est activée.

Ces champs ne doivent pas être ajoutés silencieusement au schéma v1 actuel : toute modification incompatible du JSON Schema doit être versionnée et accompagnée d'une migration.

## Durées

Il existe deux niveaux de durée :

- `session.duration_seconds` : durée globale depuis le démarrage jusqu'à la fin explicite de la séance ;
- `exercise.duration_seconds` : durée propre à un exercice, du démarrage de cet exercice jusqu'à son récapitulatif.

Les temps de récupération font partie du temps de l'exercice lorsqu'ils se situent entre ses séries. Le chrono global de séance continue également pendant ces récupérations et entre deux exercices.

## Pourquoi un snapshot du poids et de la taille ?

Le profil utilisateur peut changer avec le temps. Une séance garde donc facultativement un instantané des mensurations au moment de la séance. Cela évite qu'une modification future du profil réécrive implicitement l'historique.

Le snapshot est également utile pour recalculer ultérieurement des estimations dépendant du poids, notamment les calories.

## Musculation

Chaque exercice de force possède des séries distinctes. Cela permet de représenter sans problème :

- 5 × 10 à charge constante ;
- une montée progressive de charge ;
- une série interrompue ;
- des répétitions différentes d'une série à l'autre ;
- des temps de repos réels différents.

### Charge

Le champ canonique du schéma est `load_kg` : c'est la charge nominale choisie pour calculer le volume.

Les détails facultatifs permettent d'expliquer comment cette charge a été obtenue :

- `plates_per_side_kg` ;
- `plates_total_kg` ;
- `machine_base_resistance_kg` ;
- `selected_stack_kg` ;
- `body_weight_kg` ;
- `assistance_kg`.

Le poids du corps reste séparé et n'est pas ajouté automatiquement à `load_kg`.

## Cardio

Un exercice cardio n'utilise pas de séries de répétitions. Il stocke les mesures utiles de la machine :

- durée ;
- distance ;
- dénivelé ;
- vitesse moyenne ;
- allure moyenne ;
- inclinaison moyenne/maximale si connue.

## Repos

Pour chaque série :

- `rest_target_seconds` = repos prévu ;
- `rest_actual_seconds` = repos réellement pris.

Le chronomètre doit être piloté par un timestamp de fin afin de continuer à être correct après verrouillage de l'écran, changement d'onglet ou rafraîchissement.

## Calories estimées

Les calories ne sont pas une mesure directe. Elles doivent rester identifiées comme une estimation.

Une approximation simple peut utiliser les MET :

```text
kcal = MET × 3.5 × weight_kg / 200 × duration_minutes
```

Si cette valeur est stockée, conserver autant que possible la méthode de calcul, le MET utilisé et le poids de référence afin de pouvoir la recalculer plus tard. Le poids du `user_snapshot` doit être préféré à une valeur générique dès qu'il est disponible.

## Agrégats de séance

Le résumé global doit pouvoir être recalculé à partir de `exercises[]`. Les agrégats utiles incluent notamment :

- `exercise_count` ;
- total des séries de musculation ;
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

## Version du schéma

La première version est `1`. Toute modification incompatible doit augmenter `schema_version` et fournir une migration.

Le schéma de référence se trouve dans `data/schema/session.schema.json`.
