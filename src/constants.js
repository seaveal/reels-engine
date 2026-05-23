export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export const COLORS = {
  yellow: '#FFFF00',
  white: '#FFFFFF',
  black: '#000000',
};

export const SAFE = {
  left: 0.10,
  right: 0.10,
  top: 0.12,
  bottom: 0.22,
};

export const BACKGROUND_DURATION_SEC = 29;
export const BACKGROUND_DURATION_FRAMES = Math.round(BACKGROUND_DURATION_SEC * FPS);

export const FONT_FAMILY = 'Oswald';

export const FADE_SEC = 0.4;
export const STAGGER_GAP_SEC = 0.9;
export const STAGGER_LEAD_IN_SEC = 0.3;
export const ALL_AT_ONCE_DELAY_SEC = 0.3;
export const ALL_AT_ONCE_TAIL_SEC = 2.5;
export const HAND_EMOJI_DELAY_AFTER_LAST_SEC = 0.4;

export const safeBox = (width, height) => ({
  x: Math.round(SAFE.left * width),
  y: Math.round(SAFE.top * height),
  width: Math.round(width * (1 - SAFE.left - SAFE.right)),
  height: Math.round(height * (1 - SAFE.top - SAFE.bottom)),
});

export const computeDurationSec = (spec) => {
  if (spec.duration_s != null) return spec.duration_s;
  const n = (spec.segments ?? []).length;
  if (spec.reveal === 'staggered') {
    return STAGGER_LEAD_IN_SEC + STAGGER_GAP_SEC * Math.max(0, n - 1) + FADE_SEC + 2.5;
  }
  return ALL_AT_ONCE_DELAY_SEC + FADE_SEC + ALL_AT_ONCE_TAIL_SEC;
};
