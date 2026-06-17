import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { PAGE_FADE_SEC, FPS } from './constants.js';
import { DEFAULT_SPACE_AFTER_EM } from './pages.js';
import { SegmentLine } from './SegmentLine.jsx';
import { PageArrow } from './PageArrow.jsx';
import { computeAutoFitFontSize } from './autoFit.js';
import { stripInline } from './highlight.js';

// Format LONG : page dense de corps narratif. Chaque "line" du JSON = un
// paragraphe (qui peut wrapper sur plusieurs lignes visuelles). On modélise la
// page comme UN bloc de N paragraphes pour l'auto-fit, avec :
//  - un gap INTER-PARAGRAPHE PAR PARAGRAPHE (v4) : chaque paragraphe porte son
//    `spaceAfter` (em) ; null = défaut DEFAULT_SPACE_AFTER_EM. Le dernier paragraphe
//    n'ajoute pas de gap. Permet de resserrer une liste / aérer une punchline,
//    fidèlement aux originaux.
//  - le wrap interne d'un paragraphe géré par line-height (pas de gap ajouté).

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

  // Gap (em) APRÈS chaque paragraphe (sauf le dernier) : space_after explicite ou
  // défaut global. Sert à l'auto-fit (réserve la hauteur) ET au rendu (margin-bottom).
  const gapAfterEm = page.lines.map((line, li) =>
    li === page.lines.length - 1
      ? 0
      : (line.spaceAfter != null ? line.spaceAfter : DEFAULT_SPACE_AFTER_EM),
  );

  const fontSize = useMemo(
    () => computeAutoFitFontSize({
      // 1 seul "segment" = tous les paragraphes ; le gap inter-paragraphe est
      // désormais VARIABLE par paragraphe (gapAfterEm) → passé via perLineGapEm.
      segments: [{ lines: page.lines }],
      maxWidth: safe.width,
      maxHeight: textHeight,
      blockGapEm: 0,
      lineGapEm: DEFAULT_SPACE_AFTER_EM,
      perLineGapEm: [gapAfterEm],
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
            letterSpacing={line.letterSpacing}
            fontSize={fontSize * (line.sizeMul ?? 1)}
            marginBottom={gapAfterEm[li] * fontSize}
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
