import { stripInline } from './highlight.js';

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export const COLORS = {
  yellow: '#FFFF00',
  white: '#FFFFFF',
  black: '#000000',
  // CTA « LISEZ LA LÉGENDE » des réels longs : crème/pêche chaud, PAS blanc pur.
  // Mesuré sur les 3 originaux (palettegen) : RGB ≈ (249,233,219) = #F9E9DB.
  // Même teinte que la flèche dessinée « → » de bas de page.
  cream: '#F9E9DB',
};

// Safe zone tunée 2026-05-23 sur références réelles :
// - top 0.17 (était 0.12) : passe sous le handle "@lecorpsnetrichejamais"
//   incrusté dans le fond noir-nuages.mp4 (sinon chevauchement titre/handle).
// - bottom 0.22 : conserve l'espace au-dessus de la légende IG + icônes.
// - left/right 0.10 : marges H symétriques, largeur utile 80 %.
// FORMAT COURT : INCHANGÉ (non-régression). Le format long a son propre SAFE_LONG.
export const SAFE = {
  left: 0.10,
  right: 0.10,
  top: 0.17,
  bottom: 0.22,
};

// --- Format LONG : SAFE zone MESURÉE sur les 3 réels originaux (v3, 2026-06-16) ---
// Mesures (bbox du bloc de texte, proportions de 720x1280 ; handle exclu) :
//   marge gauche  : stoique 0.119-0.133 · verites 0.111-0.126 · ressentir 0.101-0.118
//   marge droite  : stoique 0.103-0.136 · verites 0.094-0.125 · ressentir 0.074-0.115
//   début contenu : ~0.155-0.16 sous le handle (handle @ ~0.11)
//   fin contenu   : pages denses à ~0.84 (marge basse ~0.16) ; pages CTA plus haut
//   largeur texte : 0.74 → 0.82 (ressentir le plus large)
// Objectif Cyrille « occuper l'espace au max tout en restant lisible » + hors UI IG :
//   left  0.09  (≈ marge gauche observée, on gagne un peu de largeur),
//   right 0.11  (texte util ~0.89 ; marge droite > gauche pour amorcer la garde
//               icônes IG côté droit. Largeur util = 0.80, = largeur médiane des
//               originaux 0.74-0.82),
//   top   0.155 (le texte démarre juste sous le handle, gagne du vertical vs 0.17),
//   bottom 0.16 (les pages denses des originaux descendent à ~0.84).
// Tout en PROPORTIONS → responsive : tient identique sur toute taille de téléphone.
export const SAFE_LONG = {
  left: 0.09,
  right: 0.11,
  top: 0.155,
  bottom: 0.16,
};

// SAFE ZONE icônes Instagram (like / commentaire / partage / enregistrer) :
// colonne VERTICALE côté DROIT, MOITIÉ BASSE de l'écran (y >= ICON_ZONE_TOP).
// Les icônes IG occupent en pratique le ~12-14 % le plus à droite. Sous cette
// bande (lower-right), AUCUN glyphe ne doit déborder au-delà de (1 - ICON_SAFE_RIGHT).
// Marge de sécurité responsive : 0.14 > emprise icônes → tient sur tous écrans.
// Les originaux laissent leur lower-right à x<=~0.86-0.90 ; on borne à 0.86.
export const ICON_SAFE_RIGHT = 0.14; // marge droite imposée dans la moitié basse
export const ICON_ZONE_TOP = 0.50;   // la colonne d'icônes commence à mi-hauteur

// SAFE ZONE basse (caption / handle / audio IG) : déjà couverte par SAFE_LONG.bottom
// (0.16 → le texte s'arrête à ~0.84, au-dessus de la légende qui démarre ~0.86+).

export const BACKGROUND_DURATION_SEC = 29;
export const BACKGROUND_DURATION_FRAMES = Math.round(BACKGROUND_DURATION_SEC * FPS);

export const FONT_FAMILY = 'Oswald';

export const FADE_SEC = 0.4;
export const STAGGER_GAP_SEC = 1.1;
export const STAGGER_LEAD_IN_SEC = 0.3;
export const ALL_AT_ONCE_DELAY_SEC = 0.3;
// Tail = temps statique après l'apparition complète. Calibré sur les références
// (votre-vie-amoureuse = 10s, quand-il-est-seul = 7.66s).
export const ALL_AT_ONCE_TAIL_SEC = 9.3;
export const STAGGER_TAIL_SEC = 3.5;
export const HAND_EMOJI_DELAY_AFTER_LAST_SEC = 0.4;

// --- Format LONG (layout:"long") — paging / replace. ADDITIF, n'affecte pas le court. ---
// Fade d'entrée d'une page (réutilise la sémantique FADE_SEC mais constante dédiée
// au cas où on veut un timing de page distinct du court).
export const PAGE_FADE_SEC = 0.4;

