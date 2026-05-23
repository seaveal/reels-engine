import { interpolate, useCurrentFrame } from 'remotion';
import { FADE_SEC, FPS } from './constants.js';

/**
 * Emoji 👆 main pointant vers le CTA. Apparition en fondu après le dernier
 * segment. Centré dans la bande réservée en bas de la safe box (cf. Reel.jsx,
 * HAND_BAND_RATIO).
 */
export const HandEmoji = ({ zone, startFrame }) => {
  const frame = useCurrentFrame();
  const fadeFrames = FADE_SEC * FPS;
  const opacity = interpolate(frame - startFrame, [0, fadeFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // L'emoji prend ~80% de la hauteur de sa bande, centré horizontalement.
  const size = Math.round(zone.height * 0.8);
  return (
    <div
      style={{
        position: 'absolute',
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size,
        lineHeight: 1,
        opacity,
        userSelect: 'none',
      }}
    >
      👆
    </div>
  );
};
