import { interpolate, useCurrentFrame } from 'remotion';
import { FPS, FADE_SEC, COLORS } from './constants.js';

// « LISEZ LA LÉGENDE » : PETIT footer (jamais la taille du corps) + flèche dessinée
// à la main qui plonge vers le bas (vers la légende IG, sous la vidéo), animée (rebond).
// Élément signature des hooks originaux. Apparaît en fondu après le dernier bloc.
export const LegendCta = ({ text, zone, startSec = 0.6 }) => {
  const frame = useCurrentFrame();
  const start = startSec * FPS;
  const opacity = interpolate(frame - start, [0, FADE_SEC * FPS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const t = Math.max(0, (frame - start) / FPS);
  const bounce = Math.sin(t * 3.4) * 7; // rebond vertical doux de la flèche
  // taille footer bornée (petit, façon original) — proportionnelle à la largeur.
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
      <svg
        width="132"
        height="54"
        viewBox="0 0 132 54"
        fill="none"
        style={{ marginTop: 10, transform: `translateY(${bounce}px)`, display: 'block' }}
      >
        {/* swoosh dessiné à la main qui plonge vers la légende */}
        <path d="M14 10 C 46 46, 86 46, 118 10" stroke={COLORS.cream} strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* pointe ouverte vers le bas, au centre */}
        <path d="M50 36 C 60 46, 66 50, 66 50 C 66 50, 72 46, 82 36" stroke={COLORS.cream} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
};
