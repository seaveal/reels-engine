#!/usr/bin/env node
/**
 * Render CLI : `node render.js path/to/spec.json [--out=out/<slug>.mp4]`
 *
 * - valide le JSON contre reel.schema.json
 * - bundle Remotion (avec cache .bundle-cache/<hash-src>/ — audit V3 #2)
 * - calcule durationInFrames via calculateMetadata
 * - rend en H.264 yuv420p muet dans out/<slug>.mp4 par défaut
 */
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Audit V3 #2 — Hash récursif du dossier `src/` pour identifier le bundle.
 * Tout changement de code source → hash différent → re-bundle.
 * Bundles obsolètes nettoyés en début d'invocation.
 */
function hashDirContent(dir) {
  const hash = createHash('md5');
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      const st = statSync(p);
      hash.update(entry);
      if (st.isFile()) {
        hash.update(readFileSync(p));
      } else if (st.isDirectory()) {
        walk(p);
      }
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 12);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('-')) {
  console.error('usage: node render.js path/to/spec.json [--out=path/to/file.mp4] [--scale=1|2]');
  process.exit(64);
}
const specPath = resolve(args[0]);
const outArg = args.find((a) => a.startsWith('--out='));
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
// Scale : 1 = 1080p natif (preview rapide ~1.5min), 2 = 4K via upscale (~5-10min, final post-validation)
const scaleArg = args.find((a) => a.startsWith('--scale='));
const scale = scaleArg ? parseInt(scaleArg.slice('--scale='.length), 10) : 1;

const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
const schema = JSON.parse(readFileSync(resolve(__dirname, 'reel.schema.json'), 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(spec)) {
  console.error('SPEC INVALIDE :');
  for (const err of validate.errors) {
    console.error(`  ${err.instancePath || '/'}  ${err.message}`);
  }
  process.exit(65);
}

const outPath = outArg
  ? resolve(outArg.slice('--out='.length))
  : resolve(__dirname, 'out', `${spec.slug}.mp4`);
mkdirSync(dirname(outPath), { recursive: true });

// Audit V3 #2 — Cache bundle Remotion : hash récursif src/ → .bundle-cache/<hash>/.
// Cache hit : skip le bundle webpack (5-15s gagnés par render). Cache miss : bundle
// frais, copie dans le cache, touch sentinelle. Anciens caches purgés.
const srcDir = resolve(__dirname, 'src');
const srcHash = hashDirContent(srcDir);
const cacheBase = resolve(__dirname, '.bundle-cache');
const cacheDir = resolve(cacheBase, srcHash);
const sentinel = resolve(cacheDir, '.bundle-complete');

// Cleanup des caches obsolètes (autres hashs)
if (existsSync(cacheBase)) {
  for (const entry of readdirSync(cacheBase)) {
    if (entry !== srcHash) {
      try { rmSync(resolve(cacheBase, entry), { recursive: true, force: true }); }
      catch {}
    }
  }
}

let bundleLocation;
const t0 = Date.now();
if (existsSync(sentinel)) {
  bundleLocation = cacheDir;
  console.log(`[bundle] cache hit ${srcHash} (skip webpack)`);
} else {
  console.log(`[bundle] cache miss ${srcHash} — bundling…`);
  const fresh = await bundle({
    entryPoint: resolve(__dirname, 'src/index.jsx'),
    webpackOverride: (cfg) => cfg,
  });
  // Copie atomique vers le cache
  try {
    mkdirSync(cacheDir, { recursive: true });
    cpSync(fresh, cacheDir, { recursive: true });
    writeFileSync(sentinel, srcHash, 'utf-8');
    bundleLocation = cacheDir;
  } catch (e) {
    // Fallback : utiliser le bundle frais sans cache (pas de blocage)
    console.warn(`[bundle] cache write failed (${e.message}) — using fresh bundle`);
    bundleLocation = fresh;
  }
  console.log(`[bundle] ok in ${(Date.now() - t0) / 1000}s`);
}

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: 'Reel',
  inputProps: spec,
});

console.log(`[render] id=${composition.id} duration=${composition.durationInFrames}f (${(composition.durationInFrames / composition.fps).toFixed(2)}s) -> ${outPath}`);

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: outPath,
  inputProps: spec,
  pixelFormat: 'yuv420p',
  enforceAudioTrack: false,
  muted: true,
  concurrency: concurrencyArg ? parseInt(concurrencyArg.slice('--concurrency='.length), 10) : null,
  chromiumOptions: { gl: 'angle' },
  // Scale via --scale=N CLI (acté Cyrille 2026-05-24).
  // 1 (défaut) = 1080×1920 natif → preview rapide ~1.5min (validation Telegram)
  // 2 = 2160×3840 4K via upscale → final post-validation ~5-10min (publication)
  // Composition reste à 1080×1920 (constants.js) ; Remotion upscale à l'encoding
  // si scale>1. Pour du texte vectoriel/SVG le résultat reste excellent.
  scale,
  onProgress: ({ progress }) => {
    process.stdout.write(`\r[render] ${(progress * 100).toFixed(0)}%   `);
  },
});

console.log(`\n[done] ${basename(outPath)}`);
