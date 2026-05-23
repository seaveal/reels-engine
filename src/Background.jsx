import { AbsoluteFill, Loop, OffthreadVideo, staticFile } from 'remotion';
import { BACKGROUND_DURATION_FRAMES } from './constants.js';

export const Background = ({ src = 'backgrounds/noir-nuages.mp4' }) => (
  <AbsoluteFill>
    <Loop durationInFrames={BACKGROUND_DURATION_FRAMES}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </Loop>
  </AbsoluteFill>
);
