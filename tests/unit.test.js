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
import { normalisePages, SIZE_MUL } from '../src/pages.js';
import { parseHighlights, stripHighlights, parseInline, stripInline } from '../src/highlight.js';
import { safeBox, safeBoxLong, SAFE_LONG, ICON_SAFE_RIGHT, computeDurationSec, computeDurationFrames, computePageHoldSec, computePageHolds, computePageHoldFrames, pageCharCount, PAGE_CHARS_PER_SEC, FPS } from '../src/constants.js';
import { normaliseTypography, NNBSP, WORD_SPLIT_RE } from '../src/typography.js';

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

console.log('\n=== parseInline / stripInline (jaune [[..]] + gras **..**) ===');

test('parseInline [[mot]] → span jaune non-gras', () => {
  const out = parseInline('avant [[mot]] après');
  assert.deepEqual(out.map((p) => [p.text, p.yellow, p.bold]), [
    ['avant ', false, false],
    ['mot', true, false],
    [' après', false, false],
  ]);
});

test('parseInline **mot** → span gras non-jaune', () => {
  const out = parseInline('un **gras** ici');
  assert.deepEqual(out.map((p) => [p.text, p.yellow, p.bold]), [
    ['un ', false, false],
    ['gras', false, true],
    [' ici', false, false],
  ]);
});

test('parseInline [[**mot**]] → span jaune ET gras (imbriqué)', () => {
  const out = parseInline('[[**punch**]]');
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'punch');
  assert.equal(out[0].yellow, true);
  assert.equal(out[0].bold, true);
});

test('parseInline **[[mot]]** → jaune ET gras (ordre inverse)', () => {
  const out = parseInline('**[[punch]]**');
  assert.equal(out[0].yellow, true);
  assert.equal(out[0].bold, true);
});

test('parseInline texte nu → 1 span neutre', () => {
  const out = parseInline('rien');
  assert.deepEqual(out, [{ text: 'rien', yellow: false, bold: false }]);
});

