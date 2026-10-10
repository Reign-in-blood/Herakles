# Modèle de données Herakles

## Choix initial

Le JSON est retenu comme format d'échange et de sauvegarde. Dans l'application, les objets seront stockés localement dans IndexedDB.

Le JSON a plusieurs avantages ici :

- lisible à la main ;
- simple à exporter/importer ;
- versionnable ;
- facile à valider avec JSON Schema ;
- utilisable plus tard par une PWA, un APK Capacitor ou un autre client.

## Principe important

Les données brutes et les données calculées sont séparées.

Exemple : une série contient `reps` et `load_kg`. Le volume de cette série est calculable avec :

```text
volume_kg = reps × load_kg
```

Le total de séance peut être conservé comme cache pour l'affichage, mais l'application doit toujours pouvoir le recalculer à partir des séries.

## Structure générale

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

## Pourquoi un snapshot du poids et de la taille ?

Le profil utilisateur peut changer avec le temps. Une séance garde donc facultativement un instantané des mensurations au moment de la séance. Cela évite qu'une modification future du profil réécrive implicitement l'historique.

## Musculation

Chaque exercice de force possède des séries distinctes. Cela permet de représenter sans problème :

- 5 × 10 à charge constante ;
- une montée progressive de charge ;
- une série interrompue ;
- des répétitions différentes d'une série à l'autre ;
- des temps de repos réels différents.

### Charge

Le champ principal est `load_kg` : c'est la charge nominale choisie pour le calcul du volume.

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

## Identifiants

Utiliser des UUID générés côté client (`crypto.randomUUID()` quand disponible) pour les séances et exercices. Cela facilitera une éventuelle synchronisation future sans serveur central.

## Dates

Stocker les dates/heures en ISO 8601 avec fuseau, par exemple :

```text
2026-10-10T18:30:00+02:00
```

## Version du schéma

La première version est `1`. Toute modification incompatible devra augmenter `schema_version` et fournir une migration.

Le schéma de référence se trouve dans `data/schema/session.schema.json`.
