---
title: "Prompt Claude-Design — concevoir de nouveaux moteurs de rendu (latitude créative totale)"
type: prompt-design
entity: PHM
created: 2026-07-15
updated: 2026-07-15
tags: [design, rendu, reels-engine, echo-incarne, prompt]
---

# Prompt pour Claude (design) — nouveaux moteurs de rendu de contenu H3C

> Contexte pour Cyrille : ce prompt donne à Claude design **liberté créative totale** sur le VISUEL, et ne fixe que (a) le **contrat technique** pour brancher sur notre pipeline, (b) **une seule contrainte visuelle dure : les safe zones**. Colle-le dans une session Claude (skill frontend-design), en joignant les fichiers `.html`/`.json`/`.jsx` référencés.

---

## CE QU'ON TE DEMANDE

Tu es un directeur artistique / designer front d'exception. Tu conçois de **nouveaux moteurs de rendu visuel** pour du contenu vidéo/image marketing (marque **H3C** — coaching en dépendance affective et schémas relationnels ; voix humaine, incarnée, jamais racoleuse). Ces contenus doivent **arrêter le pouce** dans un feed saturé.

**On veut ta CRÉATIVITÉ, pas une copie.** Il existe déjà un moteur (« Écho Incarné », réels typographiques sur fond papier) — il te sert de **repère**, PAS de gabarit à reproduire. Tu es **libre de proposer des directions visuelles différentes, voire plus puissantes** en impact / stop-scroll : composition, typo, grammaire d'animation, ambiance. Tu peux **surpasser** l'existant. Cyrille tranchera avec toi.

**Une seule exigence de marque : ta charte doit rester COMPATIBLE avec Écho Incarné** — même famille visuelle, le terracotta comme ADN couleur, on reconnaît H3C. Compatible ≠ identique (détail dans « LA CHARTE » plus bas).

## LA SEULE CONTRAINTE VISUELLE DURE : LES SAFE ZONES

Ces vidéos sont publiées sur **Instagram Reels, TikTok ET YouTube Shorts**. Chaque appli superpose sa propre UI (boutons like/comment/share/profil à droite, légende + nom + audio en bas, éléments en haut). **AUCUN texte ni élément porteur de sens ne doit tomber sous ces UI.** Le décor (fond, texture, dégradé) peut aller bord à bord ; le **contenu lisible reste dans la safe zone**.

Sur un canvas **1080×1920**, la safe zone **UNION** (dégagée des 3 plateformes à la fois — la plus sûre) laisse ces marges :
- **haut : 300 px** · **bas : 560 px** · **gauche : 104 px** · **droite : 212 px**
- → zone de contenu utile ≈ **de (x=104, y=300) à (x=868, y=1360)**, soit ~764×1060 px.

