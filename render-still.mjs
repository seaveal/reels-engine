// Script TEMPORAIRE (test mise en scène 2026-06-24) — rend plusieurs frames (stills).
// usage: node render-still.mjs <spec.json> <f1,f2,...> <outBase>
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(process.argv[2]);
const frames = (process.argv[3] || '30').split(',').map((s) => parseInt(s, 10));
const outBase = process.argv[4] || '/tmp/still';
const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
const bundleLocation = await bundle({ entryPoint: resolve(__dirname, 'src/index.jsx'), webpackOverride: (c) => c });
const composition = await selectComposition({ serveUrl: bundleLocation, id: 'Reel', inputProps: spec });
console.log('duration', composition.durationInFrames, 'frames');
for (const frame of frames) {
  const f = Math.max(0, Math.min(frame, composition.durationInFrames - 1));
  const out = `${outBase}-f${f}.png`;
  await renderStill({ composition, serveUrl: bundleLocation, output: out, inputProps: spec, frame: f, scale: 1, chromiumOptions: { gl: 'angle' } });
  console.log('still ->', out);
}
