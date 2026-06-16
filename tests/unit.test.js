/**
 * Tests unitaires Node natifs (sans framework) pour les modules pure-JS du
 * reels-engine. Audit V4 #8 — couvrir normaliseSegments, parseHighlights,
 * stripHighlights, safeBox, computeDurationSec.
 *
 * Lance : `node tests/unit.test.js`
 * Exit code 0 = OK, autre = échec.
 */
import assert from 'node:assert/strict';
import { normaliseSegments } from '../src/segments.js';
import { normalisePages } from '../src/pages.js';
import { parseHighlights, stripHighlights } from '../src/highlight.js';
import { safeBox, computeDurationSec, computePageHoldSec, computePageHolds } from '../src/constants.js';

let passed = 0;
let failed = 0;
const fails = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    fails.push({ name, error: e });
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

console.log('\n=== normaliseSegments ===');

test('title role → 1 line bold', () => {
  const out = normaliseSegments([{ role: 'title', text: 'HOOK' }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].lines.length, 1);
  assert.equal(out[0].lines[0].text, 'HOOK');
  assert.equal(out[0].lines[0].bold, true);
  assert.equal(out[0].lines[0].kind, 'title');
});

test('cta role → 1 line non-bold uppercase kind=cta', () => {
  const out = normaliseSegments([{ role: 'cta', text: '(LISEZ LA LÉGENDE)' }]);
  assert.equal(out[0].lines[0].bold, false);
  assert.equal(out[0].lines[0].kind, 'cta');
});

test('block.text → 1 line non-bold kind=block', () => {
  const out = normaliseSegments([{ role: 'block', text: 'corps narratif' }]);
  assert.equal(out[0].lines[0].bold, false);
  assert.equal(out[0].lines[0].kind, 'block');
});

test('block.heading + body → 2 lines heading-bold body-regular', () => {
  const out = normaliseSegments([{ role: 'block', heading: 'TITRE', body: 'développement' }]);
  assert.equal(out[0].lines.length, 2);
  assert.equal(out[0].lines[0].bold, true);
  assert.equal(out[0].lines[0].kind, 'heading');
  assert.equal(out[0].lines[1].bold, false);
  assert.equal(out[0].lines[1].kind, 'body');
});

test('bold override true forces all lines bold', () => {
  const out = normaliseSegments([
    { role: 'block', heading: 'A', body: 'B', bold: true },
  ]);
  assert.equal(out[0].lines[0].bold, true);
  assert.equal(out[0].lines[1].bold, true);
});

test('bold override false forces all lines non-bold (cas reverse)', () => {
  const out = normaliseSegments([{ role: 'title', text: 'HOOK', bold: false }]);
  assert.equal(out[0].lines[0].bold, false);
});

test('role inconnu lève une erreur explicite', () => {
  assert.throws(
    () => normaliseSegments([{ role: 'intro', text: 'X' }]),
    /role inconnu : intro/,
  );
});

console.log('\n=== parseHighlights / stripHighlights ===');

test('parseHighlights sans [[ ]] → 1 piece highlight=false', () => {
  const out = parseHighlights('texte normal');
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'texte normal');
  assert.equal(out[0].highlight, false);
});

test('parseHighlights 1 highlight → 3 pieces (avant/highlight/après)', () => {
  const out = parseHighlights('avant [[hook]] après');
  assert.equal(out.length, 3);
  assert.equal(out[1].text, 'hook');
  assert.equal(out[1].highlight, true);
});

test('parseHighlights 2 highlights consécutifs → 4 pieces', () => {
  const out = parseHighlights('[[A]] et [[B]]');
  // [{A,true},{ et ,false},{B,true}]
  assert.equal(out.length, 3);
  assert.equal(out[0].highlight, true);
  assert.equal(out[0].text, 'A');
  assert.equal(out[2].highlight, true);
  assert.equal(out[2].text, 'B');
});

test('parseHighlights [[ non fermé → renvoyé tel quel sans highlight', () => {
  const out = parseHighlights('[[unclosed');
  assert.equal(out.length, 1);
  assert.equal(out[0].highlight, false);
});

test('parseHighlights chaîne vide → tableau vide (0 piece)', () => {
  const out = parseHighlights('');
  assert.equal(out.length, 0);
});

test('stripHighlights retire les [[ ]] et garde le texte', () => {
  assert.equal(stripHighlights('avant [[hook]] après'), 'avant hook après');
});

test('stripHighlights sans highlight → texte inchangé', () => {
  assert.equal(stripHighlights('rien à voir'), 'rien à voir');
});

console.log('\n=== safeBox ===');

test('safeBox(1080,1920) → x=108 y=326 w=864 h=1171', () => {
  const sb = safeBox(1080, 1920);
  assert.equal(sb.x, 108);
  assert.equal(sb.y, 326);
  assert.equal(sb.width, 864);
  assert.equal(sb.height, 1171);
});

test('safeBox proportionnel pour 540×960', () => {
  const sb = safeBox(540, 960);
  assert.equal(sb.x, 54);
  assert.equal(sb.y, 163);
  assert.equal(sb.width, 432);
  assert.equal(sb.height, 586);
});

console.log('\n=== computeDurationSec ===');

test('staggered 4 segments → 0.3 + 1.1*3 + 0.4 + 3.5 = 7.5s', () => {
  const d = computeDurationSec({ reveal: 'staggered', segments: [1, 2, 3, 4] });
  assert.equal(d, 7.5);
});

