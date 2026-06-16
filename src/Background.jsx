import { AbsoluteFill, Loop, OffthreadVideo, staticFile } from 'remotion';
import { BACKGROUND_DURATION_FRAMES } from './constants.js';

// Audit V4 #2 — Background per pilier/archétype : la prop `name` accepte un
// slug kebab-case ; on résout vers public/backgrounds/<name>.mp4. Fallback
// `noir-nuages` si non précisé (rétrocompatible).
export const Background = ({ name = 'noir-nuages' }) => (
  <AbsoluteFill>
    <Loop durationInFrames={BACKGROUND_DURATION_FRAMES}>
      <OffthreadVideo
        src={staticFile(`backgrounds/${name}.mp4`)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </Loop>
  </AbsoluteFill>
);
