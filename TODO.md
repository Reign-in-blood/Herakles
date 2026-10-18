# TODO Herakles

## Flux de séance — à fiabiliser

- [x] Séance active multi-exercices avec retour au thème choisi.
- [x] Action explicite **Terminer la séance** et récapitulatif global.
- [x] Enregistrement de la séance complète dans IndexedDB.
- [x] Restauration de la séance active après rafraîchissement/fermeture dans les principaux états.
- [x] Abandon/correction de l'exercice courant et récapitulatif des exercices déjà réalisés.
- [x] Signaler clairement une séance active sur l'accueil avec **Reprendre la séance** jusqu'à sa clôture et son enregistrement final.
- [ ] Continuer les tests réels de reprise : série en cours, récupération, récap exercice et sélection entre deux exercices.
- [ ] Ajouter une correction d'un exercice déjà enregistré dans la séance si le besoin se confirme.

## Cardio machines

- [x] Ouvrir directement l'écran de l'exercice cardio après sa sélection, sans formulaire ni page intermédiaire.
- [x] Afficher le chrono à `00:00:00` et **Démarrer l'exercice** sur ce même écran ; créer `started_at` uniquement au clic.
- [x] Chronométrer ensuite l'exercice depuis son timestamp `started_at` et conserver la reprise après rechargement.
- [x] Figer la durée lors de **Terminer l'exercice** puis demander la distance parcourue.
- [x] Calculer automatiquement la vitesse moyenne depuis la distance et la durée réelles.
- [x] Permettre une inclinaison moyenne facultative pour le tapis de course.
- [x] Ajouter le rameur, le vélo et le vélo elliptique au catalogue cardio.
- [ ] Tester sur téléphone la reprise d'un cardio en cours, la reprise après arrêt avant saisie des mesures et l'enregistrement final dans une séance multi-exercices.
- [ ] Affiner plus tard les métriques propres à chaque machine si utile : résistance, watts, cadence, dénivelé ou allure.

## Profil et données locales

- [x] Profil local : homme/femme, taille, objectif de séances sur 7 jours et objectif principal.
- [x] Historique du poids daté dans IndexedDB.
- [x] Graphique de poids avec objectif de poids pour perte/prise et état atteint en vert.
- [x] Agenda mensuel alimenté par les séances enregistrées.
- [x] Ajouter sous chaque séance du calendrier un bouton Modifier et un bouton Supprimer rouge avec confirmation.
- [x] Permettre la modification des horaires, des répétitions/charges et du cardio v2, avec recalcul des totaux et actualisation de l'accueil.
- [ ] Tester sur Android la modification d'une séance historique et la suppression d'une séance parmi plusieurs le même jour.
- [x] Export/import JSON depuis les Réglages.
- [x] Restaurer un backup comme un snapshot complet : remplacement atomique du profil, du poids, des séances et des réglages au lieu d'un merge silencieux.
- [ ] Tester sur Android le cycle complet : export → réinstallation/stockage vide → import → vérification du profil, du poids, des séances et des réglages.
- [ ] Ajouter un `user_snapshot` (poids/taille) aux nouvelles séances au moment de leur démarrage.
- [ ] Utiliser le poids réel du profil/snapshot dans l'estimation des calories au lieu de la référence provisoire.
- [ ] Décider si d'autres mesures sont utiles : tour de taille, masse grasse, etc., sans surcharger le profil.

## Historique et statistiques

- [x] Remplacer les statistiques fictives de l'accueil par les séances réellement enregistrées dans IndexedDB.
- [x] Alimenter les périodes **7 jours / 30 jours / 12 semaines** avec les données réelles.
- [x] Utiliser l'objectif de séances / 7 jours du profil dans le tableau de bord.
- [x] Calculer les six cartes d'accueil depuis les données enregistrées : séances, durée, évolution de charge moyenne, calories estimées, volume et exercices.
- [ ] Créer l'écran **Entraînements** avec la liste et le détail des séances enregistrées.
- [ ] Affiner si nécessaire la métrique de progression des charges après davantage de données réelles.

## Plus tard — synchronisation / compte facultatif

- [ ] Évaluer une sauvegarde cloud facultative après stabilisation du modèle local.
- [ ] Garder Herakles utilisable intégralement sans compte et hors ligne.

## Plus tard — compteur de pas Android

- [ ] Étudier la récupération des pas quotidiens du téléphone dans Herakles.
- [ ] Vérifier la source disponible sur l'appareil (Huawei Santé, Health Connect ou autre).
- [ ] Évaluer une intégration native avec Capacitor / APK : la PWA ne peut pas accéder directement aux données système de pas.
- [ ] Prévoir le stockage local des pas par jour, avec date, source et version de schéma.

Statut : la priorité actuelle est la fiabilité des données locales, du profil et de la reprise de séance avant d'ajouter un compte cloud.
