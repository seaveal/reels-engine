// Visuels chartrés des posts Facebook / LinkedIn — 1080×1350 PNG (Cyrille 2026-10-02).
// Usage : node echo-incarne/render/export-visuel-post.mjs <lot.json> [--out=out/visuels-posts]
// lot.json : [{ "slug": "...", "s1": "...", "s2": "...", "s2Italique": "..." }]
import {chromium} from 'playwright';
import {readFile, mkdir} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const lotPath = args.find(a => !a.startsWith('--'));
const outDir = (args.find(a => a.startsWith('--out=')) || '--out=out/visuels-posts').slice(6);
if (!lotPath) { console.error('usage: node export-visuel-post.mjs <lot.json> [--out=dir]'); process.exit(1); }
const lot = JSON.parse(await readFile(lotPath, 'utf8'));
await mkdir(outDir, {recursive: true});
const page = path.join(path.dirname(fileURLToPath(import.meta.url)), 'visuel-post.html');
const browser = await chromium.launch();
try {
  const p = await browser.newPage({viewport: {width: 1080, height: 1350}});
  await p.goto(pathToFileURL(page).href);
  await p.evaluate(async () => { await Promise.all(Array.from(document.fonts, f => f.load())); await document.fonts.ready; });
  for (const v of lot) {
    const taille = await p.evaluate(v => window.renderVisuel(v), v);
    await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    const out = path.join(outDir, `${v.slug}.png`);
    await p.locator('#visuel').screenshot({path: out});
    console.log(`✓ ${out} (${taille} px)`);
  }
} finally { await browser.close(); }
