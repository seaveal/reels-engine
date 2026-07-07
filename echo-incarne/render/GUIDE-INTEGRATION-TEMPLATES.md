# Guide d'intégration — templates carrousel (moteur Écho Incarné)

> Écrit 2026-07-07 après une session de debug qui a révélé toutes les subtilités du
> rendu. À lire AVANT d'intégrer un nouveau template carrousel (ou d'en modifier un).
> Chaque piège ci-dessous nous a coûté un aller-retour avec Cyrille — ils sont tous
> reproductibles sur un nouveau template si on ne les connaît pas.

---

## 1. Architecture & flux de données (qui produit quoi)

```
Note vault 06_CONTENUS/idee-carrousel-*.md
  │  (frontmatter: statut, pilier, genre, carrousel_spec ; corps: bloc ```json``` des slides)
  │
  ├─▶ studio_carrousel.py   (rédaction : angle → 9-12 slides + légende, 3 passes LLM)
  │     écrit le SPEC : /home/agents/content-agent/carrousels-specs/<slug>.json
  │     { slug, slides:[...], pilier, handle:"@lecorpsnetrichejamais" }
  │     statut note → a_valider
  │
  ├─▶ (validation Cyrille dans le Studio)  statut → valide
  │
  └─▶ studio_cards.py   (rendu PNG, worker `agents-studio-cards`)
        appelle :  node echo-incarne/render/export-carousel.mjs <spec> --outdir=<dir>
        écrit 9-12 PNG + un .zip dans out/carrousels/<slug>/
        pose carrousel_png[] + carrousel_zip sur la note, statut → rendu
```

**Le rendu lui-même** : `export-carousel.mjs` lance **Playwright** (Chromium headless),
charge la page **`carousel-render.html`**, injecte le spec en JS, et **screenshote le
`#stage`** (1080×1440) une fois par slide. **Pas de build, pas de serveur** : on édite le
`.mjs` ou le `.html`, l'effet est immédiat au prochain rendu.

### ⚠️ Piège n°1 — DEUX implémentations parallèles, une seule est en prod
- ✅ **`render/carousel-render.html`** = le template de PRODUCTION (self-contained, HTML+JS inline).
- ❌ **`remotion/echo-incarne/EchoIncarne.tsx`** = implémentation Remotion PARALLÈLE, **PAS utilisée** pour le rendu carrousel (le PNG passe par le HTML). Elle contient les mêmes composants (Cover/Body/Cta) mais l'éditer **ne change rien** aux carrousels.
- ❌ **`render-carrousel.js`** (racine reels-engine, composant `Slide.jsx`) = ancien moteur Remotion, **déprécié** (gardé pour rollback une ligne).

→ **Pour un nouveau template carrousel : on part de `carousel-render.html`.** Ne pas perdre de temps dans le `.tsx`.

---

## 2. Le contrat de SPEC (entrée du renderer)

```json
{
  "slug": "idee-carrousel-...",
  "slides": ["texte slide 1 (cover)", "...", "texte dernière slide (cta)"],
  "pilier": "blessure|mecanisme|declic|sortie",   // optionnel → eyebrow/tag du renderer
  "handle": "@lecorpsnetrichejamais",             // optionnel → défaut si absent
  "photo":  "...",                                 // optionnel → pastille avatar
  "legend": "..."                                  // optionnel → sinon rotation LEGENDS[]
}
```

- `slides` : tableau de **chaînes** (le texte de chaque slide, avec `[[surlignage]]` et `\n`).
- **index 0 → variante `cover`**, **dernier → variante `cta`**, le reste → `body`. C'est
  `export-carousel.mjs` (`raw.map(...)`) qui affecte la variante, PAS le spec.
- Le renderer tolère un spec minimal `{slug, slides}` : tous les autres champs ont un défaut.

---

## 3. Les 3 helpers de rendu — LA RÈGLE D'OR

Dans `carousel-render.html`, tout texte visible passe par un helper. **Un nouveau template
DOIT utiliser les mêmes, sur TOUS les champs de texte, sans exception.**

| helper | rôle | à utiliser pour |
|---|---|---|
| `esc(s)` | échappe `& < >` UNIQUEMENT | jamais seul sur du texte éditorial (voir piège n°2) |
| `pivot(s)` | `esc` + `[[mot]]`→terracotta italique + `\n`→`<br>` | **TOUT texte éditorial** (hook, sub, citations) |
| `eyebrowHtml(v)` | marque HTML brute si vide, sinon `esc(v)` | l'eyebrow (bandeau du haut) |

