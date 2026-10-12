# TODO Herakles

## Priorité actuelle — terminer le flux de séance

- [ ] Finaliser le conteneur de **séance active** capable d'accumuler plusieurs exercices successifs.
- [ ] Vérifier que l'enregistrement d'un récapitulatif d'exercice ajoute uniquement cet exercice à la séance active et retourne au choix des exercices.
- [ ] Ajouter une action explicite **Terminer la séance**, distincte de **Terminer l'exercice**.
- [ ] Créer le récapitulatif global de séance : durée totale, nombre d'exercices, séries, répétitions, volume total et calories estimées.
- [ ] Enregistrer dans IndexedDB la séance complète avec tous ses exercices dans leur ordre réel.
- [ ] Garantir la restauration d'une séance active et de ses exercices déjà validés après rafraîchissement/fermeture accidentelle.
- [ ] Faire évoluer `data/schema/session.schema.json` pour stocker proprement la durée et le résumé de chaque exercice, avec migration si le changement devient incompatible avec le schéma v1.

## Données et statistiques

- [ ] Remplacer progressivement les statistiques fictives de l'accueil par les données réelles IndexedDB.
- [ ] Ajouter le poids utilisateur au profil afin d'améliorer l'estimation des calories et conserver un snapshot dans la séance.
- [ ] Prévoir export/import JSON des séances.

## Plus tard — compteur de pas Android

- [ ] Étudier la récupération des pas quotidiens du téléphone dans Herakles.
- [ ] Vérifier la source disponible sur l'appareil (Huawei Santé, Health Connect ou autre).
- [ ] Évaluer une intégration native avec Capacitor / APK : la PWA ne peut pas accéder directement aux données système de pas.
- [ ] Prévoir le stockage local des pas par jour, avec date, source et version de schéma.

Statut : le compteur de pas reste une idée secondaire ; la priorité est le cycle complet séance → exercices → fin de séance.
