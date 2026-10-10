# STYLE.md — Herakles

## Direction visuelle

Herakles doit évoquer la Grèce antique de manière sobre et fonctionnelle, sans devenir un thème décoratif envahissant.

- priorité absolue à la lisibilité pendant l'entraînement ;
- interface mobile-first, gros boutons et zones tactiles ;
- fond sombre par défaut, contrastes nets ;
- accents pierre, bronze ou ivoire possibles ;
- typographie simple et robuste ;
- motifs grecs uniquement en détail discret (bordure, séparateur, icône) ;
- aucune animation gênante pendant une série ou un chrono.

## Convention CSS

Le CSS doit rester simple à lire et à modifier directement.

- centraliser les valeurs globales dans `:root` ;
- utiliser des variables CSS avec `var(...)` au lieu de répéter les valeurs dans les composants ;
- le propriétaire du projet apprécie une convention courte de type `--color1`, `--color2`, etc. pour la palette principale ;
- documenter le rôle de chaque couleur directement dans `:root` avec un commentaire si le nom n'est pas sémantique ;
- centraliser également les valeurs répétées utiles : rayons, espacements, tailles de zones tactiles et éventuellement durées d'animation ;
- éviter les valeurs magiques dispersées dans les sélecteurs lorsque la valeur est réutilisée ;
- conserver du CSS natif sans préprocesseur tant qu'il n'apporte pas de bénéfice clair.

Exemple de structure préférée :

```css
:root {
  --color1: #12110f; /* fond principal */
  --color2: #1b1916; /* surface */
  --color3: #f4efe5; /* texte principal */
  --color4: #c2a46d; /* accent */
  --radius1: 18px;
  --tap-size: 44px;
}

.card {
  color: var(--color3);
  background: var(--color2);
  border-radius: var(--radius1);
}
```

La palette exacte peut évoluer avec les maquettes, mais la logique `:root` + `var(...)` doit rester la base du développement visuel.

## Écrans d'entraînement

Pendant une séance, afficher en priorité :

1. exercice en cours ;
2. série actuelle / nombre total prévu ;
3. charge ;
4. répétitions ;
5. chronomètre de repos ;
6. actions rapides pour valider, corriger ou passer une série.

Le chronomètre doit rester très visible et utilisable d'une seule main.
