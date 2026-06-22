import { interpolate, useCurrentFrame } from 'remotion';
import { FPS, FADE_SEC, COLORS } from './constants.js';

// « LISEZ LA LÉGENDE » : PETIT footer (jamais la taille du corps) + flèche cursive
// dessinée à la main qui BOUCLE puis pointe vers le BAS-GAUCHE (vers la légende IG,
// sous la vidéo). Élément signature des hooks originaux. La flèche se DESSINE
// progressivement (stroke draw) après l'apparition du footer.
const ARROW_LEN = 165; // longueur approx. du tracé (pour l'animation de dessin)

export const LegendCta = ({ text, zone, startSec = 0.6 }) => {
  const frame = useCurrentFrame();
  const start = startSec * FPS;
  const opacity = interpolate(frame - start, [0, FADE_SEC * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // La flèche se dessine juste après le footer.
  const drawStart = start + FADE_SEC * FPS;
  const dashoffset = interpolate(frame - drawStart, [0, 0.55 * FPS], [ARROW_LEN, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fs = Math.max(24, Math.min(40, Math.round(zone.width * 0.062)));
  return (
    <div
      style={{
        position: 'absolute',
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: 'Oswald',
          fontWeight: 600,
          fontSize: fs,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: COLORS.cream,
          textAlign: 'center',
          lineHeight: 1.15,
          opacity: 0.95,
        }}
      >
        {text}
      </div>
      <svg width="84" height="62" viewBox="0 0 96 70" fill="none" style={{ marginTop: 14, display: 'block' }}>
        {/* boucle cursive puis tracé qui plonge vers le bas-gauche, dessiné à la main */}
        <path
          d="M58 10 C 80 14, 78 42, 52 39 C 34 36, 40 16, 58 22 C 68 25, 63 36, 46 48 L 30 58"
          stroke={COLORS.cream}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={ARROW_LEN}
          strokeDashoffset={dashoffset}
        />
        {/* pointe (barbes) au bout bas-gauche, vers la légende */}
        <path
          d="M44 57 L 30 58 L 36 45"
          stroke={COLORS.cream}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={interpolate(frame - drawStart, [0.5 * FPS, 0.62 * FPS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      </svg>
    </div>
  );
};
