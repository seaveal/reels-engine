import { AbsoluteFill, staticFile } from 'remotion';
import { loadFont as loadLora } from '@remotion/google-fonts/Lora';
import { parseInline } from './highlight.js';

// Couverture de Reel Instagram (still PNG 1080×1920) — charte « L'Écho Incarné »
// (philosophie-echo-incarne.md). Sert de cover_url à la publication, et de
// vignette de grille (croppée 3:4 centré → cœur du message dans la safe-zone).
//
// 3 voix typo : eyebrow linéale (Oswald, déjà embarqué) → hook serif monumental
// (Lora) → signature italique (Lora italic). Rupture chromatique unique : UN seul
// mot du hook en terracotta, marqué [[ainsi]] (même convention que Reel/Carte).
//
// Palette « L'Écho Incarné » (3 voix) : crème papier, encre, terracotta présence.
const CREME = '#F6F2E9';      // fond papier ancien (charte cover)
const ENCRE = '#2B2722';      // encre (titre, signature)
const TERRA = '#A8432B';      // terracotta « sang séché » — accent unique (token canonique)
const TAUPE = '#9C8F7E';      // taupe minéral — eyebrow, échos pâles

// Oswald embarqué localement (eyebrow) — même @font-face que Reel/Carte.
const OSWALD_FONT_FACE = `
@font-face { font-family: 'Oswald'; font-weight: 400; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Regular.ttf'))}) format('truetype'); }
@font-face { font-family: 'Oswald'; font-weight: 600; font-style: normal; font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Bold.ttf'))}) format('truetype'); }
`;

// Lora (serif) via @remotion/google-fonts — chargement déterministe au render.
const { fontFamily: LORA } = loadLora('normal', { weights: ['500', '600'], subsets: ['latin'] });
const { fontFamily: LORA_IT } = loadLora('italic', { weights: ['400'], subsets: ['latin'] });

// Auto-fit du hook serif (sans mesure) — paliers tenant dans la safe-zone 3:4.
// Agrandis ~+25 % (demande Cyrille 2026-06-22).
const hookSize = (chars) => {
  if (chars <= 38) return 138;
  if (chars <= 68) return 116;
  if (chars <= 105) return 96;
  if (chars <= 150) return 78;
  if (chars <= 210) return 65;
  return 55;
};

export const Couverture = ({
  eyebrow = 'DÉPENDANCE AFFECTIVE',
  hook = 'En amour, vous rejouez le même [[scénario]]',
  signature = 'Cyrille Novou',
  safezone = false,
}) => {
  const raw = String(hook || '');
  const stripped = raw.replace(/\[\[([^\]]+)\]\]/g, '$1');
  const size = hookSize(stripped.length);
  const pieces = parseInline(raw);
  return (
    <AbsoluteFill style={{ backgroundColor: CREME }}>
      <style>{OSWALD_FONT_FACE}</style>

      {/* Repères safe-zone 3:4 (debug, désactivable) : la grille IG croppe 1080×1440 centré. */}
      {safezone && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 240, height: 1440,
          border: '2px dashed rgba(168,67,43,0.5)' }} />
      )}

      {/* Gravité verticale : eyebrow (murmure) → hook (frappe) → signature (signe). */}
      {/* Eyebrow — linéale capitales espacées, taupe. */}
      <div style={{ position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'Oswald', fontWeight: 600, fontSize: 38, letterSpacing: '0.30em',
        textTransform: 'uppercase', color: TAUPE }}>
        {eyebrow}
      </div>

      {/* Hook — serif monumental centré, accent terracotta unique. */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '300px 110px' }}>
        <div style={{ fontFamily: LORA, fontWeight: 600, fontSize: size, lineHeight: 1.16,
          color: ENCRE, textAlign: 'center', width: '100%', wordBreak: 'break-word' }}>
          {pieces.map((p, i) => (
            <span key={i} style={{ color: p.yellow ? TERRA : ENCRE }}>{p.text}</span>
          ))}
        </div>
      </AbsoluteFill>

      {/* Ligne d'ancrage + signature italique (le « signe » du bas, charte). */}
      <div style={{ position: 'absolute', bottom: 372, left: '50%', transform: 'translateX(-50%)',
        width: 70, height: 2, backgroundColor: TERRA, opacity: 0.85 }} />
      <div style={{ position: 'absolute', bottom: 300, left: 0, right: 0, textAlign: 'center',
        fontFamily: LORA_IT, fontStyle: 'italic', fontWeight: 400, fontSize: 48,
        letterSpacing: '0.01em', color: ENCRE, opacity: 0.92 }}>
        {signature}
      </div>
    </AbsoluteFill>
  );
};