// LOI DE TIMING DÉRIVÉE DU CONTENU (calibrée sur les 3 réels originaux).
// La durée d'affichage d'une page ≈ son TEMPS DE LECTURE, donc proportionnelle
// au VOLUME DE TEXTE (caractères visibles), PAS au nombre de lignes ni à un fixe.
//
// Mesures (scene-change ffmpeg + confirmation visuelle, durée/chars par page) :
//   stoique  : 11.1s/344  13.1s/392  13.0s/416   -> ~30-32 char/s
//   verites  : 21.5s/541   6.4s/165               -> ~25-26 char/s
//   ressentir: 21.9s/567  19.2s/454  16.0s/367    -> ~23-26 char/s
//   => char/s observé : 22.9 → 32.0, moyenne 27.1 ; mots/s 4.1 → 5.3.
// Loi retenue (meilleur compromis durée TOTALE, RMSE 1.78 s/page) :
//   hold = clamp(chars / CHARS_PER_SEC, MIN, MAX)   sans base additive
//   (une base par page se compose avec le nb de pages et gonfle les totaux).
// Reconstitution des durées totales : stoique +15 %, verites -6 %, ressentir -10 %.
// (Le réel justifié « stoique » lit plus vite ~31 char/s ; aucune loi linéaire
//  unique ne colle les 3 à quelques % — surchargeable par page via hold_s.)
export const PAGE_CHARS_PER_SEC = 27;
export const PAGE_MIN_SEC = 4;
export const PAGE_MAX_SEC = 26;

export const safeBox = (width, height) => ({
  x: Math.round(SAFE.left * width),
  y: Math.round(SAFE.top * height),
  width: Math.round(width * (1 - SAFE.left - SAFE.right)),
  height: Math.round(height * (1 - SAFE.top - SAFE.bottom)),
});

// Safe box du FORMAT LONG (marges mesurées sur originaux). Sépare le court (SAFE)
// du long (SAFE_LONG) → édition du long sans toucher le rendu court (non-régression).
// Renvoie aussi `iconSafeRight` (px) = marge droite à respecter dans la moitié basse
// pour ne pas passer sous la colonne d'icônes IG, et `iconZoneTopY` (px, absolu).
export const safeBoxLong = (width, height) => ({
  x: Math.round(SAFE_LONG.left * width),
  y: Math.round(SAFE_LONG.top * height),
  width: Math.round(width * (1 - SAFE_LONG.left - SAFE_LONG.right)),
  height: Math.round(height * (1 - SAFE_LONG.top - SAFE_LONG.bottom)),
  iconSafeRight: Math.round(ICON_SAFE_RIGHT * width),
  iconZoneTopY: Math.round(ICON_ZONE_TOP * height),
});

// Volume de texte VISIBLE d'une page = nombre de caractères (marqueurs [[ ]] / **
// retirés), espaces normalisés. Sert à la loi de timing (temps de lecture).
export const pageCharCount = (page) => {
  const lines = (page && page.lines) ? page.lines : [];
  const txt = lines.map((l) => stripInline(l.text || '')).join(' ').replace(/\s+/g, ' ').trim();
  return txt.length;
};

// Durée auto d'une page du format long = TEMPS DE LECTURE, dérivé du volume de
// texte (caractères). hold_s explicite par page = override total (prime).
export const computePageHoldSec = (page) => {
  if (page && page.hold_s != null) return page.hold_s;
  const auto = pageCharCount(page) / PAGE_CHARS_PER_SEC;
  return Math.min(PAGE_MAX_SEC, Math.max(PAGE_MIN_SEC, auto));
};

// Durées (hold) de chaque page, dans l'ordre. Utilisé par le séquençage Remotion
// (chaque page occupe sa fenêtre [start, start+hold]) et par computeDurationSec.
export const computePageHolds = (spec) =>
  (spec.pages ?? []).map((p) => computePageHoldSec(p));

export const computeDurationSec = (spec) => {
  if (spec.duration_s != null) return spec.duration_s;
  // FORMAT LONG (paging) : somme des durées de page.
  if (spec.layout === 'long') {
    const holds = computePageHolds(spec);
    const total = holds.reduce((a, b) => a + b, 0);
    return total > 0 ? total : PAGE_MIN_SEC;
  }
  // FORMAT COURT (inchangé).
  const n = (spec.segments ?? []).length;
  if (spec.reveal === 'staggered') {
    return STAGGER_LEAD_IN_SEC + STAGGER_GAP_SEC * Math.max(0, n - 1) + FADE_SEC + STAGGER_TAIL_SEC;
  }
  return ALL_AT_ONCE_DELAY_SEC + FADE_SEC + ALL_AT_ONCE_TAIL_SEC;
};