### ⚠️ Piège n°2 — un seul champ en `esc()` au lieu de `pivot()` = crochets bruts
Le sub du CTA utilisait `esc(s.sub)` alors que tous les autres champs utilisaient `pivot()`.
Résultat : un `[[Lisez la légende]]` s'affichait **avec les crochets** au lieu du surlignage.
→ **Sur un nouveau template : chaque champ de texte éditorial = `pivot()`.** Faire un
grep de `esc(s.` et vérifier qu'aucun champ éditorial n'y est resté (esc est réservé aux
champs techniques : handle, tag, numérotation, legend).

---

## 4. Le découpage head/sub — `splitText()` dans export-carousel.mjs

Chaque slide `body`/`cta` est coupée en **`head`** (accroche large) + **`sub`** (souffle plus
petit) par `splitText(t)`. La coupe se fait au 1er **saut de paragraphe (`\n\n`)** ou **fin de
phrase (`.!?` + espace)**, selon ce qui vient en premier.

### ⚠️ Piège n°3 — `splitText` doit être « bracket-aware »
Un `.` (ou `!`, `?`) **à l'intérieur d'un `[[...]]`** (ex. une citation `[[« … prend. »]]`)
faisait couper au milieu de la paire → `[[` orphelin dans le head, `»]]` orphelin dans le sub,
tous deux affichés bruts. **La fonction ne doit JAMAIS couper à l'intérieur d'un `[[...]]`**
(elle scanne en suivant une profondeur de crochets). → Si un nouveau template refait un
découpage de texte, **reprendre cette logique bracket-aware**, ne pas réintroduire une regex
naïve `^(.*?[.!?])\s+(.+)$`.

---

## 5. Les sauts de ligne de l'éditeur

