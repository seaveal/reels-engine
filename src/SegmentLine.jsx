import { COLORS, FONT_FAMILY } from './constants.js';
import { parseInline } from './highlight.js';

/**
 * Une "line" rendue (bloc, peut wrapper sur plusieurs lignes visuelles selon la
 * largeur). Style typographique depuis `kind` (title|heading|body|cta|block),
 * `bold` (graisse de base de la ligne) et `align` (alignement).
 *
 * Couleur / graisse PAR MOT : le texte est parsé par `parseInline` :
 *   [[mot]] -> jaune #FFFF00 ; **mot** -> gras ; combinables [[**mot**]].
 * La graisse effective d'un span = base de la ligne (`bold`) OU gras du span.
 * Le `kind:'cta'` colore la ligne en crème #F9E9DB (couleur des CTA originaux),
 * sauf les spans jaunes qui restent jaunes.
 *
 * Casse : title/heading/cta -> uppercase (CAPS, garanti même si JSON déjà capitalisé).
 *
 * `align` défaut 'center' (préserve le rendu du FORMAT COURT inchangé). Le format
 * long passe 'left'/'justify'/'right' explicitement.
 *
 * `color` (format long) = couleur de BASE de la ligne ('white'|'yellow'|'cream').
 * Absent (format court) → dérivée du `kind` (cta=crème, sinon blanc) : rendu COURT
 * inchangé. Les spans jaunes [[mot]] restent jaunes par-dessus toute couleur de base.
 */
const NAMED_COLOR = { white: COLORS.white, yellow: COLORS.yellow, cream: COLORS.cream };

export const SegmentLine = ({ text, bold, kind, fontSize, align = 'center', color }) => {
  const pieces = parseInline(text);
  const isUpper = kind === 'title' || kind === 'heading' || kind === 'cta';
  const baseColor = color != null
    ? (NAMED_COLOR[color] ?? COLORS.white)
    : (kind === 'cta' ? COLORS.cream : COLORS.white);
  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontWeight: bold ? 700 : 400,
        fontSize,
        color: baseColor,
        lineHeight: 1.08,
        textAlign: align,
        textTransform: isUpper ? 'uppercase' : 'none',
        letterSpacing: kind === 'title' ? '-0.005em' : 0,
        wordBreak: 'break-word',
        width: '100%',
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            color: p.yellow ? COLORS.yellow : baseColor,
            fontWeight: (bold || p.bold) ? 700 : 400,
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
};
