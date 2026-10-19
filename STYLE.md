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
- palette minérale : charbon, anthracite, pierre, ivoire et bronze discret ;
- surfaces sombres légèrement différenciées plutôt que de nombreuses couleurs ;
- cadres, séparateurs et détails géométriques pouvant rappeler l'architecture ou les frises grecques ;
- éléments antiques utilisés comme accents, jamais comme bruit visuel ;
- gros boutons et zones tactiles ;
- hiérarchie très claire entre exercice, charge, répétitions et chronomètre ;
- aucune animation gênante pendant une série ou un chrono ;
- éviter l'esthétique « application fitness néon » au profit d'un rendu minéral, sobre et intemporel.

## Palette officielle

Cette palette est la référence du projet. Ne pas remplacer ces couleurs par des variantes approximatives sans décision explicite.

| Variable | Rôle | Couleur | Hex |
| --- | --- | --- | --- |
| `--color1` | Fond général | Noir charbon | `#0B0D0D` |
| `--color2` | Fond secondaire | Anthracite | `#111414` |
| `--color3` | Cartes | Charbon clair | `#171A19` |
| `--color4` | Cartes surélevées | Gris pierre sombre | `#1D201F` |
| `--color5` | Bordures | Gris graphite | `#343735` |
| `--color6` | Bordures discrètes | Gris profond | `#292C2B` |
| `--color7` | Texte principal | Ivoire clair | `#F3EFE5` |
| `--color8` | Texte secondaire | Gris chaud | `#B9B6AD` |
| `--color9` | Texte atténué | Gris pierre | `#858780` |
| `--color10` | Accent principal | Pierre / ivoire | `#DDD2BC` |
| `--color11` | Accent clair | Pierre claire | `#EAE0CD` |
| `--color12` | Accent sombre | Bronze pierre | `#A38A68` |
| `--color13` | Bronze discret | Bronze antique | `#806A4D` |
| `--color14` | Succès | Vert doux | `#78A875` |
| `--color15` | Succès background | Vert très sombre | `#162319` |
| `--color16` | Erreur | Rouge doux | `#C96C67` |
| `--color17` | Erreur background | Rouge très sombre | `#291716` |
| `--color18` | Attention | Ambre pierre | `#C9A76B` |
| `--color19` | Information | Bleu gris | `#7D9AA0` |

## Convention CSS

Le CSS doit rester simple à lire et à modifier directement, sans couche d'abstraction inutile.

### Variables `:root`

Centraliser les valeurs globales dans `:root` et utiliser `var(...)` dans les composants.

```css
:root {
  color-scheme: dark;

  --color1: #0B0D0D; /* fond général */
  --color2: #111414; /* fond secondaire */
  --color3: #171A19; /* cartes */
  --color4: #1D201F; /* cartes surélevées */
  --color5: #343735; /* bordures */
  --color6: #292C2B; /* bordures discrètes */
  --color7: #F3EFE5; /* texte principal */
  --color8: #B9B6AD; /* texte secondaire */
  --color9: #858780; /* texte atténué */
  --color10: #DDD2BC; /* accent principal */
  --color11: #EAE0CD; /* accent clair */
  --color12: #A38A68; /* accent sombre */
  --color13: #806A4D; /* bronze discret */

  --color14: #78A875; /* succès */
  --color15: #162319; /* succès background */
  --color16: #C96C67; /* erreur */
  --color17: #291716; /* erreur background */
  --color18: #C9A76B; /* attention */
  --color19: #7D9AA0; /* information */

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
  color: var(--color7);
  background: var(--color3);
  border: 1px solid var(--color5);
  border-radius: var(--radius1);
}
```

## Usage des états

- succès : `--color14` sur `--color15` ;
- erreur : `--color16` sur `--color17` ;
- attention : `--color18` ;
- information : `--color19` ;
- ne pas utiliser les couleurs d'état comme décoration générale.

## Illustrations des exercices

Les images des exercices peuvent être définies avec une propriété facultative `image` dans le catalogue `EXERCISES`. Dans la liste des exercices, elles remplacent le symbole provisoire uniquement pour les entrées qui en possèdent une ; sinon, le symbole reste visible. Le cadre conserve son format rectangulaire actuel : l’image occupe la surface via `object-fit: cover`, reste alignée en haut via `object-position: center top` et son débordement est masqué. Ces images doivent être incluses dans le cache de la PWA pour le hors-ligne.

## Écrans d'entraînement

Pendant une séance, afficher en priorité :

1. exercice en cours ;
2. série actuelle / nombre total prévu ;
3. charge ;
4. répétitions ;
5. chronomètre de repos ;
6. actions rapides pour valider, corriger ou passer une série.

Le chronomètre doit rester très visible et utilisable d'une seule main. Les informations essentielles doivent être compréhensibles d'un coup d'œil, y compris dans une salle sombre ou entre deux séries.
