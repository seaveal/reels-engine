# reels-engine

Moteur Remotion de production des Reels typographiques pour `@lecorpsnetrichejamais` (PHM).
Transforme un JSON spec (rédigé par l'agent rédacteur ou à la main) en MP4 vertical muet 1080×1920 30 fps.

License : Remotion Free (Cyrille seul salarié de SAZILÉ).

## Quickstart

```bash
node render.js examples/quand-il-est-seul.json
# → out/quand-il-est-seul.mp4
```

```bash
# CLI options
node render.js examples/votre-vie-amoureuse.json --out=/tmp/preview.mp4 --concurrency=4
```

Mode dev / preview interactive :

```bash
npm run studio
```

## Contrat JSON

Validé par AJV au démarrage de `render.js`. Schema canonique : `reel.schema.json`.

Champs racine :

| champ         | type      | requis | défaut | rôle |
|---------------|-----------|--------|--------|------|
| `slug`        | string    | oui    |        | nom de fichier de sortie (kebab-case sans accents) |
| `reveal`      | enum      | oui    |        | `all_at_once` ou `staggered` |
| `hand_emoji`  | bool      |        | false  | affiche 👆 en fin sous le CTA |
| `duration_s`  | number\|null |     | null   | null = auto (calculé selon mode + nb segments) |
| `segments`    | array     | oui    |        | 1-8 segments (typique 4-6) |

Segments :

- `{ "role": "title", "text": "..." }` — hook, CAPITALES.
- `{ "role": "block", "text": "..." }` — ligne simple.
- `{ "role": "block", "heading": "...", "body": "..." }` — heading + body.
- `{ "role": "cta", "text": "..." }` — appel à action.
- Champ optionnel `bold` (bool) par segment pour override (défauts : title/heading bold, body/cta/block.text régulier).

Surlignage : `[[mot]]` → rendu jaune `#FFFF00`.

Voir `examples/votre-vie-amoureuse.json` (`all_at_once`, dense) et `examples/quand-il-est-seul.json` (`staggered`, court avec emoji main).

## Architecture

```
src/
  index.jsx        registerRoot
  Root.jsx         Composition Remotion (1080x1920 30fps), calculateMetadata
  Reel.jsx         Composition principale (background + textstack + emoji)
  Background.jsx   OffthreadVideo bouclé (noir-nuages.mp4)
  TextStack.jsx    Pile centrée H+V, auto-fit, fade staggered/all_at_once
  SegmentLine.jsx  Une ligne avec parsing [[ ]] → jaune
  HandEmoji.jsx    👆 dans la bande réservée bas de safe zone
  autoFit.js       Binary search synchrone (measureText + wrap manuel)
  segments.js      Normalisation JSON → {lines[]}
  highlight.js     Parsing/strip [[ ]]
  constants.js     SAFE zone, FPS, FADE, GAP, BACKGROUND_DURATION
public/
  backgrounds/
    noir-nuages.mp4   29s, bouclé. Handle @lecorpsnetrichejamais déjà incrusté.
                       PLACEHOLDER ACTUEL (généré ffmpeg) — à remplacer par le vrai fond Cyrille.
references/
  (vide pour l'instant — à peupler avec les 2 réels de référence pour calibration QA finale)
examples/
  votre-vie-amoureuse.json   mode all_at_once (dense, 5 segments)
  quand-il-est-seul.json     mode staggered (court, 4 segments, hand_emoji)
out/
  <slug>.mp4
reel.schema.json
render.js          CLI (validation AJV + bundle + render Remotion)
remotion.config.js
```

## Spec visuelle verrouillée (cf. mission origine)

- Format : 1080×1920, 30 fps, **muet** (track audio absent).
- Couleurs : accent `#FFFF00`, base `#FFFFFF`, fond `noir-nuages.mp4`.
- Typo : Oswald (Google Fonts via `@remotion/google-fonts`), CAPITALES titres/headings/cta, centré.
- Safe zone : marges H 10 % (largeur 80 %), top 12 %, bottom 22 %. Aucun glyphe hors zone.
- Auto-fit synchrone : `@remotion/layout-utils` `measureText` + wrap manuel + binary search sur fontSize (bornes 16-220 px).
- Auto-fit calculé sur la composition **complète** (le fontSize ne change jamais pendant le réel, même en staggered — seul le sous-ensemble visible bouge, re-centrage vertical via `justifyContent: center`).

## Animation

- `all_at_once` : fade-in global (0.4 s) à t=0.3 s, puis statique jusqu'à fin (~2.5 s de queue).
- `staggered` : segments un par un, gap 0.9 s, fade 0.4 s par segment. La pile se re-centre verticalement à chaque ajout (display: none sur les segments invisibles → ils ne prennent pas de place).
- Emoji 👆 (si `hand_emoji: true`) : fade-in 0.4 s à dernier-segment + 0.4 s. Positionné dans une bande verticale réservée (16 % de la safe height) en bas, garantit zéro chevauchement avec le texte.

## Remplacer le fond placeholder

Le `public/backgrounds/noir-nuages.mp4` actuel est un **placeholder synthétique** (noise + boxblur + vignette via ffmpeg) pour les smoke tests. Le vrai fond fumée avec handle `@lecorpsnetrichejamais` incrusté doit être déposé par Cyrille sur kDrive puis copié à la place :

```bash
cp /mnt/kdrive/<chemin>/noir-nuages.mp4 public/backgrounds/noir-nuages.mp4
node render.js examples/quand-il-est-seul.json   # re-render pour vérif
```

## Calibration QA finale

La calibration image-par-image contre les 2 vidéos de référence (typo, marges, centrage, interlignage, rythme) n'a pas été faite — les vidéos `references/` ne sont pas encore déposées par Cyrille. Procédure quand elles seront disponibles :

```bash
cp /mnt/kdrive/<chemin>/reel-votre-vie-amoureuse.mp4 references/
cp /mnt/kdrive/<chemin>/reel-quand-il-est-seul.mp4 references/

# Extraire des frames côte-à-côte pour comparaison visuelle
mkdir -p qa
for s in quand-il-est-seul votre-vie-amoureuse; do
  ffmpeg -i out/$s.mp4 -ss 2 -frames:v 1 qa/${s}_render.jpg
  ffmpeg -i references/reel-${s}.mp4 -ss 2 -frames:v 1 qa/${s}_ref.jpg
done
```

Ajuster ensuite dans `src/constants.js` (SAFE, FADE, GAP, STAGGER_*) et `src/TextStack.jsx` (BLOCK_GAP_EM, LINE_GAP_EM) jusqu'à correspondance.

## Hors périmètre (à ne pas implémenter ici)

- Son / musique.
- Publication (Blotato).
- Orchestration agent rédacteur → rendu → Blotato (couche d'action future).
- Génération d'images / vidéos par IA.
