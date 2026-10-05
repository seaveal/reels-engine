// Nom du compte en tête du réel (Cyrille 2026-10-05) : @CyrilleNovou sur YouTube, @lecorpsnetrichejamais
// sur Instagram et TikTok, dans les 4 moteurs ; et le bouton dit « description » sur YouTube, « légende » ailleurs.
// Lance : `node tests/handle-compte.test.mjs`
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const render = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'echo-incarne/render');
const spec = {slug: 'handle', segments: [{role: 'title', text: 'Un écran.'}, {role: 'cta', text: 'LA CAUSE ? LISEZ LA LÉGENDE'}]};
const browser = await chromium.launch();
let n = 0;
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}});
  for (const template of ['moteur-manifeste.html', 'moteur-braise.html', 'moteur-fracture.html', 'reel-render.html']) {
    await page.goto(pathToFileURL(path.join(render, template)).href + '?norun=1');
    for (const platform of ['instagram', 'tiktok', 'youtube']) {
      const m = await page.evaluate(({spec, platform}) => {
        window.loadReel(spec, {platform});
        return {texte: document.getElementById('stage').textContent, bouton: document.getElementById('ctaCapsule').textContent.trim()};
      }, {spec, platform});
      const yt = platform === 'youtube', label = `${template} ${platform}`;
      assert.equal(m.texte.includes('@CyrilleNovou'), yt, label + ' : @CyrilleNovou seulement sur YouTube');
      assert.equal(m.texte.includes('@lecorpsnetrichejamais'), !yt, label + ' : @lecorpsnetrichejamais partout ailleurs');
      assert.match(m.bouton, yt ? /^LA CAUSE \? LISEZ LA DESCRIPTION$/i : /^LA CAUSE \? LISEZ LA LÉGENDE$/i, label + ' : bouton');
      n++;
    }
  }
} finally { await browser.close(); }
console.log(`handle-compte : ${n} cas OK`);
