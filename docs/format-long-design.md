# Design — Format LONG (réels de narration longue) — reels-engine

**Date :** 2026-06-16 · **Auteur :** Claude-Code (instance dev reels-engine)
**Décision Cyrille 16/06 :** faire évoluer le moteur pour gérer le **format long** EN PLUS du
format court existant, pour régénérer fidèlement les réels longs du top-15.
**Contrainte cardinale :** ADDITIF + RÉTROCOMPATIBLE — le format court reste le comportement
**par défaut, inchangé**, prouvé par non-régression au rendu.

---

## 1. Mécanique d'origine observée (Étape 1)

Sources lues : OCR on-screen intégral + `## Timeline d'apparition` de 5 réels longs
(`18017401274379571` 37 s, `18031448930237883` 56 s, `18055702253082598` 57 s,
`18061938323496486` 48 s, `18243839092294508` 28 s liste-12).

**La mécanique est du PAGING (remplacement), PAS de l'empilement ni du défilement continu.**

Pattern universel des 5 réels :
1. Le réel est découpé en **N « pages »** (≈ 10-22 s par page).
2. Chaque transition de page est marquée dans la timeline OCR par un **flash du handle seul**
   (`@lecorpsnetrichejamais` isolé ~0.5 s) → c'est le montage IG d'origine qui coupe vers un
   nouvel écran.
3. Puis un **bloc plein écran dense** (12-15 lignes de corps en graisse régulière) apparaît
   **d'un coup** et reste **statique** toute la durée de la page.
