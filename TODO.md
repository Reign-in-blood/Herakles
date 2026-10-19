# TODO Herakles

## Refonte du tunnel d'utilisation — conception à discuter avant développement

Retours des premiers utilisateurs et essais réels : le choix immédiat d'une catégorie avant la création de séance rend le parcours actuel trop contraignant. Le nouveau fonctionnement reste **à cadrer et à valider** avant toute modification du workflow ou du modèle de données.

- [ ] Repenser l'accueil avec deux entrées distinctes : **Programmer une séance** et **Séance libre**.
- [ ] Définir le parcours de programmation : date, heure, ajout d'exercices (par catégorie ou recherche), réglages préremplis, sauvegarde d'une séance non commencée, puis démarrage ultérieur.
- [x] **Décision UX : reprogrammer une séance existante ou créer une séance entièrement nouvelle.** « Programmer une séance » propose une liste des séances de l'utilisateur réutilisables et une action « Créer une nouvelle séance ». Le choix d'une séance existante crée une nouvelle occurrence datée avec les exercices et paramètres copiés, sans modifier la séance source. Choix validé en conception, non encore développé.
- [ ] **Favoris de séances historiques : ajouter un bouton cœur à chaque séance dans le calendrier**, y compris les séances déjà enregistrées ; permettre d'ajouter ou retirer un favori sans modifier ses performances, ses statistiques ou son historique, et indépendamment des autres séances de la même date. Proposition UX retenue, non encore implémentée.
- [ ] **Afficher « Mes séances favorites » dans « Programmer une séance »**, à côté de « Créer une nouvelle séance » ; sélectionner un favori copie les exercices et leurs paramètres vers une nouvelle séance datée, sans copier l'exécution passée (timestamps et résultats) ni altérer la source.
- [x] **Décision de données : enregistrer les favoris comme des copies indépendantes** des exercices et paramètres des séances historiques. La modification ou suppression ultérieure de la séance d'origine ne doit jamais altérer le favori ; chaque reprogrammation crée une nouvelle copie indépendante. Choix validé en conception, non encore développé.
- [ ] **Permettre de donner un nom personnalisé aux séances** (création, programmation et renommage), par exemple « Dos / Biceps », puis afficher ce nom dans la liste des séances, les favoris, l'agenda et les détails. Prévoir un affichage compatible avec les anciennes séances sans nom ; préciser le comportement de renommage des copies.
- [ ] Préciser l'organisation de la bibliothèque et l'ajout éventuel de modèles créés directement ; définir comment retirer un favori sans supprimer l'historique ni les séances programmées.
- [ ] Prévoir une persistance locale et un export/import des favoris respectant les historiques v1/v2 ; retirer un favori ne doit supprimer ni la séance d'origine, ni les copies déjà programmées.
- [ ] Prévoir l'enregistrement local de modèles réutilisables et de séances programmées distinctes, leur export/import, ainsi que la préservation des anciennes séances lors de la migration de données.
- [x] **Décision UX : l'ouverture d'une séance programmée présente d'abord la vue complète du programme**, avec les exercices et leurs paramètres ; seul le bouton explicite « Démarrer la séance » active la séance et son chronomètre. Choix validé en conception, non encore développé.
- [x] **Décision UX : ordre libre d'exécution des exercices programmés.** Après « Démarrer la séance », présenter la liste des exercices, laisser l'utilisateur choisir n'importe lequel, ouvrir sa fiche puis lancer cet exercice uniquement au clic sur « Commencer ». Après un exercice terminé, revenir à la liste. La sélection n'impose pas l'ordre initial du programme ; le chrono global et le chrono de l'exercice ont des démarrages distincts. Décision validée en conception, non encore développée.
- [x] **Décision UX : ajouter librement des exercices imprévus pendant une séance programmée déjà commencée.** Prévoir « Ajouter un exercice » dans la liste, sélectionner et configurer l'exercice, puis « Commencer » explicitement ; le chrono global continue. Choix validé en conception, non encore développé.
- [x] **Décision de persistance : les exercices imprévus ajoutés restent propres à la séance du jour.** Les conserver dans l'exécution et l'historique des exercices effectués, sans modifier le programme d'origine ou d'autres séances. Choix validé en conception, non encore développé.
- [x] **Décision UX : après validation et sauvegarde des résultats d'un exercice, revenir automatiquement à la liste des exercices de la séance**, sans imposer une nouvelle sélection de catégorie ; le chrono global continue. Choix validé en conception, non encore développé.
- [ ] **Envisager les statistiques de la séance en cours directement dans les cartes des exercices terminés** : séries effectuées, répétitions, charges/volume et durée, ou statistiques cardio selon le type ; afficher les objectifs prévus pour les exercices à faire. Définir les données essentielles et l'accès éventuel aux détails avant implémentation.
- [x] **Décision UX : cliquer sur un exercice déjà terminé ouvre ses résultats détaillés, jamais un redémarrage.** Autoriser la correction des séries, répétitions et charges enregistrées pendant la séance active ; après enregistrement des corrections, revenir à la liste sans créer une nouvelle exécution. Choix validé en conception, non encore développé.
- [ ] Implémenter les corrections d'exercice terminé avec mise à jour des agrégats et préservation des données de la séance ; préciser la correction des métriques cardio et l'état visuel des cartes « à faire » / « terminé ».
- [ ] Définir le parcours libre : choix du premier exercice et de ses réglages, démarrage explicite de la séance, ajout successif d'exercices, puis fin et enregistrement.
- [ ] Distinguer clairement séance programmée, séance en cours et séance terminée ; ne comptabiliser que les séances réalisées dans les statistiques.
- [ ] Préciser les règles de reprise, de modification, d'annulation et de déplacement des séances programmées, et celles de modification du programme pendant une séance active.
- [ ] **Ajouter une barre de recherche d'exercices par nom**, accessible dans le choix d'exercice.
- [ ] **Afficher les données de la dernière séance pour chaque exercice** : charge/poids, répétitions, nombre de séries et durée des pauses lorsque disponibles ; réutiliser ces valeurs comme suggestions ou valeurs initiales à définir.
- [ ] **Afficher un bandeau fixe en haut de la page pour le chrono global de la séance**, uniquement pendant une séance en cours, avec priorité d'affichage élevée (z-index) et respect de la zone sûre sur mobile.
- [ ] **Étudier un choix des exercices par muscle plus précis** (par exemple quadriceps, grand dorsal), avec des illustrations appropriées, en complément ou en alternative aux catégories actuelles.

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