### ⚠️ Piège n°4 — le HTML écrase les `\n`
Un retour à la ligne tapé dans l'éditeur (`\n`) est du texte, mais le HTML le **collapse en
espace**. Il faut convertir `\n` → `<br>` au rendu. C'est fait dans `pivot()`
(`.replace(/[ \t]*\n(?:[ \t]*\n)*[ \t]*/g, '<br>')` — runs de `\n` collapsés en UN `<br>`).
→ Tout nouveau template qui affiche du texte éditorial doit faire cette conversion (donc :
passer par `pivot()`, cf. règle d'or).

---

## 6. Éléments de marque (identité) — où ils vivent

| élément | valeur canonique | position | code |
|---|---|---|---|
| **eyebrow** (bandeau haut) | `SOUVERAINAUQUOTIDIEN.COM` (SOUVERAIN + QUOTIDIEN en terracotta) | cover + cta, haut | const `BRAND_EYEBROW` (HTML brut) via `eyebrowHtml()` |
| **handle** (pied) | `@lecorpsnetrichejamais` | cover + body, pied (Rule) | défaut `s.handle \|\| '@lecorpsnetrichejamais'` |
| eyebrow body | `Le signe` | body, haut | défaut littéral |
| tag | `H3C` | cover, pied droit | littéral |
| legend (renvoi) | rotation `LEGENDS[]` | cta, bas terracotta | `spec.legend \|\| LEGENDS[i%…]` |

- **Deux infos DISTINCTES** : l'**URL du site** en haut (eyebrow), le **handle Instagram** en
  pied. Ne pas les confondre (l'incident initial : l'eyebrow affichait « Souverain au Quotidien »
  = le nom du programme, à la place de l'identité voulue).
- Handle canonique Instagram : **@lecorpsnetrichejamais** (memory `instagram-cyrille-handle-canonique`).
- **Pour styliser une PARTIE d'un texte de marque** (ex. 2 mots en terracotta dans l'URL) :
  injecter du **HTML brut** `<span style="color:var(--terra)">…</span>` (PAS via `esc`, qui
  échapperait les balises). C'est le pattern de `BRAND_EYEBROW` (carrousel) et de `handleHtml`
  du réel (`reel-render.html` : `@le<span>corps</span>ne<span>triche</span>jamais`).
- ⚠️ L'eyebrow est en `text-transform:uppercase` (CSS) : la casse de la source n'importe pas.

---

## 7. Design tokens (couleurs, fonts, dimensions)

```
Couleurs (:root)   --creme #F0E7D6 (fond) · --terra #A8432B (accent/terracotta)
                   --taupe #998A79 (labels) · --encre #2A211A (texte) · --encreSoft #4A4036
Fonts (vendorées)  --serif Cormorant Garamond (hooks) · --sans Archivo (labels)
                   --mono IBM Plex Mono (num/handle/legend)
                   → render/fonts/echo-incarne-fonts.css (aucune dépendance réseau)
Format             #stage = 1080×1440 px (4:5 IG portrait), padding 96px
                   Playwright viewport 1080×1440, deviceScaleFactor 1
Tailles hook       cover 104px · body 72px · cta 82px · sub 44-48px
Accent surlignage  .pivot { color: var(--terra); font-style: italic }
```

- **Terracotta = `#A8432B` = `var(--terra)`** (aligné à la couleur CTA canonique du projet,
  memory `couleur-cta-canonique-terracotta`). Ne jamais coder une autre valeur en dur.
- Fonts **vendorées** (audit 2026-07-07) : un nouveau template réutilise `echo-incarne-fonts.css`,
  ne recharge pas depuis Google Fonts (le rendu Playwright headless doit être offline-safe).

---

## 8. Rendre / tester un template (boucle de vérif rapide)

```bash
cd /home/agents/code/reels-engine/echo-incarne
node render/export-carousel.mjs <spec.json> --outdir=/tmp/mon-test
# puis inspecter les PNG (l'outil Read affiche les images) : cover (slide-01), cta (dernière),
# et une slide body avec citation surlignée + saut de ligne pour couvrir tous les pièges.
```

- Le flag **`--outdir=DIR`** est le contrat (studio_cards l'utilise). Sans lui → `out/<slug>/`.
- **Toujours vérifier visuellement** au moins : (a) une slide avec `[[surlignage]]` contenant un
  `.` interne, (b) une slide avec un `\n` éditeur, (c) l'eyebrow + le handle. Ce sont les 3 pièges.

### Re-rendre un carrousel de PROD (après un fix template)
```bash
touch <spec.json>                    # force studio_cards à re-rendre (_fresh compare mtime spec vs PNG)
# + repasser la note en statut: valide  → le worker re-render PNG + zip → statut: rendu
```
Le template est lu **frais à chaque rendu** : un fix `carousel-render.html` s'applique à TOUS
les carrousels re-rendus, sans redéploiement.

---

## 9. Check-list pour intégrer un NOUVEAU template carrousel

- [ ] Partir de `carousel-render.html` (pas du `.tsx`).
- [ ] **Tout texte éditorial → `pivot()`** (jamais `esc()` seul). Grep `esc(s.` pour vérifier.
- [ ] Si découpage de texte : **bracket-aware** (jamais couper dans `[[...]]`).
- [ ] `\n` → `<br>` géré (automatique si on passe par `pivot`).
- [ ] Marque : eyebrow = URL site (parties en `var(--terra)` via HTML brut), handle = @lecorpsnetrichejamais en pied. Deux infos distinctes.
- [ ] Couleurs via `var(--terra)`/`var(--taupe)`/… (jamais de hex en dur).
- [ ] Fonts via `echo-incarne-fonts.css` (offline).
- [ ] `#stage` 1080×1440, padding cohérent.
- [ ] Variantes cover/body/cta gérées (ou adapter `export-carousel.mjs` `raw.map`).
- [ ] Tester visuellement les 3 pièges (surlignage+point, saut de ligne, marque).
- [ ] Backup de l'ancien template avant refonte (`*.bak-pre-<chantier>-<date>`).

---

## 10. Historique des fixes de la session 2026-07-07 (traçabilité)

| # | symptôme | cause | fix (fichier) |
|---|---|---|---|
| 1 | eyebrow « Souverain au Quotidien » au lieu de l'identité | défaut codé en dur (le handle du pied était OK) | eyebrow → BRAND_EYEBROW URL terracotta (`carousel-render.html`) |
| 2 | `[[Lisez la légende]]` en crochets bruts (CTA) | sub du CTA en `esc()` au lieu de `pivot()` | `pivot(s.sub)` (`carousel-render.html`) |
| 3 | `[[« citation. »]]` cassée en crochets bruts (slide 4) | `splitText` coupait sur le `.` interne au `[[ ]]` | `splitText` bracket-aware (`export-carousel.mjs`) |
| 4 | saut de ligne éditeur invisible (slide 1) | HTML collapse les `\n` | `pivot` : `\n`→`<br>` (`carousel-render.html`) |

Note technique jumelle : `99-Meta/Communications/Directeur-Technique/Inbox/` (session 2026-07-07).
