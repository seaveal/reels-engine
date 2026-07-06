# Handoff Remotion — Fonds carrousel « L'Écho Incarné »

Reproduire dans Remotion les fonds de carrousel Instagram de **Souverain au Quotidien / Méthode H3C**,
direction **1a — L'Écho Incarné**.

---

## 0. Format & taille (vérifié 2026)

| | |
|---|---|
| **Taille** | **1080 × 1440 px** (3:4 portrait) — choix retenu |
| **Statut 2026** | Format 3:4 ajouté par Instagram en 2026 : plus de hauteur, idéal pour le contenu textuel. Publie bien en feed. |
| Alternative | **1080 × 1350** (4:5) — préréglage historique d'Instagram, meilleur track record d'engagement. Pour y revenir : `CANVAS.height = 1350`. |
| Export | PNG (graphique + texte net) ou JPG 80–90 %, **1080 px de large**, profil **sRGB**. Jamais < 1080 px (upscale = flou). |
| Slides | 7 à 10 (sweet spot). Dernière slide = « Enregistrez » (les saves pèsent lourd dans l'algo). |

**Zones de sécurité.** Sur la **grille de profil**, un carrousel portrait est recadré : ~135 px en haut
et ~135 px en bas sont masqués. Le texte critique doit vivre dans le ventre de la slide. Dans le **feed**,
tout est visible ; garde quand même ~60 px de marge aux bords (on est large : padding 96 px).

Pour passer en 3:4 : dans `tokens.ts`, `CANVAS.height = 1440`. Les composants suivent (flex space-between).

---

## 1. Le système en une phrase

Trois voix chromatiques **seulement**, jamais une quatrième :

| rôle | couleur | usage |
|---|---|---|
| crème papier ancien | `#F0E7D6` | fond, porte tout |
| taupe minéral | `#998A79` | le passé, les échos pâles, le murmure du haut |
| terracotta profonde | `#A8432B` | **l'unique présence** : le mot qui bascule, le point de l'écho, le renvoi légende |
| encre chaude | `#2A211A` | corps du texte serif |

Trois voix typographiques, pas une de plus :

- **Serif** (`Cormorant Garamond`) = la chair (hook monumental) ; **italique** = le souffle (sous-textes, mot-pivot).
- **Linéale** (`Archivo`) = l'os : le murmure du haut, en lettres espacées (`letter-spacing: .42em`, capitales).
- **Mono** (`IBM Plex Mono`) = le relevé scientifique : numéros de slide, signature `@handle`, renvoi légende.

Gravité verticale : **le haut murmure, le centre frappe, le bas signe.**

---

## 2. Fichiers

```
remotion/echo-incarne/
├─ tokens.ts        # couleurs, trame 1080×1350, échelles typo
├─ EchoIncarne.tsx  # Cover / Body / Cta + Pastille + EchoDots + parsePivot
└─ Root.tsx         # <Composition id="EchoSlide"> pour rendu "still"
```

À placer dans un projet Remotion (`npm i remotion @remotion/cli @remotion/google-fonts react react-dom`).
Enregistre `RemotionRoot` dans ton `src/index.ts` : `registerRoot(RemotionRoot)`.
Dépose la photo dans `public/cyrille-novou-new-ok.jpg` (Remotion la sert via `staticFile`).

---

## 3. Les 3 fonds types

**Cover** — murmure (`Souverain au Quotidien` + `01/09`) en haut-gauche · **pastille photo** ronde,
anneau terracotta, en haut-droite · tag pilier terracotta (mono) · hook serif monumental avec **1 mot-pivot**
en terracotta italique · **motif de l'écho** (6 disques, opacité croissante, culmine sur le disque terracotta) ·
filet + `@handle` / `H3C`.

**Body** — murmure gauche (`Le signe · 03`) + numéro droite · hook serif (72 px) avec mot-pivot ·
sous-texte italique atténué (souffle) · filet + `Suite →`. Une idée forte par slide, jamais deux.

**Cta** — murmure · **pastille photo** centrée · « Enregistrez ce carrousel. » serif · souffle italique ·
renvoi légende en mono terracotta (`La réponse est en légende`). **Jamais** le mot-clé funnel à l'écran.

---

## 4. Le surlignage `[[mot]]`

Tes specs de contenu marquent déjà le mot qui bascule ainsi : `"...a été [[dressée]]."`.
`parsePivot()` transforme `[[mot]]` en **terracotta italique** — l'unique présence de la slide.

> Note : à l'écran des **réels vidéo**, ta doctrine surligne en **jaune**. Ici, pour des **fonds premium
> fixes**, on reste dans les trois voix : le pivot est **terracotta**, pas jaune. Si tu veux le jaune,
> change la couleur dans `parsePivot` — mais tu introduis alors une 4ᵉ voix (à assumer).

Règles de densité (reprises de `doctrine-mise-en-scene-reel`) : 1 pivot sur une accroche courte ;
~1 pivot pour 4–5 mots sur un corps ; jamais « vous/votre » ni les mots-outils ; vise la chute.

---

## 5. Rendu des slides (stills PNG)

Chaque slide se rend en image fixe en passant ses données en `--props` (JSON) :

```bash
# Couverture
npx remotion still src/index.ts EchoSlide out/slide-01.png \
  --props='{"variant":"cover","pilier":"Le mécanisme","text":"Une femme qui tolère l'\''insupportable a été [[dressée]].","index":1,"total":9,"handle":"@souverainauquotidien"}'

# Un signe
npx remotion still src/index.ts EchoSlide out/slide-04.png \
  --props='{"variant":"body","eyebrow":"Le signe · 03","text":"Vous ne demandez pas, vous attendez qu'\''on [[devine]].","sub":"Parce qu'\''enfant, réclamer, c'\''était risquer le silence ou la porte qui claque.","index":4,"total":9}'

# Renvoi légende
npx remotion still src/index.ts EchoSlide out/slide-09.png \
  --props='{"variant":"cta","text":"Enregistrez ce carrousel.","sub":"Il reviendra vous parler le jour où vous oserez dire non.","legend":"La réponse est en légende","index":9,"total":9}'
```

Boucle recommandée : lis ton JSON de carrousel existant (`carrousels-specs/*.json`, tableau `slides`),
mappe l'index 0 → `cover`, le dernier → `cta`, le reste → `body`, et lance un `remotion still` par slide.
Tu obtiens le même kit PNG que `reels-engine`, mais au rendu « Écho Incarné ».

---

## 6. Champs `SlideData`

| champ | type | slides | rôle |
|---|---|---|---|
| `variant` | `'cover'\|'body'\|'cta'` | toutes | choisit le gabarit |
| `text` | string (peut contenir `[[…]]`) | toutes | le hook |
| `eyebrow` | string | body (cover par défaut) | murmure haut |
| `pilier` | string | cover | tag terracotta (ex. « Le mécanisme ») |
| `sub` | string | body / cta | le souffle (italique) |
| `legend` | string | cta | renvoi légende |
| `index` / `total` | number | toutes | numéro `03 / 09` |
| `handle` | string | cover / body | `@souverainauquotidien` |
| `photo` | string | cover / cta | fichier dans `public/` (défaut : `cyrille-novou-new-ok.jpg`) |
