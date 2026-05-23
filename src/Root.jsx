import { Composition } from 'remotion';
import { FPS, HEIGHT, WIDTH, computeDurationSec } from './constants.js';
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
      const sec = computeDurationSec(props);
      return { durationInFrames: Math.max(1, Math.round(sec * FPS)) };
    }}
  />
);
