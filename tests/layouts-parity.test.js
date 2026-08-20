/**
 * Parité des layouts structurés entre les 4 moteurs HTML et export-reel.mjs
 * (chantier layouts dérivés pub, 2026-08-20). Un layout déclaré dans un moteur mais pas
 * dans un autre = `spec.segments.reduce` sur undefined → crash Chromium → render_echec
 * sur toute la note (piège n°7 de la recette). Lance : `node tests/layouts-parity.test.js`
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(here, '..', 'echo-incarne', 'render');
const LAYOUTS = ['message', 'confrontation', 'avantapres', 'timeline', 'liste', 'citation',
  'notes', 'calendrier', 'page', 'audio'];
const BUILDERS = { notes: 'buildNotes', calendrier: 'buildCalendrier', page: 'buildPage', audio: 'buildAudio' };
const PLAYERS = { notes: 'playNotes', calendrier: 'playCalendrier', page: 'playPage', audio: 'playAudio' };

const exportSrc = readFileSync(path.join(R, 'export-reel.mjs'), 'utf8');
for (const l of LAYOUTS) {
  assert.match(exportSrc, new RegExp(`'${l}'`), `export-reel STRUCTURED sans ${l}`);
}
assert.match(exportSrc, /audioPath/, 'export-reel : option --audio absente');
assert.match(exportSrc, /adelay=/, 'export-reel : calage audio (adelay) absent');

for (const f of ['reel-render.html', 'moteur-braise.html', 'moteur-fracture.html', 'moteur-manifeste.html']) {
  const s = readFileSync(path.join(R, f), 'utf8');
  const js = (s.match(/<script>([\s\S]*)<\/script>/) || [])[1] || '';
  assert.ok(js.length > 1000, `${f} : script introuvable`);
  new Function(js); // syntaxe
  for (const l of LAYOUTS) {
    // durée : une branche par layout (sinon chute sur spec.segments)
    assert.match(js, new RegExp(`layout\\s*===\\s*'${l}'\\s*\\?`), `${f} : reelDurationMs sans ${l}`);
    // lecture : dispatch playReel
    assert.match(js, new RegExp(`layout\\s*===\\s*'${l}'\\s*\\)\\s*return`), `${f} : playReel sans ${l}`);
  }
  for (const [l, fn] of Object.entries(BUILDERS)) {
    assert.match(js, new RegExp(`function ${fn}\\(`), `${f} : ${fn} absent`);
    assert.match(js, new RegExp(`${l}\\s*[:=]|'${l}'\\)\\s*${fn}`), `${f} : ${fn} non dispatché`);
  }
  for (const fn of Object.values(PLAYERS)) {
    assert.match(js, new RegExp(`${fn}\\s*=\\s*async function|async function ${fn}\\(`), `${f} : ${fn} absent`);
  }
  assert.match(js, /AUDIO_LEAD_MS/, `${f} : AUDIO_LEAD_MS absent`);
}
console.log('✓ parité layouts : 4 moteurs × 10 layouts + export-reel');
