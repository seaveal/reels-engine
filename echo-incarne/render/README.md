# Rendu carrousel headless — « L'Écho Incarné »

Génère les PNG de carrousel **sans Remotion**. Même look que la direction 1a, produit
en HTML + capture headless (le principe déjà utilisé par `reels-engine`).

## Fichiers

- `carousel-render.html` — page de rendu. Affiche **une** slide à sa vraie taille **1080×1440**.
  Expose `window.renderSlide(data)` (appelée entre deux captures) et gère `[[pivot]]`,
  la pastille photo et le motif d'écho. Ouvrable à la main pour prévisualiser.
- `export-carousel.mjs` — script Node/Playwright : lit un spec, rend chaque slide, capture en PNG.
- `sample-spec.json` — exemple (carrousel W28-07, 10 slides) pour tester tout de suite.

## Installation

```bash
npm i -D playwright
npx playwright install chromium
```

La photo est lue en relatif : `../uploads/cyrille-novou-new-ok.jpg` (racine du projet).
Pour une autre photo, ajoute `"photo": "chemin/relatif.jpg"` au spec.

## Utilisation

```bash
node render/export-carousel.mjs render/sample-spec.json
# -> out/<slug>/slide-01.png … slide-10.png   (1080×1440, sRGB)

node render/export-carousel.mjs chemin/vers/mon-spec.json out/mon-dossier
```

## Format du spec (celui du vault)

C'est le bloc JSON déjà présent dans tes notes de contenu carrousel
(`10-PRO/.../06_CONTENUS/idee-carrousel-*.md`) et dans `carrousels-specs/*.json` :

```json
{
  "slug": "idee-carrousel-...",
  "pilier": "mecanisme",              // optionnel — libellé de couverture (voir PILIER_LABELS)
  "handle": "@souverainauquotidien",  // optionnel
  "photo": "chemin.jpg",              // optionnel
  "legend": "La suite dans la légende",// optionnel — sinon varié automatiquement
  "slides": ["texte avec [[pivot]]", "…"]
}
```

Mapping automatique : **slide 0 → Couverture**, **dernière → Renvoi légende**, **le reste → Contenu**.
Sur les slides de contenu/fin, la 1ʳᵉ phrase devient le hook serif, le reste le souffle (italique).
Le mot marqué `[[…]]` devient l'unique présence **terracotta italique**.

## Boucler sur tout un dossier

```bash
for f in carrousels-specs/*.json; do node render/export-carousel.mjs "$f"; done
```

## Zoner pour Instagram (rappel)

1080×1440 = **3:4**, publié plein en feed. En **grille de profil**, ~135 px haut/bas sont rognés :
la pastille (haut) et le renvoi légende (bas) restent visibles dans le feed mais rognés en aperçu grille.
Pour revenir en 4:5 : mets `#stage{height:1350px}` dans `carousel-render.html` **et** le viewport
`height: 1350` dans `export-carousel.mjs`.
