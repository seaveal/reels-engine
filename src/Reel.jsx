import { AbsoluteFill, Series, useVideoConfig, staticFile } from 'remotion';
import { Background } from './Background.jsx';
import { TextStack } from './TextStack.jsx';
import { PageStack } from './PageStack.jsx';
import { HandEmoji } from './HandEmoji.jsx';
import { safeBox, safeBoxLong, COLORS, STAGGER_LEAD_IN_SEC, STAGGER_GAP_SEC, ALL_AT_ONCE_DELAY_SEC, FPS, FADE_SEC, HAND_EMOJI_DELAY_AFTER_LAST_SEC, computePageHoldFrames } from './constants.js';
import { normaliseSegments } from './segments.js';
import { normalisePages } from './pages.js';

// Audit V3 #4 — Embed Oswald local (TTF dans public/fonts/) au lieu de
// @remotion/google-fonts/Oswald qui télécharge depuis fonts.gstatic.com au bundle.
// Élimine la dépendance externe : si Google Fonts est down, le rendu fonctionne quand même.
// Police 400/700 livrée par Cyrille 2026-05-24 (Oswald.zip Google Fonts officiel).
const OSWALD_FONT_FACE = `
@font-face {
  font-family: 'Oswald';
  font-weight: 400;
  font-style: normal;
  font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Regular.ttf'))}) format('truetype');
}
@font-face {
  font-family: 'Oswald';
  font-weight: 700;
  font-style: normal;
  font-display: block;
  src: url(${JSON.stringify(staticFile('fonts/Oswald-Bold.ttf'))}) format('truetype');
}
`;

// Quand hand_emoji=true, on réserve une bande verticale (16% de la safe height)
// en bas de la safe box pour l'emoji 👆, et on rétrécit la zone texte d'autant.
// Garantit qu'aucun glyphe (ni texte ni emoji) ne sort de la safe box.
const HAND_BAND_RATIO = 0.16;

export const Reel = (props) => {
  const { width, height } = useVideoConfig();
  const safe = safeBox(width, height);

  // FORMAT LONG (layout:"long") — paging / replace. Chaque page occupe sa propre
  // fenêtre temporelle (Series) ; la page suivante remplace la précédente.
  // ADDITIF : le format court (ci-dessous) reste strictement inchangé.
  if (props.layout === 'long') {
    // Le format long utilise sa PROPRE safe box (marges mesurées sur originaux),
    // distincte du court → on n'altère pas le rendu court (non-régression).
    const safeLong = safeBoxLong(width, height);
    const pages = normalisePages(props.pages ?? []);
    // v4 : frames par page = EXACTEMENT ce que somme computeDurationFrames pour la
    // composition → la dernière page tient jusqu'à la dernière frame (pas de queue vide).
    const holdFrames = computePageHoldFrames(props);
    return (
      <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
        <style dangerouslySetInnerHTML={{ __html: OSWALD_FONT_FACE }} />
        <Background name={props.background} />
        <Series>
          {pages.map((page, i) => (
            <Series.Sequence
              key={page.id}
              durationInFrames={holdFrames[i] ?? 1}
            >
              <PageStack page={page} safe={safeLong} />
            </Series.Sequence>
          ))}
        </Series>
      </AbsoluteFill>
    );
  }

  // FORMAT COURT (historique, inchangé).
  const segments = normaliseSegments(props.segments ?? []);

  const handBand = props.hand_emoji ? Math.round(safe.height * HAND_BAND_RATIO) : 0;
  const textSafe = { ...safe, height: safe.height - handBand };
  const handZone = props.hand_emoji
    ? { x: safe.x, y: safe.y + safe.height - handBand, width: safe.width, height: handBand }
    : null;

  // Frame de démarrage de l'emoji main : juste après le dernier segment.
  const lastSegStartSec = props.reveal === 'staggered'
    ? STAGGER_LEAD_IN_SEC + Math.max(0, segments.length - 1) * STAGGER_GAP_SEC
    : ALL_AT_ONCE_DELAY_SEC;
  const handStartFrame = Math.round((lastSegStartSec + FADE_SEC + HAND_EMOJI_DELAY_AFTER_LAST_SEC) * FPS);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <style dangerouslySetInnerHTML={{ __html: OSWALD_FONT_FACE }} />
      <Background name={props.background} />
      <TextStack segments={segments} reveal={props.reveal} safe={textSafe} />
      {props.hand_emoji && (
        <HandEmoji zone={handZone} startFrame={handStartFrame} />
      )}
    </AbsoluteFill>
  );
};
