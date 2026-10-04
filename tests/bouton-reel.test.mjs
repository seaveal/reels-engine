// Règle du bouton sur de vraies specs du corpus (audit tour 2, 2026-10-04) : hooks d'octobre, réel de la
// capture de Cyrille, texte très court, libellé long. Cyrille 2026-10-02 : bouton aussi gros que le texte,
// sur deux lignes. Le bouton ne fait jamais rapetisser le texte ; c'est lui qui réduit, jamais sous le
// plancher du moteur. Les tailles de texte attendues sont figées : TikTok et YouTube = 571c5b5 (avant le
// chantier, inchangées par construction), Instagram = nouvelle zone. Plancher figé ici, pas lu dans le moteur.
// Lance : `node tests/bouton-reel.test.mjs` ; `--mesurer=<dossier racine>` imprime les mesures d'un arbre.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const mesurer = (process.argv.find(a => a.startsWith('--mesurer=')) || '').split('=')[1];
const root = mesurer || path.join(here, '..');
const {specs, texte: TEXTE} = JSON.parse(readFileSync(path.join(here, 'specs-reelles.json'), 'utf8'));
const PLANCHER = {echo: 66, braise: 85, fracture: 66, manifeste: 66};
const TPL = {echo: 'reel-render.html', braise: 'moteur-braise.html', fracture: 'moteur-fracture.html', manifeste: 'moteur-manifeste.html'};
const exporter = readFileSync(path.join(here, '..', 'echo-incarne/render/export-reel.mjs'), 'utf8');
const adapt = new Function('spec', exporter.slice(exporter.indexOf('if (!spec.segments && Array.isArray(spec.pages))'),
  exporter.indexOf('const STRUCTURED')) + ';return spec;');

const browser = await chromium.launch();
const mesures = {};
let n = 0;
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}});
  for (const [moteur, tpl] of Object.entries(TPL)) {
    await page.goto(pathToFileURL(path.join(root, 'echo-incarne/render', tpl)).href + '?norun=1');
    await page.evaluate(async () => { await Promise.all(Array.from(document.fonts, f => f.load())); await document.fonts.ready; });
    for (const source of specs) for (const platform of ['instagram', 'tiktok', 'youtube']) {
      const spec = adapt(structuredClone(source));
      const m = await page.evaluate(({spec, platform}) => {
        window.loadReel(spec, {platform});
        for (let i = 0; i < spec.segments.length; i++) showSegment(i);
        const seg = document.querySelector('#page [data-max-font-size]'), cap = document.getElementById('ctaCapsule');
        const cs = getComputedStyle(cap), r = document.createRange(); r.selectNodeContents(cap);
        const lab = r.getBoundingClientRect();
        return {texte: parseFloat(getComputedStyle(seg).fontSize), bouton: parseFloat(cs.fontSize), label: cap.textContent.trim(),
          lignes: Math.round(lab.height / parseFloat(cs.lineHeight)),
          deborde: lab.width - (cap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))};
      }, {spec, platform});
      (mesures[spec.slug] ||= {})[`${moteur}/${platform}`] = m.texte;
      if (mesurer) continue;
      const label = `${spec.slug} ${moteur} ${platform}`;
      assert.equal(m.texte, TEXTE[spec.slug][`${moteur}/${platform}`], label + ' : le bouton ne fait pas rapetisser le texte');
      assert.ok(m.bouton <= m.texte, label + ` : bouton pas plus gros que le texte (${m.bouton}/${m.texte})`);
      assert.ok(m.bouton >= Math.min(m.texte, PLANCHER[moteur]), label + ` : bouton jamais sous le plancher (${m.bouton})`);
      if (m.label.length <= 28) assert.ok(m.lignes <= 2, label + ` : libellé conforme sur 2 lignes (${m.lignes}, « ${m.label} »)`);
      assert.ok(m.deborde <= 1, label + ' : libellé dans sa capsule');
      n++;
    }
  }
} finally { await browser.close(); }
if (mesurer) console.log(JSON.stringify(mesures, null, 1));
else console.log(JSON.stringify({passed: n}));
