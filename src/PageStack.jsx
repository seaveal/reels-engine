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

// Bande réservée à la flèche « → » de bas de page (svg + padding) en fraction de
// la safe height. Quand arrow=true, on retire cette bande de la hauteur d'auto-fit
// ET de la zone texte : la flèche se pose dans la bande, le texte au-dessus —
// AUCUN des deux ne déborde la safe box (sinon, sur une page dense, marginTop:auto
// poussait la flèche SOUS la safe box, vers la légende IG). SAFE bottom préservé.
const PAGE_ARROW_BAND_RATIO = 0.085;

/**
 * Rend UNE page du format long : bloc aligné en HAUT de la safe box (les
 * originaux posent le texte sous le handle et le laissent descendre — top, pas
 * center), auto-fit sur la page entière (taille de base), fade in d'un coup
 * (paging). Chaque paragraphe honore son `align` et son `sizeMul`.
 *
 * props.page = { id, lines: [{ text, bold, kind, sizeMul, align }], arrow }
 */
export const PageStack = ({ page, safe }) => {
  // Quand la page porte une flèche, on réserve une bande en bas (dans la safe box)
  // pour elle, et le texte s'auto-fit dans la hauteur restante. Garantit que ni le
  // texte ni la flèche ne franchissent SAFE bottom (zone légende/icônes IG basses).
  const arrowBand = page.arrow ? Math.round(safe.height * PAGE_ARROW_BAND_RATIO) : 0;
  const textHeight = safe.height - arrowBand;

  const fontSize = useMemo(
    () => computeAutoFitFontSize({
      // 1 seul "segment" = tous les paragraphes ; gap inter-paragraphe via
      // blockGapEm ? non : ici chaque paragraphe est une "line" -> on utilise
      // lineGapEm comme gap inter-paragraphe et blockGapEm 0 (1 seul segment).
      segments: [{ lines: page.lines }],
      maxWidth: safe.width,
      maxHeight: textHeight,
      blockGapEm: 0,
      lineGapEm: PAGE_PARA_GAP_EM,
      stripFn: stripInline,
    }),
    [page.lines, safe.width, textHeight],
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
        opacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          gap: `${PAGE_PARA_GAP_EM * fontSize}px`,
          height: textHeight,
        }}
      >
        {page.lines.map((line, li) => (
          <SegmentLine
            key={li}
            text={line.text}
            bold={line.bold}
            kind={line.kind}
            align={line.align}
            color={line.color}
            fontSize={fontSize * (line.sizeMul ?? 1)}
          />
        ))}
      </div>
      {page.arrow && (
        <div
          style={{
            height: arrowBand,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PageArrow color="#F9E9DB" />
        </div>
      )}
    </div>
  );
};
