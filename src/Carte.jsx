import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { FONT_FAMILY, COLORS } from './constants.js';
import { parseInline } from './highlight.js';
import { ProfileBadge } from './ProfileBadge.jsx';

// Carte illustrative pour articles FB/Circle (ADR Cyrille 2026-06-21 : « 3 images
// qui illustrent l'article », forme = cartes texte Remotion). Format carré
// 1080×1080 (universel FB feed + Circle). Fond terracotta marque (#A8432B),
// punchline centrée Oswald blanche, mots [[surlignés]] en crème, handle en pied.
//
// Police Oswald embarquée localement (public/fonts) — même @font-face que Reel.jsx
// (pas de dépendance réseau au render).
const OSWALD_FONT_FACE = `
@font-face { font-family: 'Oswald'; font-weight: 400; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Regular.ttf'))}) format('truetype'); }
@font-face { font-family: 'Oswald'; font-weight: 700; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Bold.ttf'))}) format('truetype'); }
`;

// Couleur de marque (terracotta) — miroir du token --h3c-accent-terracotta (#A8432B,
// aligné Livre H3C « L'Écho Incarné » 2026-06-21). Remotion ne lit pas le CSS du repo Test.
const TERRACOTTA = '#A8432B';

// Taille de police dérivée du volume de texte (auto-fit simple, robuste, sans
// mesure). Le texte est centré et wrappé dans la safe box ; ces paliers tiennent
// dans 1080×1080 avec marge ~11 %.
const fontSizeFor = (chars) => {
  if (chars <= 55) return 104;
  if (chars <= 95) return 86;
  if (chars <= 150) return 70;
  if (chars <= 230) return 56;
  return 46;
};

export const Carte = ({ text = 'EXEMPLE DE [[CARTE]]', handle = '@CyrilleNovou', footer = '' }) => {
  const raw = String(text || '');
  const stripped = raw.replace(/\[\[([^\]]+)\]\]/g, '$1');
  const fontSize = fontSizeFor(stripped.length);
  const pieces = parseInline(raw);
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: TERRACOTTA }}>
      <style>{OSWALD_FONT_FACE}</style>
      {/* Pastille harmonisée charte carte : anneau crème, liseré terracotta (fond). */}
      <ProfileBadge width={width} height={height} ring={COLORS.cream} gapColor={TERRACOTTA} />
      {/* liseré haut discret (accent marque) */}
      <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
        width: 84, height: 6, borderRadius: 3, backgroundColor: COLORS.cream, opacity: 0.85 }} />
      {/* punchline centrée */}
      <AbsoluteFill style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: footer ? '120px 116px 230px' : '120px 116px 150px',
      }}>
        <div style={{
          fontFamily: FONT_FAMILY, fontWeight: 700, fontSize, lineHeight: 1.1,
          color: COLORS.white, textAlign: 'center', textTransform: 'uppercase',
          letterSpacing: '-0.01em', width: '100%', wordBreak: 'break-word',
          // Un « \n » dans le texte = un saut de ligne voulu (respiration, impact) ; les cartes
          // sans « \n » ne changent pas (studio de pub, corrections Cyrille 2026-08-17).
          whiteSpace: 'pre-line',
        }}>
          {pieces.map((p, i) => (
            <span key={i} style={{ color: p.yellow ? COLORS.cream : COLORS.white }}>{p.text}</span>
          ))}
        </div>
      </AbsoluteFill>
      {/* pied « objet + prix » (statiques PUB 4:5, studio de pub 2026-08-16 — R-PUB-3 : la pub nomme
          l'objet vendu et son prix). Vide par défaut : les cartes FB/Circle ne changent pas. */}
      {footer ? (
        <div style={{ position: 'absolute', bottom: 118, left: 96, right: 96, textAlign: 'center',
          fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 32, lineHeight: 1.25, letterSpacing: '0.02em',
          color: COLORS.cream, opacity: 0.95 }}>
          {String(footer).replace(/ €/g, '\u00a0€')}
        </div>
      ) : null}
      {/* handle en pied */}
      <div style={{ position: 'absolute', bottom: 66, left: 0, right: 0, textAlign: 'center',
        fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 30, letterSpacing: '0.06em',
        color: COLORS.cream, opacity: 0.92 }}>
        {handle}
      </div>
    </AbsoluteFill>
  );
};