test('stripInline retire [[ ]] et ** (mesure auto-fit)', () => {
  assert.equal(stripInline('a [[b]] **c** [[**d**]]'), 'a b c d');
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

console.log('\n=== safeBoxLong (format long : marges mesurées + safe icônes IG) ===');

test('safeBoxLong = marges SAFE_LONG v4 (left 0.11 non rabotée / right 0.10 / top 0.155 / bottom 0.16)', () => {
  const sb = safeBoxLong(1080, 1920);
  assert.equal(sb.x, Math.round(SAFE_LONG.left * 1080));   // 0.11 -> 119
  assert.equal(sb.y, Math.round(0.155 * 1920));            // 298
  assert.equal(sb.width, Math.round(1080 * (1 - SAFE_LONG.left - SAFE_LONG.right))); // 0.79 -> 853
  assert.equal(sb.height, Math.round(1920 * (1 - 0.155 - 0.16))); // 1315
  // marge gauche restaurée à la médiane des originaux (~0.11), non plus 0.09 rabotée
  assert.ok(SAFE_LONG.left >= 0.105);
});

test('safeBoxLong expose la garde icônes IG (right + moitié basse)', () => {
  const sb = safeBoxLong(1080, 1920);
  assert.equal(sb.iconSafeRight, Math.round(ICON_SAFE_RIGHT * 1080)); // 151
  assert.equal(sb.iconZoneTopY, Math.round(0.50 * 1920));             // 960
});

test('safeBoxLong responsive (proportions) pour 540×960', () => {
  const sb = safeBoxLong(540, 960);
  assert.equal(sb.x, Math.round(SAFE_LONG.left * 540));
  assert.equal(sb.width, Math.round(540 * (1 - SAFE_LONG.left - SAFE_LONG.right)));
});

test('format long occupe plus de vertical que le court (top plus haut, bottom plus bas)', () => {
  assert.ok(SAFE_LONG.top < 0.17);     // démarre plus haut que le court
  assert.ok(SAFE_LONG.bottom < 0.22);  // descend plus bas que le court
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

test('page cta line → kind=cta, gras par défaut (CTA original = CAPS gras crème)', () => {
  const out = normalisePages([{ lines: [{ text: 'LISEZ LA LÉGENDE', role: 'cta' }] }]);
  assert.equal(out[0].lines[0].kind, 'cta');
  assert.equal(out[0].lines[0].bold, true);
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

console.log('\n=== normalisePages : size / align / arrow (fidélité visuelle) ===');

test('défauts par rôle : body = m / left, heading = l / center, cta = s / center', () => {
  const out = normalisePages([{ lines: [
    { text: 'corps' },
    { text: 'HOOK', role: 'heading' },
    { text: 'CTA', role: 'cta' },
  ] }]);
  const [body, head, cta] = out[0].lines;
  assert.equal(body.sizeMul, SIZE_MUL.m); assert.equal(body.align, 'left');
  assert.equal(head.sizeMul, SIZE_MUL.l); assert.equal(head.align, 'center');
  assert.equal(cta.sizeMul, SIZE_MUL.s); assert.equal(cta.align, 'center');
});

test('cta gras par défaut (couleur crème gérée au rendu)', () => {
  const out = normalisePages([{ lines: [{ text: 'LISEZ', role: 'cta' }] }]);
  assert.equal(out[0].lines[0].bold, true);
});

test('size explicite mappe sur le multiplicateur', () => {
  const out = normalisePages([{ lines: [{ text: 'x', size: 'xl' }] }]);
  assert.equal(out[0].lines[0].sizeMul, SIZE_MUL.xl);
});

test('align explicite (justify) honoré sur le corps', () => {
  const out = normalisePages([{ lines: [{ text: 'x', align: 'justify' }] }]);
  assert.equal(out[0].lines[0].align, 'justify');
});

test('arrow:true propagé sur la page ; absent = false', () => {
  const out = normalisePages([{ lines: [{ text: 'x' }], arrow: true }, { lines: [{ text: 'y' }] }]);
  assert.equal(out[0].arrow, true);
  assert.equal(out[1].arrow, false);
});

console.log('\n=== normalisePages : color (titre full-jaune / défauts par rôle) ===');

test('couleur par défaut : body/heading = white, cta = cream', () => {
  const out = normalisePages([{ lines: [
    { text: 'corps' },
    { text: 'HOOK', role: 'heading' },
    { text: 'CTA', role: 'cta' },
  ] }]);
  const [body, head, cta] = out[0].lines;
  assert.equal(body.color, 'white');
  assert.equal(head.color, 'white');
  assert.equal(cta.color, 'cream');
});

test('color:yellow force un TITRE ENTIÈREMENT JAUNE (fix bug verites/ressentir)', () => {
  const out = normalisePages([{ lines: [{ text: 'TITRE JAUNE', role: 'heading', color: 'yellow' }] }]);
  assert.equal(out[0].lines[0].color, 'yellow');
});

test('color:white force un titre BLANC malgré le rôle (réel stoique)', () => {
  const out = normalisePages([{ lines: [{ text: 'Titre blanc', color: 'white', bold: true }] }]);
  assert.equal(out[0].lines[0].color, 'white');
  assert.equal(out[0].lines[0].bold, true);
});

test('color inconnue lève une erreur explicite', () => {
  assert.throws(
    () => normalisePages([{ lines: [{ text: 'x', color: 'rouge' }] }]),
    /color inconnu : rouge/,
  );
});

console.log('\n=== normalisePages : style PAR PARAGRAPHE v4 (letter_spacing / space_after) ===');

test('défauts v4 : letterSpacing=null, spaceAfter=null (rétrocompat, comportement v3)', () => {
  const out = normalisePages([{ lines: [{ text: 'corps' }] }]);
  assert.equal(out[0].lines[0].letterSpacing, null);
  assert.equal(out[0].lines[0].spaceAfter, null);
});

test('letter_spacing numérique honoré (positif et négatif)', () => {
  const out = normalisePages([{ lines: [
    { text: 'a', letter_spacing: 0.02 },
    { text: 'b', letter_spacing: -0.01 },
  ] }]);
  assert.equal(out[0].lines[0].letterSpacing, 0.02);
  assert.equal(out[0].lines[1].letterSpacing, -0.01);
});

test('letter_spacing non-numérique ignoré → null (défaut robuste)', () => {
  const out = normalisePages([{ lines: [{ text: 'a', letter_spacing: 'wide' }] }]);
  assert.equal(out[0].lines[0].letterSpacing, null);
});

test('space_after numérique >=0 honoré (0 inclus)', () => {
  const out = normalisePages([{ lines: [
    { text: 'a', space_after: 0.3 },
    { text: 'b', space_after: 0 },
  ] }]);
  assert.equal(out[0].lines[0].spaceAfter, 0.3);
  assert.equal(out[0].lines[1].spaceAfter, 0);
});

test('space_after négatif ignoré → null (gap par défaut)', () => {
  const out = normalisePages([{ lines: [{ text: 'a', space_after: -1 }] }]);
  assert.equal(out[0].lines[0].spaceAfter, null);
});

test('size+bold restent des attributs paragraphe (acquis v3 conservé)', () => {
  const out = normalisePages([{ lines: [{ text: 'x', size: 'xl', bold: true }] }]);
  assert.equal(out[0].lines[0].sizeMul, SIZE_MUL.xl);
  assert.equal(out[0].lines[0].bold, true);
});

console.log('\n=== pageCharCount / computePageHoldSec (loi de timing char-volume) ===');

test('pageCharCount = caractères visibles (markup retiré, espaces normalisés)', () => {
  // "Un [[mot]] **gras**" -> "Un mot gras" = 11 chars
  const n = pageCharCount({ lines: [{ text: 'Un [[mot]] **gras**' }] });
  assert.equal(n, 'Un mot gras'.length);
});

test('pageCharCount joint les lignes par un espace', () => {
  const n = pageCharCount({ lines: [{ text: 'abc' }, { text: 'de' }] });
  assert.equal(n, 'abc de'.length); // 6
});

test('hold_s explicite override la loi de timing', () => {
  assert.equal(computePageHoldSec({ lines: [{ text: 'a' }], hold_s: 13 }), 13);
});

test('hold auto = chars / 27 (loi dérivée du volume)', () => {
  // 270 chars utiles -> 270/27 = 10s pile
  const text = 'x'.repeat(270);
  const h = computePageHoldSec({ lines: [{ text }] });
  assert.equal(Math.round(h * 100) / 100, 270 / PAGE_CHARS_PER_SEC);
});

test('hold auto plancher à 4s (page très courte)', () => {
  assert.equal(computePageHoldSec({ lines: [{ text: 'ab' }] }), 4); // 2/27<4 -> 4
});

test('hold auto plafond à 26s (page très dense)', () => {
  const text = 'x'.repeat(1000); // 1000/27=37 -> clamp 26
  assert.equal(computePageHoldSec({ lines: [{ text }] }), 26);
});

test('hold auto colle aux durées observées (ressentir p1 ~567 chars ≈ 21s)', () => {
  const h = computePageHoldSec({ lines: [{ text: 'x'.repeat(567) }] });
  assert.equal(Math.round(h), 21); // original mesuré 21.9s
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

console.log('\n=== computeDurationFrames (FIX FIN : dernière page jusqu\'à la dernière frame) ===');

test('long : durée composition = SOMME EXACTE des frames de page (pas de frame orpheline)', () => {
  // Cas reproduisant le bug ressentir : holds dont la somme arrondie par page < round(total*FPS).
  const spec = { layout: 'long', pages: [
    { lines: [{ text: 'a' }], hold_s: 21.148 },
    { lines: [{ text: 'b' }], hold_s: 17.111 },
    { lines: [{ text: 'c' }], hold_s: 13.741 },
  ] };
  const perPage = computePageHoldFrames(spec); // [634, 513, 412]
  const sum = perPage.reduce((a, b) => a + b, 0); // 1559
  assert.equal(computeDurationFrames(spec), sum);
  // v3 buggé : round(52.0*30)=1560 > 1559 → 1 frame vide. v4 : 1559 (pas de queue vide).
  assert.equal(sum, 1559);
  assert.notEqual(sum, Math.round(52.0 * FPS));
});

test('long : duration_s global prime sur la somme des frames', () => {
  const d = computeDurationFrames({ layout: 'long', duration_s: 40, pages: [{ lines: [{ text: 'a' }], hold_s: 10 }] });
  assert.equal(d, Math.round(40 * FPS));
});

test('NON-RÉGRESSION court : computeDurationFrames = round(durée*FPS)', () => {
  assert.equal(computeDurationFrames({ reveal: 'all_at_once', segments: [1, 2] }), Math.round(10 * FPS));
  assert.equal(computeDurationFrames({ reveal: 'staggered', segments: [1, 2, 3, 4] }), Math.round(7.5 * FPS));
});

// ===== v5 : normalisation typographique (anti ponctuation orpheline) =====
test('typo : fine insécable insérée avant ? ! ; : (espace sécable)', () => {
  assert.equal(normaliseTypography('les gens ?'), `les gens${NNBSP}?`);
  assert.equal(normaliseTypography('vraiment !'), `vraiment${NNBSP}!`);
  assert.equal(normaliseTypography('voilà : oui'), `voilà${NNBSP}: oui`);
  assert.equal(normaliseTypography('attends ; puis'), `attends${NNBSP}; puis`);
});

test('typo : ponctuation double collée au mot reçoit aussi la fine insécable', () => {
  assert.equal(normaliseTypography('Pourquoi?'), `Pourquoi${NNBSP}?`);
});

test('typo : aucun « mot » purement ponctuation après normalisation', () => {
  const out = normaliseTypography('Vous voulez connaître les gens ?');
  assert.ok(!/ [?!;:]/.test(out), 'plus d\'espace sécable avant la ponctuation double');
  const words = out.split(WORD_SPLIT_RE);
  assert.ok(words.every((w) => !/^[?!;:.,…]+$/.test(w)), 'aucun mot purement ponctuation');
});

test('typo : idempotent', () => {
  const once = normaliseTypography('les gens ?');
  assert.equal(normaliseTypography(once), once);
});

test('typo : markup [[ ]] ** préservé', () => {
  assert.equal(
    normaliseTypography('[[**Vous voulez connaître les gens ?**]]'),
    `[[**Vous voulez connaître les gens${NNBSP}?**]]`,
  );
});

test('typo : WORD_SPLIT_RE ne coupe pas sur la fine insécable', () => {
  assert.deepEqual(`a${NNBSP}?`.split(WORD_SPLIT_RE), [`a${NNBSP}?`]);
  assert.deepEqual('a b'.split(WORD_SPLIT_RE), ['a', 'b']);
});

test('typo : normalisePages applique la normalisation au text rendu', () => {
  const [page] = normalisePages([{ lines: [{ text: 'les gens ?' }] }]);
  assert.equal(page.lines[0].text, `les gens${NNBSP}?`);
});

test('NON-RÉGRESSION : texte sans ponctuation double inchangé', () => {
  assert.equal(normaliseTypography('Les vrais voient sans juger.'), 'Les vrais voient sans juger.');
  assert.equal(normaliseTypography('un mot, deux mots'), 'un mot, deux mots');
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
