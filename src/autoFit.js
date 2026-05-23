import { measureText } from '@remotion/layout-utils';
import { FONT_FAMILY } from './constants.js';
import { stripHighlights } from './highlight.js';

const LINE_HEIGHT = 1.08;

/**
 * Wrap manuel mot-à-mot avec mesure synchrone (canvas via @remotion/layout-utils).
 * Retourne le nombre de lignes visuelles et la hauteur du bloc.
 */
const wrapAndMeasure = ({ text, fontSize, fontWeight, fontFamily, maxWidth }) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: 0, height: 0 };
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    const m = measureText({ text: trial, fontFamily, fontWeight, fontSize });
    if (!cur || m.width <= maxWidth) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return { lines: lines.length, height: lines.length * fontSize * LINE_HEIGHT };
};

/**
 * Auto-fit synchrone : binary search sur fontSize jusqu'à ce que la pile
 * complète (tous segments + gaps inter-segments et inter-lines) rentre dans
 * (maxWidth, maxHeight). Retourne la fontSize entière maximale qui tient.
 *
 * blockGapEm : espace inter-segments en fraction de fontSize.
 * lineGapEm  : espace inter-lines (heading + body même segment).
 */
export const computeAutoFitFontSize = ({
  segments,
  maxWidth,
  maxHeight,
  blockGapEm = 0.55,
  lineGapEm = 0.15,
  fontFamily = FONT_FAMILY,
  minSize = 16,
  // maxSize 180 (était 220) : empêche le titre court de devenir disproportionné
  // par rapport aux corps. Référence : sur quand-il-est-seul.json, le titre
  // tenait à ~210 px (3 lignes) alors que la ref est plus modeste.
  maxSize = 180,
}) => {
  const totalHeight = (fs) => {
    let H = 0;
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      for (let li = 0; li < seg.lines.length; li++) {
        const line = seg.lines[li];
        const text = stripHighlights(line.text);
        const m = wrapAndMeasure({
          text,
          fontSize: fs,
          fontWeight: line.bold ? 700 : 400,
          fontFamily,
          maxWidth,
        });
        H += m.height;
        if (li < seg.lines.length - 1) H += fs * lineGapEm;
      }
      if (si < segments.length - 1) H += fs * blockGapEm;
    }
    return H;
  };

  if (totalHeight(maxSize) <= maxHeight) return maxSize;

  let lo = minSize;
  let hi = maxSize;
  for (let i = 0; i < 22; i++) {
    const fs = (lo + hi) / 2;
    if (totalHeight(fs) <= maxHeight) lo = fs; else hi = fs;
  }
  return Math.floor(lo);
};
