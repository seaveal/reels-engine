import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { FONT_FAMILY, COLORS } from './constants.js';
import { parseInline } from './highlight.js';
import { ProfileBadge } from './ProfileBadge.jsx';

// Slide de CARROUSEL Instagram (chantier 3 système contenu v2, 2026-07-04).
// Format portrait 1080×1350 (4:5, le ratio feed au meilleur reach). Même DA que la
// Carte (spike renderStill 2026-07-04 : la charte terracotta tient le 4:5) : fond
// terracotta marque, punchline Oswald blanche centrée, mots [[surlignés]] en crème.
// S'y ajoutent : numérotation discrète « N/T » (repère de swipe) et pastille avatar
// UNIQUEMENT sur la première et la dernière slide (signature d'entrée/sortie,
// mission chantier 3 — les slides intermédiaires restent pleine lecture).
const OSWALD_FONT_FACE = `
@font-face { font-family: 'Oswald'; font-weight: 400; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Regular.ttf'))}) format('truetype'); }
@font-face { font-family: 'Oswald'; font-weight: 700; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Bold.ttf'))}) format('truetype'); }
`;

// Couleur de marque — miroir du token --h3c-accent-terracotta (#A8432B), comme Carte.jsx.
const TERRACOTTA = '#A8432B';

// Auto-fit par paliers (pattern Carte.jsx) recalibré pour 1080×1350 : ~25 % de
// hauteur en plus que le carré → paliers légèrement plus généreux. Gate amont :
// ≤ 280 caractères par slide (studio_carrousel), donc le dernier palier est le sol.
const fontSizeFor = (chars) => {
  if (chars <= 55) return 112;
  if (chars <= 95) return 94;
  if (chars <= 150) return 76;
  if (chars <= 230) return 62;
  return 52;
};

export const Slide = ({
  text = 'EXEMPLE DE [[SLIDE]]',
  index = 1,          // 1-based
  total = 8,
  badge = true,       // pastille avatar (slide 1 + dernière)
  handle = '@CyrilleNovou',
}) => {
  const raw = String(text || '');
  const stripped = raw.replace(/\[\[([^\]]+)\]\]/g, '$1');
  const fontSize = fontSizeFor(stripped.length);
  const pieces = parseInline(raw);
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: TERRACOTTA }}>
      <style>{OSWALD_FONT_FACE}</style>
      {badge && <ProfileBadge width={width} height={height} ring={COLORS.cream} gapColor={TERRACOTTA} />}
      {/* liseré haut discret (accent marque, comme la Carte) */}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
        width: 84, height: 6, borderRadius: 3, backgroundColor: COLORS.cream, opacity: 0.85 }} />
      {/* punchline centrée — la safe box laisse la place au pied (handle + numérotation) */}
      <AbsoluteFill style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '150px 116px 190px',
      }}>
        <div style={{
          fontFamily: FONT_FAMILY, fontWeight: 700, fontSize, lineHeight: 1.12,
          color: COLORS.white, textAlign: 'center', textTransform: 'uppercase',
          letterSpacing: '-0.01em', width: '100%', wordBreak: 'break-word',
        }}>
          {pieces.map((p, i) => (
            <span key={i} style={{ color: p.yellow ? COLORS.cream : COLORS.white }}>{p.text}</span>
          ))}
        </div>
      </AbsoluteFill>
      {/* handle en pied (signature, comme la Carte) */}
      <div style={{ position: 'absolute', bottom: 72, left: 0, right: 0, textAlign: 'center',
        fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 30, letterSpacing: '0.06em',
        color: COLORS.cream, opacity: 0.92 }}>
        {handle}
      </div>
      {/* numérotation discrète N/T — bas droit, repère de swipe */}
      <div style={{ position: 'absolute', bottom: 72, right: 64, textAlign: 'right',
        fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 28, letterSpacing: '0.08em',
        color: COLORS.cream, opacity: 0.65 }}>
        {index}/{total}
      </div>
    </AbsoluteFill>
  );
};
