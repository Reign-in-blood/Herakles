# STYLE.md — Herakles

## Références visuelles

Les maquettes et explorations placées dans `assets/models/` constituent la référence visuelle du projet.

- les consulter avant toute évolution importante de l'interface ;
- conserver l'esprit général : application de sport sombre, sobre, massive et lisible, avec une identité grecque/antique ;
- ne pas transformer les références en décor chargé : l'usage pendant une séance reste prioritaire ;
- les fichiers de `assets/models/` servent de référence de conception et ne doivent pas être utilisés automatiquement comme assets de production ;
- lorsqu'une nouvelle maquette validée est ajoutée, faire évoluer ce fichier si elle introduit une nouvelle règle durable.

## Direction visuelle

Herakles doit évoquer la Grèce antique de manière sobre et fonctionnelle.

- interface **mobile-first** ;
- fond sombre par défaut et contrastes nets ;
- accents bronze, pierre, ivoire et métal vieilli ;
- surfaces sombres légèrement différenciées plutôt que de nombreuses couleurs ;
- cadres, séparateurs et détails géométriques pouvant rappeler l'architecture ou les frises grecques ;
- éléments antiques utilisés comme accents, jamais comme bruit visuel ;
- gros boutons et zones tactiles ;
- hiérarchie très claire entre exercice, charge, répétitions et chronomètre ;
- aucune animation gênante pendant une série ou un chrono ;
- éviter l'esthétique « application fitness néon » au profit d'un rendu plus minéral, bronze et intemporel.

## Convention CSS

Le CSS doit rester simple à lire et à modifier directement, sans couche d'abstraction inutile.

### Variables `:root`

Centraliser les valeurs globales dans `:root` et utiliser `var(...)` dans les composants.

Le projet privilégie volontairement une convention courte pour la palette :

```css
:root {
  --color1: #12110f; /* fond principal */
  --color2: #1b1916; /* surface */
  --color3: #24211d; /* surface renforcée */
  --color4: #f4efe5; /* texte principal / ivoire */
  --color5: #aaa193; /* texte secondaire */
  --color6: #3a342d; /* bordures / séparateurs */
  --color7: #c2a46d; /* bronze principal */
  --color8: #e1c58c; /* bronze clair / accent fort */

  --radius1: 18px;
  --radius2: 999px;
  --tap-size: 44px;
}
```

Règles :

- préférer `--color1`, `--color2`, etc. pour la palette principale ;
- commenter le rôle de chaque variable dans `:root` ;
- ne pas recopier les codes hexadécimaux dans les composants ;
- centraliser aussi les valeurs répétées utiles : rayons, espacements, largeur de contenu, taille tactile et durées d'animation ;
- éviter les valeurs magiques dispersées lorsqu'une valeur est réutilisée ;
- garder du CSS natif sans préprocesseur tant qu'un besoin concret ne justifie pas autre chose.

Exemple :

```css
.card {
  color: var(--color4);
  background: var(--color2);
  border: 1px solid var(--color6);
  border-radius: var(--radius1);
}
```

La palette pourra être ajustée à mesure que les maquettes de `assets/models/` sont affinées, mais la logique `:root` + `var(...)` reste la base du développement visuel.

## Écrans d'entraînement

Pendant une séance, afficher en priorité :

1. exercice en cours ;
2. série actuelle / nombre total prévu ;
3. charge ;
4. répétitions ;
5. chronomètre de repos ;
6. actions rapides pour valider, corriger ou passer une série.

Le chronomètre doit rester très visible et utilisable d'une seule main. Les informations essentielles doivent être compréhensibles d'un coup d'œil, y compris dans une salle sombre ou entre deux séries.
