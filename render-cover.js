#!/usr/bin/env node
/**
 * Render des COUVERTURES de Reels (still PNG 1080×1920) — composition « Couverture »
 * (charte « L'Écho Incarné »).
 *   node render-cover.js path/to/covers.json [--outdir=out/covers] [--scale=1|2]
 *
 * covers.json : un objet { slug, eyebrow, hook, signature } OU un tableau d'objets.
 *   hook : le « hook visuel » ; UN mot peut être marqué [[ainsi]] → terracotta.
 *
 * Sort out/covers/<slug>.png. Réutilise le cache de bundle de render.js (hash src/).
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
  console.error('usage: node render-cover.js path/to/covers.json [--outdir=out/covers] [--scale=1|2]');
  process.exit(64);
}
const specPath = resolve(args[0]);
const outdirArg = args.find((a) => a.startsWith('--outdir='));
const scaleArg = args.find((a) => a.startsWith('--scale='));
const scale = scaleArg ? parseInt(scaleArg.slice('--scale='.length), 10) : 1;

const parsed = JSON.parse(readFileSync(specPath, 'utf-8'));
const covers = (Array.isArray(parsed) ? parsed : [parsed]).filter((c) => c && c.slug && c.hook);
if (covers.length === 0) {
  console.error('covers.json invalide : { slug, hook, eyebrow?, signature? } (ou tableau) requis');
  process.exit(65);
}
const outDir = outdirArg ? resolve(outdirArg.slice('--outdir='.length)) : resolve(__dirname, 'out', 'covers');
mkdirSync(outDir, { recursive: true });

// --- Bundle (cache partagé avec render.js / render-card.js) ---
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
for (const c of covers) {
  const inputProps = {
    eyebrow: c.eyebrow || '',
    hook: c.hook,
    signature: c.signature || 'Cyrille Novou',
    safezone: !!c.safezone,
  };
  const composition = await selectComposition({ serveUrl: bundleLocation, id: 'Couverture', inputProps });
  const outPath = join(outDir, `${c.slug}.png`);
  await renderStill({
    composition, serveUrl: bundleLocation, output: outPath, inputProps,
    imageFormat: 'png', scale, chromiumOptions: { gl: 'angle' },
  });
  console.log(`[cover] ${c.slug} -> ${outPath}`);
  written.push(outPath);
}
console.log(`[done] ${written.length} couverture(s)`);
