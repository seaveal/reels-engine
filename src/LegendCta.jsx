import { interpolate, useCurrentFrame } from 'remotion';
import { FPS, FADE_SEC, COLORS } from './constants.js';

// « LISEZ LA LÉGENDE » : petit footer (jamais la taille du corps) + LONGUE flèche
// dessinée à la main qui DESCEND depuis le footer jusqu'en bas du cadre, vers la
// légende IG (sous la vidéo). La flèche se dessine progressivement (stroke draw)
// puis sa pointe apparaît — « comme pour appuyer pour avoir la suite ».
// Élément signature des hooks originaux.

export const LegendCta = ({ text, zone, startSec = 0.6 }) => {
  const frame = useCurrentFrame();
  const start = startSec * FPS;
  const opacity = interpolate(frame - start, [0, FADE_SEC * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fs = Math.max(24, Math.min(40, Math.round(zone.width * 0.062)));
  // Hauteur réservée au footer (texte) ; le reste de la zone est pour la flèche.
  const footerH = Math.round(fs * 1.5);
  const arrowH = Math.max(120, zone.height - footerH);
  const W = zone.width;

  // Tracé en pixels réels, centré horizontalement, qui PLONGE du haut (sous le
  // footer) jusqu'au bas (vers la légende), avec une ondulation manuscrite.
  const cx = W / 2;
  const topY = 6;
  const botY = arrowH - 22; // on garde la place pour la pointe
  // Légère sinuosité gauche/droite pour l'effet « tracé main ».
  const a1x = cx + W * 0.10, a1y = topY + (botY - topY) * 0.28;
  const a2x = cx - W * 0.12, a2y = topY + (botY - topY) * 0.58;
  const a3x = cx + W * 0.04, a3y = topY + (botY - topY) * 0.82;
  const endX = cx, endY = botY;
  const d = `M ${cx} ${topY} C ${a1x} ${a1y}, ${a1x} ${a1y + 30}, ${a2x} ${a2y} `
    + `S ${a3x} ${a3y}, ${endX} ${endY}`;

  // La flèche se dessine juste après le footer, sur ~0.9 s (pathLength=1 → offset 1→0).
  const drawStart = start + FADE_SEC * FPS;
  const dashoffset = interpolate(frame - drawStart, [0, 0.9 * FPS], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // La pointe (barbes) apparaît quand le tracé atteint le bas.
  const headOpacity = interpolate(frame - drawStart, [0.82 * FPS, 0.98 * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
          height: footerH,
          display: 'flex',
          alignItems: 'center',
          opacity: 0.95,
        }}
      >
        {text}
      </div>
      <svg width={W} height={arrowH} viewBox={`0 0 ${W} ${arrowH}`} fill="none" style={{ display: 'block' }}>
        <path
          d={d}
          stroke={COLORS.cream}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={dashoffset}
        />
        {/* pointe vers le bas (vers la légende) */}
        <path
          d={`M ${endX - 16} ${endY - 16} L ${endX} ${endY + 4} L ${endX + 16} ${endY - 16}`}
          stroke={COLORS.cream}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={headOpacity}
        />
      </svg>
    </div>
  );
};
