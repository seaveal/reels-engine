// Rendu headless des carrousels « L'Écho Incarné » → PNG 1080×1440.
// Remplace Remotion pour les carrousels FIXES. Usage :
//   npm i -D playwright && npx playwright install chromium
//   node render/export-carousel.mjs render/sample-spec.json           # -> out/<slug>/slide-NN.png
//   node render/export-carousel.mjs chemin/vers/spec.json out/mon-dossier
//
// Entrée = le spec carrousel du vault : { "slug": "...", "slides": ["texte [[pivot]]", ...] }
// (+ champs optionnels : pilier, handle, photo, legend). L'index 0 devient la COUVERTURE,
// le dernier le RENVOI LÉGENDE, le reste des slides de CONTENU.

import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Args : <spec.json> [outDir | --outdir=DIR] — le flag --outdir= est le contrat
// d'appel de studio_cards (identique à l'ancien render-carrousel.js).
const argv = process.argv.slice(2);
const specPath = argv.find(a => !a.startsWith('--'));
const outFlag = argv.find(a => a.startsWith('--outdir='));
const outArg = outFlag ? outFlag.slice('--outdir='.length)
  : argv.filter(a => !a.startsWith('--'))[1];
if (!specPath) {
  console.error('usage: node export-carousel.mjs <spec.json> [outDir|--outdir=DIR]');
  process.exit(1);
}

// Piliers frontmatter (codes) -> libellés de couverture
const PILIER_LABELS = {
  mecanisme: 'Le mécanisme', symptome: 'Le signe', signe: 'Le signe',
  histoire: "L'histoire", methode: 'La méthode', reframe: 'Le retournement',
};
// Renvois légende, variés (jamais le mot-clé funnel à l'écran)
const LEGENDS = [
  'La réponse est en légende', 'La suite dans la légende',
  'Tout est dans la légende', 'La solution est en légende',
];

const spec = JSON.parse(await readFile(specPath, 'utf8'));
const slug = spec.slug || path.basename(specPath, '.json');
const outDir = outArg || path.join('out', slug);
await mkdir(outDir, { recursive: true });

// Sépare "Phrase forte. Le souffle qui suit." -> {head, sub}
// Bracket-aware (Cyrille 2026-07-07) : ne coupe JAMAIS à l'intérieur d'un bloc [[...]],
// sinon la paire se scinde entre head et sub -> crochets bruts à l'écran (ex. un « . »
// à l'intérieur d'une citation surlignée). Coupe au 1er point de rupture HORS crochets :
// saut de paragraphe (\n\n) ou fin de phrase (.!?) + espace, selon ce qui vient en premier.
function splitText(t) {
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '[' && t[i + 1] === '[') { depth++; i++; continue; }
    if (t[i] === ']' && t[i + 1] === ']') { depth = Math.max(0, depth - 1); i++; continue; }
    if (depth > 0) continue;                       // dans un [[...]] -> jamais de coupe
    const para = t.slice(i).match(/^\n\s*\n\s*/);  // saut de paragraphe
    if (para) {
      const sub = t.slice(i + para[0].length).trim();
      if (sub) return { head: t.slice(0, i).trim(), sub };
    }
    if (/[.!?]/.test(t[i]) && /\s/.test(t[i + 1] || '')) {  // fin de phrase + espace
      const sub = t.slice(i + 1).trim();
      if (sub) return { head: t.slice(0, i + 1).trim(), sub };
    }
  }
  return { head: t.trim(), sub: '' };
}

// Aération automatique (Cyrille 2026-07-11 : « les carrousels n'ont jamais de sauts
// de ligne ») : un bloc SANS saut de ligne manuel est aéré à chaque fin de phrase —
// chaque phrase devient un paragraphe (\n\n), rendu en respiration (.souffle) par
// carousel-render.html. Bracket-aware ([[...]] jamais coupé) ; un texte déjà aéré à
// la main (contient \n) n'est PAS retouché : la rédaction garde la main.
function aerate(t) {
  if (!t || t.includes('\n')) return t;
  let out = '', depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    out += c;
    if (c === '[' && t[i + 1] === '[') { depth++; out += t[++i]; continue; }
    if (c === ']' && t[i + 1] === ']') { depth = Math.max(0, depth - 1); out += t[++i]; continue; }
    if (depth === 0 && /[.!?…]/.test(c) && /\s/.test(t[i + 1] || '')) {
      let j = i + 1;
      while (j < t.length && /\s/.test(t[j])) j++;
      if (j < t.length) { out += '\n\n'; i = j - 1; }
    }
  }
  return out;
}

const raw = spec.slides || [];
const total = raw.length;
const pilierLabel = spec.pilier ? (PILIER_LABELS[spec.pilier] || spec.pilier) : undefined;

const slides = raw.map((t, i) => {
  const { head, sub } = splitText(t);
  const base = { index: i + 1, total, handle: spec.handle, photo: spec.photo };
  if (i === 0) return { ...base, variant: 'cover', text: aerate(t), pilier: pilierLabel };
  if (i === total - 1)
    return { ...base, variant: 'cta', text: head, sub: aerate(sub), legend: spec.legend || LEGENDS[i % LEGENDS.length] };
  return { ...base, variant: 'body', text: head, sub: aerate(sub) };
});

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(path.join(here, 'carousel-render.html')).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 1 });
await page.goto(pageUrl);
await page.evaluate(() => document.fonts.ready);

for (const s of slides) {
  await page.evaluate((d) => window.renderSlide(d), s);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120); // laisse la police/mise en page se poser
  const n = String(s.index).padStart(2, '0');
  await page.locator('#stage').screenshot({ path: path.join(outDir, `slide-${n}.png`) });
  process.stdout.write(`  slide-${n}.png (${s.variant})\n`);
}

await browser.close();
console.log(`✓ ${slides.length} slides 1080×1440 → ${outDir}`);
