import { COLORS, FONT_FAMILY } from './constants.js';
import { parseHighlights } from './highlight.js';

/**
 * Une "line" de segment (bloc rendu d'un coup, peut être wrappée en plusieurs
 * lignes visuelles selon la largeur disponible).
 *
 * Le style typographique vient de la prop `kind` (title|heading|body|cta|block)
 * et `bold`. La taille de police est appliquée par le parent (auto-fit).
 *
 * Casse : title/heading reçoivent text-transform: uppercase (la mission l'impose,
 * et le JSON est censé déjà être en CAPITALES mais on garantit).
 */
export const SegmentLine = ({ text, bold, kind, fontSize }) => {
  const pieces = parseHighlights(text);
  const isUpper = kind === 'title' || kind === 'heading' || kind === 'cta';
  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontWeight: bold ? 700 : 400,
        fontSize,
        color: COLORS.white,
        lineHeight: 1.08,
        textAlign: 'center',
        textTransform: isUpper ? 'uppercase' : 'none',
        letterSpacing: kind === 'title' ? '-0.005em' : 0,
        wordBreak: 'break-word',
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ color: p.highlight ? COLORS.yellow : COLORS.white }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
};