4. La **page suivante remplace entièrement** la précédente (l'écran se vide). Pas d'accumulation,
   pas de scroll.
5. La 1ʳᵉ page ouvre en général sur 3-5 lignes de **titre CAPS** (le hook), puis des lignes de corps.
6. La **dernière** page se termine par une ligne **CTA** (« LISEZ LA LÉGENDE » / « LA SOLUTION EST
   DANS LA LÉGENDE » / « VOICI COMMENT FAIRE »).

Exemples de frontières (depuis les timelines) :
- `18017401274379571` (37 s) : 00:00.5 page1, flash 00:11, 00:11.5 page2, 00:24.5 page3 → **3 pages**.
- `18055702253082598` (57 s) : flashes 00:00 / 00:21.5 / 00:40.5 → blocs à 00:00.5 / 00:22 / 00:41.5 → **3 pages** (~20 s/page).
- `18243839092294508` (28 s, liste 12 items) : 00:00.5 page1 = les 12 items affichés d'un coup (tenu ~20 s), 00:22 page2 = outro + CTA → **2 pages, dont 1 liste**.

La **liste numérotée** (réel #5) n'est donc PAS un mécanisme distinct : c'est une page de paging
dont le contenu est une suite de lignes numérotées affichées simultanément.

## 2. Principe de design retenu

> **Tranché pour la voie la plus fidèle à la timeline d'origine : PAGING / REPLACE.**
> Alternative écartée (empilement défilant) : notée pour Cyrille, mais aucune timeline n'y
> correspond — les réels longs *remplacent* l'écran, ils ne *scrollent* pas.

### 2.1 Discriminant de format — `layout`
Nouveau champ racine **optionnel** `layout: "short" | "long"`, défaut **`"short"`**.
- `layout` absent ou `"short"` → **comportement actuel strictement inchangé** (racine
  `{slug, reveal, segments[1-8]}`, mode `all_at_once` / `staggered`).
- `layout: "long"` → nouveau mode paging décrit ci-dessous.

### 2.2 Modèle de données du long — `pages[]`
En `layout:"long"`, la racine porte **`pages`** (au lieu de `segments`). Une page :

```jsonc
{
  "lines": [                       // 1..24 lignes affichées simultanément sur la page
    { "text": "...", "role": "heading" | "body" | "cta", "bold": true|false },
    // role défaut "body" ; "heading" => CAPS+gras ; "cta" => CAPS régulier (comme le court)
    // text supporte [[surlignage]] -> jaune #FFFF00 (réutilise highlight.js inchangé)
  ],
  "hold_s": 20                     // optionnel : durée d'affichage de la page (défaut auto, cf. §2.4)
}
```

- `lines` accepte **1 à 24** entrées (lève le plafond de 8 du court ; 24 couvre la page la plus
  dense observée — la liste 12 + hook + outro).
- Une page = un écran. Auto-fit vertical de la page entière (réutilise `autoFit.js` inchangé).

### 2.3 Apparition & transition (paging)
- À l'entrée d'une page : `fade in` du bloc entier (réutilise `FADE_SEC = 0.4`).
- La page reste **statique** pendant `hold_s`.
- Transition vers la page suivante : la page courante **disparaît** (la suivante prend toute la
  place — replace). Pas de chevauchement (fidèle au « cut » d'origine ; on garde un léger fade
  pour le confort, pas un cut sec qui flasherait).
- Pas de re-centrage inter-page : chaque page est centrée H+V indépendamment (comme le court
  `all_at_once`).

### 2.4 Durée dynamique (calée sur le volume / la timeline)
`computeDurationSec` étendu pour `layout:"long"` :
- Si `duration_s` fourni → il prime (override total, comme aujourd'hui).
- Sinon : `somme(hold_s de chaque page)`, où `hold_s` par page = soit la valeur explicite,
  soit un **auto** proportionnel au volume de texte de la page :
  `hold_auto = clamp(PAGE_BASE_SEC + lines * PAGE_PER_LINE_SEC, PAGE_MIN_SEC, PAGE_MAX_SEC)`.
  Calibration depuis les timelines (≈ 20 s pour ~14 lignes) :
  `PAGE_BASE_SEC = 4`, `PAGE_PER_LINE_SEC = 1.15`, `PAGE_MIN_SEC = 6`, `PAGE_MAX_SEC = 24`.
  → 14 lignes ⇒ 4 + 16.1 = 20.1 s (colle à l'observé). Constantes ajustables.

### 2.5 Invariants visuels — PRÉSERVÉS À L'IDENTIQUE
Aucune modification de : `WIDTH=1080 HEIGHT=1920 FPS=30`, `FONT_FAMILY='Oswald'`,
`COLORS.yellow='#FFFF00'`/blanc/fond noir, `SAFE {top:0.17,bottom:0.22,left/right:0.10}`,
fond `noir-nuages.mp4` (le vrai fond, handle incrusté). Le long réutilise `safeBox`, `autoFit`,
`SegmentLine`, `highlight`, `Background` **inchangés**. Densité : le corps long est en graisse
**régulière** (400) par défaut, taille réduite par l'auto-fit existant pour faire tenir 14 lignes.

## 3. Schéma (additif → le court existant valide toujours)

Stratégie : `oneOf` au niveau racine, branché par `layout` (avec défaut `short`). Comme le schéma
actuel a `additionalProperties:false`, on bascule la racine vers un `oneOf` de 2 variantes qui
**réutilisent les mêmes `$defs`** (le `segment` actuel reste identique, donc tout JSON court valide
reste valide). On ajoute `$defs/page` + `$defs/longLine`.

- Variante COURT : `{slug, reveal, segments[1-8], ...}` + `layout` ∈ {absent, "short"} →
  **identique à v1** (mêmes required, mêmes contraintes).
- Variante LONG : `{slug, layout:"long", pages[1-N], ...}` (`reveal`/`segments` interdits).

`$id` : on reste sur v1 (évolution backwards-compatible — un JSON court v1 valide reste accepté).

## 4. Implémentation (composants)

- `constants.js` : +constantes paging (`PAGE_*`, `PAGE_FADE_SEC`), `computeDurationSec` étendu
  (branche `layout:"long"`), +helper `computePageHolds(spec)`. **Aucune constante existante touchée.**
- `src/pages.js` (NOUVEAU, pur-JS, testable) : `normalisePages(pages)` → lignes normalisées
  (`{text, bold, kind}`), réutilise la même sémantique de casse/gras que `segments.js`.
- `src/PageStack.jsx` (NOUVEAU) : rend UNE page (bloc centré H+V, auto-fit via `computeAutoFitFontSize`
  réutilisé, lignes via `SegmentLine` réutilisé).
- `src/Reel.jsx` : branche sur `props.layout === 'long'` → rend un `<Series>`/séquençage des pages
  (chaque page sur sa fenêtre `[start, start+hold]`, fade in). Sinon → `<TextStack>` actuel (inchangé).
- `src/Root.jsx` / `index.jsx` : `calculateMetadata` déjà basé sur `computeDurationSec` → marche
  pour le long sans changement de signature.
- `render.js` : **aucun changement** (valide via AJV le nouveau schéma, slug → nom de sortie).

## 5. Non-régression (obligatoire)

- `tests/unit.test.js` : tous les tests existants restent verts (modules court intouchés).
- +tests pour `normalisePages` et `computeDurationSec(layout:long)`.
- Rendu : les 7 squelettes courts de `reconstructions-top15/` + `examples/*.json` valident ET
  rendent après changements (preuve au rendu d'au moins 1 court).

## 6. Rendu (commande)

```
node render.js <chemin.json> --out out/_validation-format-long/<slug>.mp4 --scale 1
```
(`--scale 1` = preview 1080p rapide ; `--scale 2` = 4K final.)

## 7. Point laissé à Cyrille

- **Découpage en pages** des réels longs = condensation honnête de l'OCR (l'OCR contient du bruit
  de frames intermédiaires ; le texte est nettoyé en lignes lisibles). À valider éditorialement.
- **Surlignage `[[mot]]`** sur le long : posé avec parcimonie (le corps long est dense). À ajuster.
- Confort de transition : fade léger inter-page retenu (vs cut sec). Réversible (constante).
