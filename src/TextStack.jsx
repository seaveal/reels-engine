import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FADE_SEC, FPS, STAGGER_GAP_SEC, STAGGER_LEAD_IN_SEC, ALL_AT_ONCE_DELAY_SEC } from './constants.js';
import { SegmentLine } from './SegmentLine.jsx';
import { computeAutoFitFontSize } from './autoFit.js';

const BLOCK_GAP_EM = 0.55;
const LINE_GAP_EM = 0.15;

/**
 * Pile centrée H+V dans la safe box. Auto-fit calculé sur la pile complète
 * (la fontSize ne bouge JAMAIS pendant le réel, même en staggered — seul le
 * sous-ensemble visible bouge, et le re-centrage vertical est assuré par
 * `justifyContent: center` du flex column).
 */
export const TextStack = ({ segments, reveal, safe }) => {
  const fontSize = useMemo(
    () => computeAutoFitFontSize({
      segments,
      maxWidth: safe.width,
      // On retire l'équivalent des gaps inter-segments pour laisser de la marge
      // visuelle (sinon le texte touche les bords de la safe box).
      maxHeight: safe.height,
      blockGapEm: BLOCK_GAP_EM,
      lineGapEm: LINE_GAP_EM,
    }),
    [segments, safe.width, safe.height],
  );

  const frame = useCurrentFrame();
  const fadeFrames = FADE_SEC * FPS;

  const opacityOf = (i) => {
    if (reveal === 'all_at_once') {
      const start = ALL_AT_ONCE_DELAY_SEC * FPS;
      return interpolate(frame - start, [0, fadeFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
    const start = (STAGGER_LEAD_IN_SEC + i * STAGGER_GAP_SEC) * FPS;
    return interpolate(frame - start, [0, fadeFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

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
        gap: `${BLOCK_GAP_EM * fontSize}px`,
      }}
    >
      {segments.map((seg, i) => {
        const op = opacityOf(i);
        // staggered : avant le démarrage du segment, on ne prend pas de place
        // dans le flex column → re-centrage vertical automatique de la pile
        // restante (assure le comportement "la pile se re-centre à chaque ajout").
        const display = reveal === 'staggered' && op === 0 ? 'none' : 'flex';
        return (
          <div
            key={seg.id}
            style={{
              display,
              flexDirection: 'column',
              alignItems: 'center',
              gap: `${LINE_GAP_EM * fontSize}px`,
              width: '100%',
              opacity: op,
            }}
          >
            {seg.lines.map((line, li) => (
              <SegmentLine key={li} {...line} fontSize={fontSize} />
            ))}
          </div>
        );
      })}
    </div>
  );
};
