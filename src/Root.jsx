import { Composition } from 'remotion';
import { FPS, HEIGHT, WIDTH, computeDurationFrames } from './constants.js';
import { Reel } from './Reel.jsx';

export const RemotionRoot = () => (
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
);
