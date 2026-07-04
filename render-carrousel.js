#!/usr/bin/env node
/**
 * Render des SLIDES de carrousel Instagram (stills PNG 1080×1350, composition « Slide »).
 *   node render-carrousel.js path/to/carrousel.json [--outdir=out/carrousels/<slug>]
 *
 * carrousel.json : { "slug": "<slug>", "slides": ["texte 1", "texte 2", …] }
 *   (chaque entrée peut aussi être { "text": "..." } ; mots [[surlignés]] → crème).
 *
 * Sort <outdir>/slide-01.png … slide-NN.png. Pastille avatar sur la première et la
 * dernière slide, numérotation N/T sur toutes (chantier 3 contenu v2, 2026-07-04).
 * Réutilise le cache de bundle de render-card.js (hash récursif de src/).
 */
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const __dirname = dirname(fileURLToPath(import.meta.url));

function hashDirContent(dir) {
  const hash = createHash('md5');
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      const st = statSync(p);
      hash.update(entry);
      if (st.isFile()) hash.update(readFileSync(p));
      else if (st.isDirectory()) walk(p);
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 12);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('-')) {
  console.error('usage: node render-carrousel.js path/to/carrousel.json [--outdir=…] [--scale=1|2]');
  process.exit(64);
}
const specPath = resolve(args[0]);
const outdirArg = args.find((a) => a.startsWith('--outdir='));
const scaleArg = args.find((a) => a.startsWith('--scale='));
const scale = scaleArg ? parseInt(scaleArg.slice('--scale='.length), 10) : 1;

const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
if (!spec.slug || !Array.isArray(spec.slides) || spec.slides.length === 0) {
  console.error('carrousel.json invalide : { slug, slides:[...] } requis');
  process.exit(65);
}
const slides = spec.slides.map((s) => (typeof s === 'string' ? { text: s } : s)).filter((s) => s && s.text);
if (!slides.length) { console.error('aucune slide avec texte'); process.exit(65); }
const outDir = outdirArg
  ? resolve(outdirArg.slice('--outdir='.length))
  : resolve(__dirname, 'out', 'carrousels', spec.slug);
mkdirSync(outDir, { recursive: true });

// --- Bundle (cache partagé avec render-card.js / render.js) ---
const srcDir = resolve(__dirname, 'src');
const srcHash = hashDirContent(srcDir);
const cacheBase = resolve(__dirname, '.bundle-cache');
const cacheDir = resolve(cacheBase, srcHash);
const sentinel = resolve(cacheDir, '.bundle-complete');
if (existsSync(cacheBase)) {
  for (const entry of readdirSync(cacheBase)) {
    if (entry !== srcHash) { try { rmSync(resolve(cacheBase, entry), { recursive: true, force: true }); } catch {} }
  }
}
let bundleLocation;
if (existsSync(sentinel)) {
  bundleLocation = cacheDir;
  console.log(`[bundle] cache hit ${srcHash}`);
} else {
  console.log(`[bundle] cache miss ${srcHash} — bundling…`);
  const fresh = await bundle({ entryPoint: resolve(__dirname, 'src/index.jsx'), webpackOverride: (c) => c });
  try {
    mkdirSync(cacheDir, { recursive: true });
    cpSync(fresh, cacheDir, { recursive: true });
    writeFileSync(sentinel, srcHash, 'utf-8');
    bundleLocation = cacheDir;
  } catch (e) {
    console.warn(`[bundle] cache write failed (${e.message}) — fresh`);
    bundleLocation = fresh;
  }
}

const written = [];
for (let i = 0; i < slides.length; i++) {
  const inputProps = {
    text: slides[i].text,
    index: i + 1,
    total: slides.length,
    badge: i === 0 || i === slides.length - 1, // pastille avatar : première + dernière
    handle: slides[i].handle || '@CyrilleNovou',
  };
  const composition = await selectComposition({ serveUrl: bundleLocation, id: 'Slide', inputProps });
  const outPath = join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
  await renderStill({
    composition, serveUrl: bundleLocation, output: outPath, inputProps,
    imageFormat: 'png', scale, chromiumOptions: { gl: 'angle' },
  });
  console.log(`[slide ${i + 1}/${slides.length}] -> ${outPath}`);
  written.push(outPath);
}
console.log(`[done] ${written.length} slide(s) pour ${spec.slug}`);
