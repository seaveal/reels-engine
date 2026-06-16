export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export const COLORS = {
  yellow: '#FFFF00',
  white: '#FFFFFF',
  black: '#000000',
};

// Safe zone tunée 2026-05-23 sur références réelles :
// - top 0.17 (était 0.12) : passe sous le handle "@lecorpsnetrichejamais"
//   incrusté dans le fond noir-nuages.mp4 (sinon chevauchement titre/handle).
// - bottom 0.22 : conserve l'espace au-dessus de la légende IG + icônes.
// - left/right 0.10 : marges H symétriques, largeur utile 80 %.
export const SAFE = {
  left: 0.10,
  right: 0.10,
  top: 0.17,
  bottom: 0.22,
};

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
// Durée auto d'affichage d'une page = clamp(BASE + lignes*PER_LINE, MIN, MAX).
// Calibré sur les timelines des réels longs (~20 s pour ~14 lignes denses).
export const PAGE_BASE_SEC = 4;
export const PAGE_PER_LINE_SEC = 1.15;
export const PAGE_MIN_SEC = 6;
export const PAGE_MAX_SEC = 24;

export const safeBox = (width, height) => ({
  x: Math.round(SAFE.left * width),
  y: Math.round(SAFE.top * height),
  width: Math.round(width * (1 - SAFE.left - SAFE.right)),
  height: Math.round(height * (1 - SAFE.top - SAFE.bottom)),
});

// Durée auto d'une page du format long, fonction du nombre de lignes affichées.
export const computePageHoldSec = (page) => {
  if (page && page.hold_s != null) return page.hold_s;
  const n = (page && page.lines ? page.lines.length : 0);
  const auto = PAGE_BASE_SEC + n * PAGE_PER_LINE_SEC;
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
