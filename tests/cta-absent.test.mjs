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
  // Story mantra (2026-10-04) : la plateforme `story` ne pose ni colonne ni barre, garde une zone sûre de
  // story (≥ 250 px en haut, ≥ 340 px en bas, marges égales) et dure 3,9 s sans bouton (5,5 s avec).
  // Contrôle positif : la même page en `instagram` pose bien ses deux bandes.
  for (const template of ['moteur-manifeste.html', 'moteur-braise.html', 'moteur-fracture.html', 'reel-render.html']) {
    await page.goto(pathToFileURL(path.join(render, template)).href + '?norun=1');
    for (const platform of ['story', 'instagram']) {
      const m = await page.evaluate(({spec, platform}) => {
        window.loadReel(spec, {platform});
        return {bands: document.getElementById('platformBands').childElementCount, Z: CFG.Z,
          display: getComputedStyle(document.getElementById('ctaRow')).display,
          ms: window.reelDurationMs(spec), msCta: window.reelDurationMs({...spec, cta: 'Lisez la légende'})};
      }, {spec: sans, platform});
      // Lecture réelle (playReel), pas seulement la formule : somme des attentes demandées.
      const joue = async spec => page.evaluate(async ({spec, platform}) => {
        window.loadReel(spec, {platform});
        const st = window.setTimeout; let total = 0;
        window.setTimeout = (f, ms, ...a) => { total += ms || 0; return st(f, 0, ...a); };
        try { await window.playReel(); } finally { window.setTimeout = st; }
        return total;
      }, {spec, platform});
      m.joue = await joue(sans);
      m.joueCta = await joue({...sans, cta: 'Lisez la légende'});
      const label = `${template} ${platform}`;
      if (platform === 'story') {
        assert.equal(m.bands, 0, label + ' : aucune bande');
        assert.equal(m.display, 'none', label + ' : aucun bouton');
        assert.ok(m.Z.top >= 250 && m.Z.bottom >= 340 && m.Z.left === m.Z.right, label + ' : zone sûre de story ' + JSON.stringify(m.Z));
        assert.equal(m.ms, 3900, label + ' : durée sans bouton');
        assert.equal(m.msCta, 5500, label + ' : durée avec bouton');
        assert.equal(m.joue, 3900, label + ' : lecture sans bouton');
        assert.equal(m.joueCta, 5500, label + ' : lecture avec bouton (contrôle positif)');
      } else {
        assert.equal(m.bands, 2, label + ' : contrôle positif, deux bandes');
      }
      n++;
    }
  }
  console.log(JSON.stringify({passed: n}));
} finally { await browser.close(); }
