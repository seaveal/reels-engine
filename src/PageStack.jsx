import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { PAGE_FADE_SEC, FPS } from './constants.js';
import { SegmentLine } from './SegmentLine.jsx';
import { computeAutoFitFontSize } from './autoFit.js';

// Format LONG : une page dense de corps narratif. Lignes serrées (pas de gros gap
// inter-bloc comme le court) — on modélise la page comme UN bloc de N lignes pour
// l'auto-fit, avec un gap inter-ligne resserré.
const PAGE_LINE_GAP_EM = 0.28;

/**
 * Rend UNE page du format long : bloc centré H+V dans la safe box, auto-fit sur
 * la page entière, fade in d'un coup (paging). La page est statique ensuite ;
 * son retrait (replace) est géré par le séquençage parent (fenêtre Remotion).
 *
 * props.page = { id, lines: [{ text, bold, kind }] }  (déjà normalisé)
 */
export const PageStack = ({ page, safe }) => {
  const fontSize = useMemo(
    () => computeAutoFitFontSize({
      // 1 seul "segment" = toutes les lignes de la page, gap inter-ligne resserré,
      // aucun gap inter-bloc (block gap 0).
      segments: [{ lines: page.lines }],
      maxWidth: safe.width,
      maxHeight: safe.height,
      blockGapEm: 0,
      lineGapEm: PAGE_LINE_GAP_EM,
    }),
    [page.lines, safe.width, safe.height],
  );

  const frame = useCurrentFrame();
  const fadeFrames = PAGE_FADE_SEC * FPS;
  const opacity = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: safe.x,
        top: safe.y,
        width: safe.width,
        height: safe.height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${PAGE_LINE_GAP_EM * fontSize}px`,
        opacity,
      }}
    >
      {page.lines.map((line, li) => (
        <SegmentLine key={li} {...line} fontSize={fontSize} />
      ))}
    </div>
  );
};
