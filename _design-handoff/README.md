# Bundle handoff — Claude design : nouveaux moteurs de rendu (on démarre par les RÉELS)

Glisse ce dossier (ou son contenu) dans une session **Claude design** (skill frontend-design), puis colle **`00_PROMPT_a_coller.md`**. Ces fichiers sont les pièces jointes que la session doit avoir sous les yeux (elle n'a pas accès au serveur).

## On attaque par : les RÉELS (nouveau style visuel de réel)
Objectif du 1er moteur : un **nouveau style visuel de réel** (1080×1920, vidéo), **liberté créative** pour maximiser le stop-scroll, **PAS une copie** d'Écho Incarné. Deux exigences :
1. **Charte COMPATIBLE avec Écho Incarné** (même famille de marque, terracotta = ADN couleur, on reconnaît H3C — compatible, pas identique).
2. **Safe zones** respectées (le texte ne passe jamais sous l'UI des 3 plateformes — voir le prompt + `reel-render.html`).
Le reste (composition, animation, impact) = libre.

## Contenu

- **`00_PROMPT_a_coller.md`** — le prompt à coller. Tout est dedans (contrat technique, safe zones avec chiffres, contrat d'input JSON, latitude créative).

- **`templates/`** — le socle technique (à étudier pour le BRANCHEMENT, pas pour le look) :
  - `reel-render.html` — **la cible** : moteur réel HTML/CSS/JS vanilla qui tourne en prod. Montre l'interface `window.loadReel/playReel/reelDurationMs`, l'auto-fit anti-débordement, le parse `[[mot]]`, les **safe zones** (objet `PLATFORMS`), le décor. C'est la MÉCANIQUE à reprendre, le VISUEL est libre.
  - `export-reel.mjs` — le driver Playwright qui appelle ton HTML (montre l'ordre des appels + la capture vidéo par plateforme).
  - `carousel-render_REFERENCE.html` — 2e exemple de moteur propre (image fixe, `window.renderSlide`). **Hors périmètre** (le carrousel est déjà au top), juste pour voir un autre branchement.

- **`design-intention/`** — l'Écho Incarné **d'origine en Remotion/React** (`Reel.jsx`, `constants.js`, `PageStack.jsx`, `MessageReel.jsx`, `Background.jsx`). **Pour INSPIRATION seulement** (couleurs, timings, composition d'origine). À NE PAS livrer (la sortie = HTML, pas React).

- **`specs-exemples/`** — **de vrais specs JSON** = l'INPUT que ton moteur consomme (un par layout de réel) :
  - `reel-01-court.json` (segments) · `reel-02-long.json` (pages) · `reel-03-message.json` (bulles) · `reel-04-confrontation.json` (split) · `reel-05-avantapres.json` · `reel-06-timeline.json` · `reel-07-liste.json` · `reel-08-citation.json`.
  - Le texte visible vient TOUJOURS du spec ; `[[mot]]` = à mettre en avant. Ta liberté est sur la mise en scène, pas le contenu.

## Rappel des 2 règles dures (le reste = liberté)
1. **Branchement** : un `.html` autonome (vanilla, offline, 1080×1920), qui expose `window.loadReel(spec,opts)` + `await window.playReel()` (async, DOIT se résoudre = durée vidéo).
2. **Safe zones** : aucun texte sous l'UI des 3 plateformes. Union stricte sur 1080×1920 → marges haut 300 / bas 560 / gauche 104 / droite 212 (zone utile ~764×1060). Détail par plateforme dans le prompt et `reel-render.html`.