Deux options, à toi de voir : (a) tout le texte dans cette union (simple, safe partout), OU (b) rendre par plateforme avec les marges spécifiques ci-dessous (plus d'espace, mais 3 variantes) — notre pipeline te passe `opts.platform`. Marges par plateforme : Instagram `{top:280, right:180, bottom:550, left:104}` · TikTok `{top:280, right:184, bottom:560, left:104}` · YouTube Shorts `{top:300, right:212, bottom:530, left:104}`. (Détail utile : sur YouTube le renvoi « LÉGENDE » se dit « DESCRIPTION ».)

## LE CONTRAT TECHNIQUE (comment ça se branche — NON négociable)

C'est la SEULE chose fixe côté technique. Le reste (le visuel) est à toi.

- **Un moteur = UN fichier `.html` autonome** : HTML + CSS + JS **vanilla** dans un `<script>`. **Pas de React, pas de build, pas de framework, pas de CDN, zéro fetch réseau** — tout inline, rendu **offline**. (Le repo contient une ancienne version Remotion/React `src/*.jsx` : c'est la source d'INSPIRATION d'Écho Incarné, pas le format de livraison — voir plus bas.)
- Le rendu se fait par **Playwright/Chromium headless** : un driver `export-*.mjs` ouvre ton `.html`, injecte un **spec JSON**, joue l'animation, **capture la vidéo en temps réel** (ou un screenshot pour une image).
- Rends dans `<div id="stage">` aux dimensions du format : **réel/story = 1080×1920**, **image (carte/couverture) = 1080×1350**.
- **Polices** : vendorées en local (`@font-face` fichiers locaux). Tu choisis les polices — fournis-les ou dis lesquelles.
- **Markup `[[mot]]`** dans les textes du spec = ce mot doit être **mis en avant** (à ta façon : couleur, poids, animation…). Tu le parses.

### Interface `window.*` que ton HTML DOIT exposer

**Moteur VIDÉO (réel, story)** — le driver appelle dans l'ordre :
```js
window.loadReel(spec, opts)   // opts = {platform:'instagram'|'tiktok'|'youtube', theme:'…'}
                              // → met en place le décor + la 1re frame. Retourne quand prêt.
await window.playReel()       // → JOUE l'animation. DOIT être async et SE RÉSOUDRE à la fin :
                              //   la durée de la promesse = la durée de la vidéo. Jamais de boucle infinie.
window.reelDurationMs(spec)   // → estimation de durée (logs). Optionnel.
```
**Moteur IMAGE (carte, couverture)** — le driver appelle : `window.renderSlide(data)` → rend une image fixe, le driver screenshote `#stage`.

## L'INPUT : le spec JSON (produit par nos rédacteurs LLM — forme FIXE)

Ton moteur consomme ce JSON (tu ne l'inventes pas ; si ton design a besoin d'un champ en plus, propose-le, on l'ajoutera côté rédacteur). Le champ `layout` d'un réel choisit le sous-rendu :
- court : `{ "segments": [ {"role":"title|block|cta","text":"…[[mot]]…"} ] }`
- long : `{ "layout":"long", "pages":[ {"lines":[{"text":"…","role":"heading|body|cta"}],"arrow":true} ] }`
- message : `{ "layout":"message","hook":"…","cta":"…","messages":[{"side":"in|out","text":"…","time":"02:14"}] }`
- confrontation : `{ "layout":"confrontation","hook":"…","top":{"eyebrow":"…","text":"…"},"bottom":{"eyebrow":"…","text":"…[[mot]]…"},"cta":"…" }`
- avantapres : `{ "layout":"avantapres","hook":"…","avant":{"eyebrow":"AVANT","text":"…"},"geste":{"text":"…"},"apres":{"eyebrow":"APRÈS","text":"…"},"cta":"…" }`
- timeline : `{ "layout":"timeline","hook":"…","steps":[{"label":"MOIS 1","text":"…"}],"cta":"…" }`
- liste : `{ "layout":"liste","hook":"…","items":["…[[mot]]…","…"],"cta":"…" }`
- citation : `{ "layout":"citation","quote":"…[[mot]]…","dev":"…","cta":"…" }`
- image (carte/couverture) : `{ "slides":["…[[mot]]…", …] }` ou un objet `{variant, texte, …}` selon le moteur.

De vrais specs à parcourir : `content-agent/reels-specs/*.json`. **Tout texte visible arrive du spec** — ta liberté est sur la MISE EN SCÈNE (typo, couleur, mouvement, hiérarchie, ambiance), pas sur le contenu.

## LA CHARTE — DOIT rester COMPATIBLE avec Écho Incarné (mais PAS une copie)

H3C : dépendance affective, schémas relationnels, le corps comme terrain. Public majoritairement féminin, blessure d'abandon. Ton : lucide, incarné, sans psychologie de comptoir, jamais clickbait vulgaire.

L'existant **« Écho Incarné »** (fond papier crème, accent **terracotta `#A8432B`**, serif littéraire, grain, ondes concentriques) porte la **charte visuelle de la marque**. **Ta charte pour le nouveau moteur DOIT rester COMPATIBLE avec Écho Incarné** : même **famille de marque**, codes cohérents — on doit **reconnaître H3C**, pas basculer sur une autre marque. Le terracotta reste l'ADN couleur.

Mais **ce n'est PAS une copie et l'harmonie STRICTE n'est pas demandée** : tu as toute latitude sur la **composition, la typo, l'animation, la hiérarchie, l'impact stop-scroll** — tu peux **diverger et frapper plus fort** qu'Écho Incarné. La règle : une charte qui **dialogue** avec Écho Incarné (palette/typo/esprit cohérents ou évolués), jamais en **rupture** de marque, jamais racoleuse. Compatible ≠ identique.

### Références (à ÉTUDIER pour comprendre le branchement + l'existant, pas à copier)
- **Cible technique HTML** : `code/reels-engine/echo-incarne/render/reel-render.html` (+ driver `export-reel.mjs`) — pour voir COMMENT `loadReel`/`playReel`/`reelDurationMs`, l'auto-fit anti-débordement, le parse `[[mot]]`, les safe zones se branchent. **Reprends la mécanique, PAS forcément le look.**
- **Intention d'origine (Remotion/React)** : `code/reels-engine/src/Reel.jsx` + `src/constants.js` — l'Écho Incarné designé au départ. Pour inspiration seulement.
- **Carrousel (déjà au top — hors périmètre)** : `carousel-render.html` — juste un 2e exemple de moteur propre.

## PÉRIMÈTRE
Cartes/couvertures d'articles · **nouveaux styles visuels de réel** (directions distinctes, impact maximal) · stories. **PAS le carrousel** (déjà au niveau).

## CE QU'ON ATTEND DE TOI, PAR MOTEUR
1. **Le fichier `.html` autonome** branché (interface `window.*`, spec JSON, bonnes dimensions, polices locales, `[[mot]]` parsé, **safe zones respectées**, `playReel` qui se résout, auto-fit du texte long).
2. **1 à 3 directions visuelles** proposées (Cyrille choisit) — ose des partis pris forts pour le stop-scroll.
3. La **liste des champs de spec** consommés (+ tout nouveau champ à ajouter côté rédacteur, justifié).
4. Un **aperçu testable** (regarde comment les templates existants font l'aperçu manuel `?d=<spec base64>` en bas de fichier).

## GARDE-FOUS (courts)
- **Safe zones** = la règle dure (le texte ne passe JAMAIS sous l'UI des 3 plateformes).
- Rendu **offline** (assets locaux), 1080×1920 ou 1080×1350.
- `playReel` DOIT se résoudre (sinon vidéo infinie). Le texte long ne DOIT jamais déborder (auto-fit).
- Marque H3C crédible (pas de racolage criard) — mais **liberté totale sur le style et l'impact**.