test('staggered 1 segment → 0.3 + 0 + 0.4 + 3.5 = 4.2s', () => {
  const d = computeDurationSec({ reveal: 'staggered', segments: [1] });
  assert.equal(Math.round(d * 10) / 10, 4.2);
});

test('all_at_once → 0.3 + 0.4 + 9.3 = 10s', () => {
  const d = computeDurationSec({ reveal: 'all_at_once', segments: [1, 2] });
  assert.equal(d, 10);
});

test('duration_s explicite override le calcul auto', () => {
  const d = computeDurationSec({ reveal: 'staggered', segments: [1, 2, 3], duration_s: 7 });
  assert.equal(d, 7);
});

test('staggered 0 segment → durée min sans crash', () => {
  const d = computeDurationSec({ reveal: 'staggered', segments: [] });
  // 0.3 + 1.1 * max(0, -1) = 0.3 + 0 = 0.3 + 0.4 + 3.5 = 4.2
  assert.equal(Math.round(d * 10) / 10, 4.2);
});

console.log('\n=== normalisePages (format long) ===');

test('page body line → kind=block régulier (casse préservée)', () => {
  const out = normalisePages([{ lines: [{ text: 'corps narratif' }] }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 0);
  assert.equal(out[0].lines[0].kind, 'block');
  assert.equal(out[0].lines[0].bold, false);
  assert.equal(out[0].lines[0].text, 'corps narratif');
});

test('page heading line → kind=heading gras', () => {
  const out = normalisePages([{ lines: [{ text: 'HOOK', role: 'heading' }] }]);
  assert.equal(out[0].lines[0].kind, 'heading');
  assert.equal(out[0].lines[0].bold, true);
});

test('page cta line → kind=cta régulier', () => {
  const out = normalisePages([{ lines: [{ text: 'LISEZ LA LÉGENDE', role: 'cta' }] }]);
  assert.equal(out[0].lines[0].kind, 'cta');
  assert.equal(out[0].lines[0].bold, false);
});

test('page line bold override force le gras', () => {
  const out = normalisePages([{ lines: [{ text: 'x', bold: true }] }]);
  assert.equal(out[0].lines[0].bold, true);
});

test('plusieurs pages → ids incrémentaux', () => {
  const out = normalisePages([{ lines: [{ text: 'a' }] }, { lines: [{ text: 'b' }] }]);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 0);
  assert.equal(out[1].id, 1);
});

test('page role inconnu lève une erreur explicite', () => {
  assert.throws(
    () => normalisePages([{ lines: [{ text: 'x', role: 'title' }] }]),
    /role inconnu : title/,
  );
});

console.log('\n=== computePageHoldSec / computeDurationSec (format long) ===');

test('hold_s explicite override le calcul auto', () => {
  assert.equal(computePageHoldSec({ lines: [{ text: 'a' }], hold_s: 13 }), 13);
});

test('hold auto = clamp(4 + 14*1.15, 6, 24) ≈ 20.1 pour 14 lignes', () => {
  const lines = Array.from({ length: 14 }, () => ({ text: 'x' }));
  const h = computePageHoldSec({ lines });
  assert.equal(Math.round(h * 10) / 10, 20.1);
});

test('hold auto plancher à 6s (page courte)', () => {
  assert.equal(computePageHoldSec({ lines: [{ text: 'a' }] }), 6); // 4+1.15=5.15 -> clamp 6
});

test('hold auto plafond à 24s (page très dense)', () => {
  const lines = Array.from({ length: 24 }, () => ({ text: 'x' }));
  assert.equal(computePageHoldSec({ lines }), 24); // 4+27.6=31.6 -> clamp 24
});

test('computePageHolds renvoie une durée par page', () => {
  const holds = computePageHolds({ layout: 'long', pages: [{ lines: [{ text: 'a' }], hold_s: 10 }, { lines: [{ text: 'b' }], hold_s: 15 }] });
  assert.deepEqual(holds, [10, 15]);
});

test('computeDurationSec long = somme des holds', () => {
  const d = computeDurationSec({ layout: 'long', pages: [{ lines: [{ text: 'a' }], hold_s: 10 }, { lines: [{ text: 'b' }], hold_s: 12 }] });
  assert.equal(d, 22);
});

test('computeDurationSec long honore duration_s global si fourni', () => {
  const d = computeDurationSec({ layout: 'long', duration_s: 40, pages: [{ lines: [{ text: 'a' }], hold_s: 10 }] });
  assert.equal(d, 40);
});

test('NON-RÉGRESSION court : computeDurationSec sans layout = comportement historique', () => {
  // all_at_once 2 segments = 10s (inchangé)
  assert.equal(computeDurationSec({ reveal: 'all_at_once', segments: [1, 2] }), 10);
  // staggered 4 segments = 7.5s (inchangé)
  assert.equal(computeDurationSec({ reveal: 'staggered', segments: [1, 2, 3, 4] }), 7.5);
});

console.log(`\n\nRésultat : ${passed} OK / ${failed} fail / ${passed + failed} total`);
if (failed > 0) {
  console.error('\nÉchecs :');
  for (const f of fails) {
    console.error(`  - ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
}
console.log('\n✓ Tous les tests unitaires Node passent\n');
