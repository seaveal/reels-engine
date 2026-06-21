import { Composition } from 'remotion';
import { FPS, HEIGHT, WIDTH, computeDurationFrames } from './constants.js';
import { Reel } from './Reel.jsx';
import { Carte } from './Carte.jsx';

export const RemotionRoot = () => (
  <>
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={Math.round(6 * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        slug: 'sample',
        reveal: 'all_at_once',
        hand_emoji: false,
        duration_s: null,
        segments: [
          { role: 'title', text: 'EXEMPLE [[DE]] REEL' },
          { role: 'cta', text: '(LISEZ LA LÉGENDE)' },
        ],
      }}
      calculateMetadata={({ props }) => {
        // v4 : frames exactes (= somme des frames de page pour le long) → la dernière
        // page tient jusqu'à la dernière frame (plus d'écran vide en fin de réel).
        return { durationInFrames: computeDurationFrames(props) };
      }}
    />
    {/* Carte illustrative FB/Circle (still PNG 1080×1080) — ADR 2026-06-21. */}
    <Composition
      id="Carte"
      component={Carte}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1080}
      defaultProps={{ text: 'EXEMPLE DE [[CARTE]]', handle: '@lecorpsnetrichejamais' }}
    />
  </>
);
