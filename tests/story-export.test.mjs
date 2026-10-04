// Story mantra de bout en bout (2026-10-04) : `export-reel.mjs --story` rend une vidéo sans bandes encre,
// d'environ 5 s ; sans `--story`, la même spec porte les bandes (contrôle positif). Lit le mp4 réel.
// Lance : `node tests/story-export.test.mjs` (≈ 20 s, ffmpeg requis).
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(path.join(tmpdir(), 'story-export-'));
try {
  const spec = path.join(dir, 's.json');
  writeFileSync(spec, JSON.stringify({slug: 's', layout: 'citation', quote: 'La tête comprend. Le corps répare.'}));
  const rendre = (out, extra) => {
    const r = spawnSync('node', [path.join(root, 'echo-incarne/render/export-reel.mjs'), spec, '--platform=instagram',
      `--out=${out}`, ...extra], {cwd: root, encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);
    const mp4 = path.join(out, 's-instagram.mp4');   // le nom ne change pas avec --story
    const duree = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
      {encoding: 'utf8'}).stdout);
    // Dernière image, bande du bas (y 1720-1900) et bord droit (x 1000-1080) en niveaux de gris bruts.
    const px = zone => spawnSync('ffmpeg', ['-v', 'error', '-sseof', '-0.1', '-i', mp4, '-frames:v', '1',
      '-vf', `crop=${zone},format=gray`, '-f', 'rawvideo', '-'], {maxBuffer: 1 << 26}).stdout;
    const sombre = buf => buf.filter(v => v < 80).length / buf.length;
    return {duree, barre: sombre(px('800:180:0:1720')), colonne: sombre(px('80:300:1000:1300'))};
  };
  const story = rendre(path.join(dir, 'story'), ['--story']);
  const reel = rendre(path.join(dir, 'reel'), []);
  assert.ok(story.barre < .01 && story.colonne < .01, 'story : aucune bande ' + JSON.stringify(story));
  assert.ok(reel.barre > .9 && reel.colonne > .9, 'contrôle positif : bandes sans --story ' + JSON.stringify(reel));
  assert.ok(story.duree >= 4.3 && story.duree <= 6, 'story : environ 5 s ' + JSON.stringify(story));
  console.log(JSON.stringify({passed: 3, story, reel}));
} finally { rmSync(dir, {recursive: true, force: true}); }
