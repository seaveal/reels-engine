import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { PAGE_FADE_SEC, FPS } from './constants.js';
import { SegmentLine } from './SegmentLine.jsx';
import { PageArrow } from './PageArrow.jsx';
import { computeAutoFitFontSize } from './autoFit.js';
import { stripInline } from './highlight.js';

// Format LONG : page dense de corps narratif. Chaque "line" du JSON = un
// paragraphe (qui peut wrapper sur plusieurs lignes visuelles). On modélise la
// page comme UN bloc de N paragraphes pour l'auto-fit, avec :
//  - un gap INTER-PARAGRAPHE (entre deux entrées `lines`) = l'aération observée
//    sur les originaux (saut de ligne entre blocs),
//  - le wrap interne d'un paragraphe géré par line-height (pas de gap ajouté).
const PAGE_PARA_GAP_EM = 0.55;

/**
 * Rend UNE page du format long : bloc aligné en HAUT de la safe box (les
 * originaux posent le texte sous le handle et le laissent descendre — top, pas
 * center), auto-fit sur la page entière (taille de base), fade in d'un coup
 * (paging). Chaque paragraphe honore son `align` et son `sizeMul`.
 *
 * props.page = { id, lines: [{ text, bold, kind, sizeMul, align }], arrow }
 */
export const PageStack = ({ page, safe }) => {
  const fontSize = useMemo(
    () => computeAutoFitFontSize({
      // 1 seul "segment" = tous les paragraphes ; gap inter-paragraphe via
      // blockGapEm ? non : ici chaque paragraphe est une "line" -> on utilise
      // lineGapEm comme gap inter-paragraphe et blockGapEm 0 (1 seul segment).
      segments: [{ lines: page.lines }],
      maxWidth: safe.width,
      maxHeight: safe.height,
      blockGapEm: 0,
      lineGapEm: PAGE_PARA_GAP_EM,
      stripFn: stripInline,
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
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: `${PAGE_PARA_GAP_EM * fontSize}px`,
        opacity,
      }}
    >
      {page.lines.map((line, li) => (
        <SegmentLine
          key={li}
          text={line.text}
          bold={line.bold}
          kind={line.kind}
          align={line.align}
          fontSize={fontSize * (line.sizeMul ?? 1)}
        />
      ))}
      {page.arrow && <PageArrow color="#F9E9DB" />}
    </div>
  );
};
