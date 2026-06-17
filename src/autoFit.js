import { measureText } from '@remotion/layout-utils';
import { FONT_FAMILY } from './constants.js';
import { stripHighlights } from './highlight.js';

const LINE_HEIGHT = 1.08;

/**
 * Wrap manuel mot-à-mot avec mesure synchrone (canvas via @remotion/layout-utils).
 * Retourne le nombre de lignes visuelles et la hauteur du bloc.
 *
 * letterSpacingEm (v4) : tracking en em. Le canvas measureText n'intègre PAS le
 * letter-spacing CSS → on l'ajoute manuellement (≈ letterSpacingEm*fontSize par
 * intervalle entre glyphes) pour que le wrap reste correct quand le paragraphe est
 * espacé. Conservateur : utilise la longueur de la chaîne d'essai.
 */
const wrapAndMeasure = ({ text, fontSize, fontWeight, fontFamily, maxWidth, letterSpacingEm = 0 }) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: 0, height: 0 };
  const lsPx = letterSpacingEm * fontSize;
  const widthOf = (s) => {
    const m = measureText({ text: s, fontFamily, fontWeight, fontSize });
    // letter-spacing s'applique entre chaque paire de glyphes (n-1 intervalles).
    return m.width + (lsPx !== 0 ? Math.max(0, s.length - 1) * lsPx : 0);
  };
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (!cur || widthOf(trial) <= maxWidth) {
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
 * lineGapEm  : espace inter-lines (heading + body même segment) — défaut si pas de
 *              perLineGapEm pour la ligne.
 * perLineGapEm : (v4, format long) tableau parallèle à `segments` ; perLineGapEm[si][li]
 *              = gap APRÈS la ligne li du segment si, en em de fs. Quand fourni pour
 *              une ligne, il PRIME sur lineGapEm → gaps inter-paragraphe VARIABLES
 *              (space_after par paragraphe). Le rendu (PageStack margin-bottom) et
 *              l'auto-fit utilisent EXACTEMENT le même tableau → fit exact.
 * stripFn    : fonction de retrait du markup avant mesure. Défaut stripHighlights
 *              (format court : ne connaît que [[ ]]). Le format long passe
 *              stripInline (retire aussi **gras**).
 *
 * Chaque ligne peut porter `sizeMul` (défaut 1) : sa taille effective = fs*sizeMul,
 * et `letterSpacing` (em) intégré à la mesure de largeur (wrap correct).
 * fs (= taille de base de la pile) reste la grandeur recherchée par la recherche.
 */
export const computeAutoFitFontSize = ({
  segments,
  maxWidth,
  maxHeight,
  blockGapEm = 0.55,
  lineGapEm = 0.15,
  perLineGapEm = null,
  fontFamily = FONT_FAMILY,
  minSize = 16,
  // maxSize 180 (était 220) : empêche le titre court de devenir disproportionné
  // par rapport aux corps. Référence : sur quand-il-est-seul.json, le titre
  // tenait à ~210 px (3 lignes) alors que la ref est plus modeste.
  maxSize = 180,
  stripFn = stripHighlights,
}) => {
  const totalHeight = (fs) => {
    let H = 0;
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      for (let li = 0; li < seg.lines.length; li++) {
        const line = seg.lines[li];
        const text = stripFn(line.text);
        const lineFs = fs * (line.sizeMul ?? 1);
        const m = wrapAndMeasure({
          text,
          fontSize: lineFs,
          fontWeight: line.bold ? 700 : 400,
          fontFamily,
          maxWidth,
          letterSpacingEm: line.letterSpacing != null ? line.letterSpacing : 0,
        });
        H += m.height;
        if (li < seg.lines.length - 1) {
          const perGap = perLineGapEm && perLineGapEm[si] && perLineGapEm[si][li] != null
            ? perLineGapEm[si][li]
            : lineGapEm;
          H += fs * perGap;
        }
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
