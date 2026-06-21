#!/usr/bin/env node
/**
 * Render des CARTES illustratives (still PNG 1080×1080) pour articles FB/Circle.
 *   node render-card.js path/to/cards.json
 *
 * cards.json : { "slug": "<slug>", "cards": ["texte 1", "texte 2", "texte 3"] }
 *   (chaque entrée peut aussi être { "text": "...", "handle": "@..." }).
 *
 * Sort out/cards/<slug>-1.png, -2.png, -3.png (composition Remotion « Carte »).
 * Réutilise le cache de bundle de render.js (hash récursif de src/).
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
  console.error('usage: node render-card.js path/to/cards.json [--outdir=out/cards] [--scale=1|2]');
  process.exit(64);
}
const specPath = resolve(args[0]);
const outdirArg = args.find((a) => a.startsWith('--outdir='));
const scaleArg = args.find((a) => a.startsWith('--scale='));
const scale = scaleArg ? parseInt(scaleArg.slice('--scale='.length), 10) : 1;

const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
if (!spec.slug || !Array.isArray(spec.cards) || spec.cards.length === 0) {
  console.error('cards.json invalide : { slug, cards:[...] } requis');
  process.exit(65);
}
const cards = spec.cards.map((c) => (typeof c === 'string' ? { text: c } : c)).filter((c) => c && c.text);
const outDir = outdirArg ? resolve(outdirArg.slice('--outdir='.length)) : resolve(__dirname, 'out', 'cards');
mkdirSync(outDir, { recursive: true });

// --- Bundle (cache partagé avec render.js) ---
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
for (let i = 0; i < cards.length; i++) {
  const inputProps = { text: cards[i].text, handle: cards[i].handle || '@CyrilleNovou' };
  const composition = await selectComposition({ serveUrl: bundleLocation, id: 'Carte', inputProps });
  const outPath = join(outDir, `${spec.slug}-${i + 1}.png`);
  await renderStill({
    composition, serveUrl: bundleLocation, output: outPath, inputProps,
    imageFormat: 'png', scale, chromiumOptions: { gl: 'angle' },
  });
  console.log(`[card ${i + 1}/${cards.length}] -> ${outPath}`);
  written.push(outPath);
}
console.log(`[done] ${written.length} carte(s) pour ${spec.slug}`);
