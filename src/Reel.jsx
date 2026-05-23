import { AbsoluteFill, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Oswald';
import { Background } from './Background.jsx';
import { TextStack } from './TextStack.jsx';
import { HandEmoji } from './HandEmoji.jsx';
import { safeBox, COLORS, STAGGER_LEAD_IN_SEC, STAGGER_GAP_SEC, ALL_AT_ONCE_DELAY_SEC, FPS, FADE_SEC, HAND_EMOJI_DELAY_AFTER_LAST_SEC } from './constants.js';
import { normaliseSegments } from './segments.js';

loadFont('normal', { weights: ['400', '700'], subsets: ['latin'] });

// Quand hand_emoji=true, on réserve une bande verticale (16% de la safe height)
// en bas de la safe box pour l'emoji 👆, et on rétrécit la zone texte d'autant.
// Garantit qu'aucun glyphe (ni texte ni emoji) ne sort de la safe box.
const HAND_BAND_RATIO = 0.16;

export const Reel = (props) => {
  const { width, height } = useVideoConfig();
  const safe = safeBox(width, height);
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
      <Background />
      <TextStack segments={segments} reveal={props.reveal} safe={textSafe} />
      {props.hand_emoji && (
        <HandEmoji zone={handZone} startFrame={handStartFrame} />
      )}
    </AbsoluteFill>
  );
};
