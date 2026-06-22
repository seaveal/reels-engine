import { interpolate, useCurrentFrame } from 'remotion';
import { FPS, FADE_SEC, COLORS } from './constants.js';

// « LISEZ LA LÉGENDE » : petit footer (jamais la taille du corps) + LONGUE flèche
// dessinée à la main qui DESCEND depuis le footer jusqu'au point de tap de la
// légende IG (bas-GAUCHE, « … plus »), pas vers le centre. La flèche se dessine
// progressivement (stroke draw) puis sa pointe apparaît — « comme pour appuyer
// pour avoir la suite ». `target` = point de tap en px ABSOLUS (frame entière).
export const LegendCta = ({ text, zone, target, startSec = 0.6 }) => {
  const frame = useCurrentFrame();
  const start = startSec * FPS;
  const opacity = interpolate(frame - start, [0, FADE_SEC * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fs = Math.max(24, Math.min(40, Math.round(zone.width * 0.062)));
  const footerH = Math.round(fs * 1.5);

  // Tout en coords LOCALES à la zone (le svg couvre toute la zone).
  const W = zone.width;
  const H = zone.height;
  // Cible (point de tap légende) convertie en local. Fallback : bas-gauche.
  const tx = target ? target.x - zone.x : Math.round(W * 0.10);
  const ty = target ? target.y - zone.y : Math.round(H - 20);
  // Départ de la flèche : juste sous le footer, légèrement à droite du centre
  // (le footer est centré) → le tracé balaie ensuite vers le bas-GAUCHE.
  const sx = Math.round(W * 0.56);
  const sy = footerH + 16;

  const dx = tx - sx; // négatif (vers la gauche)
  const dy = ty - sy; // positif (vers le bas)
  // Courbe manuscrite : léger bombé à droite au départ puis plongée vers le bas-gauche.
  const c1x = sx + dx * 0.12 + W * 0.06;
  const c1y = sy + dy * 0.30;
  const c2x = sx + dx * 0.62 - W * 0.02;
  const c2y = sy + dy * 0.74;
  const d = `M ${sx} ${sy} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${tx} ${ty}`;

  // Pointe orientée dans le sens du tracé (du dernier point de contrôle vers la cible).
  const ang = Math.atan2(ty - c2y, tx - c2x);
  const L = 30;
  const b1x = tx - L * Math.cos(ang - 0.45);
  const b1y = ty - L * Math.sin(ang - 0.45);
  const b2x = tx - L * Math.cos(ang + 0.45);
  const b2y = ty - L * Math.sin(ang + 0.45);
  const head = `M ${b1x.toFixed(1)} ${b1y.toFixed(1)} L ${tx} ${ty} L ${b2x.toFixed(1)} ${b2y.toFixed(1)}`;

  // La flèche se dessine juste après le footer, sur ~1,0 s (pathLength=1 → offset 1→0).
  const drawStart = start + FADE_SEC * FPS;
  const dashoffset = interpolate(frame - drawStart, [0, 1.0 * FPS], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headOpacity = interpolate(frame - drawStart, [0.9 * FPS, 1.05 * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', left: zone.x, top: zone.y, width: W, height: H, opacity }}>
      {/* Footer « LISEZ LA LÉGENDE » — petit, centré, en haut de la zone */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: W,
          height: footerH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
      {/* Flèche manuscrite plein-zone, vers le bas-GAUCHE (tap légende IG) */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
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
        <path
          d={head}
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
