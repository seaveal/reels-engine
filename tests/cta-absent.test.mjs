// Story mantra (2026-10-03) : une spec SANS CTA n'affiche rien — ni bouton, ni flèche, ni place
// réservée — dans les 4 moteurs. Contrôle positif : la même spec avec un CTA garde son bouton.
// Lance : `node tests/cta-absent.test.mjs`
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const render = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'echo-incarne/render');
const sans = {slug: 'story-sans-cta', layout: 'citation', quote: 'La tête comprend. Le corps répare.'};
const browser = await chromium.launch();
let n = 0;
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}});
  for (const template of ['moteur-manifeste.html', 'moteur-braise.html', 'moteur-fracture.html', 'reel-render.html']) {
    await page.goto(pathToFileURL(path.join(render, template)).href + '?norun=1');
    for (const platform of ['instagram', 'tiktok', 'youtube']) for (const cta of ['', 'Lisez la légende']) {
      const m = await page.evaluate(({spec, platform}) => {
        window.loadReel(spec, {platform});
        const row = document.getElementById('ctaRow');
        row.style.opacity = '1';
        const r = row.getBoundingClientRect();
        return {label: document.getElementById('ctaCapsule').textContent.trim(), display: getComputedStyle(row).display,
          height: r.height, spacer: document.querySelectorAll('#ctaSpace').length};
      }, {spec: {...sans, ...(cta ? {cta} : {})}, platform});
      const label = `${template} ${platform} ${cta ? 'avec' : 'sans'} CTA`;
      if (cta) {
        assert.ok(m.label && m.display !== 'none' && m.height > 0 && m.spacer === 1, label + ' : bouton attendu');
      } else {
        assert.equal(m.label, '', label + ' : aucun libellé par défaut');
        assert.equal(m.display, 'none', label + ' : aucun bouton');
        assert.equal(m.spacer, 0, label + ' : aucune place réservée');
      }
      n++;
    }
  }
  console.log(JSON.stringify({passed: n}));
} finally { await browser.close(); }
