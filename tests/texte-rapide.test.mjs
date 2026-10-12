// Le texte du premier écran arrive tout de suite (2026-10-12) : `export-reel.mjs` coupe l'amorce du
// navigateur à l'image près et refuse un mp4 dont le texte n'est pas lisible à 0,5 s. Lit les mp4 réels.
// Contrôles positifs : le contrôle refuse une vidéo où le texte arrive à 1,5 s, et une vidéo sans texte.
// Lance : `node tests/texte-rapide.test.mjs` (≈ 40 s, ffmpeg requis).
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exporter = path.join(root, 'echo-incarne/render/export-reel.mjs');
const dir = mkdtempSync(path.join(tmpdir(), 'texte-rapide-'));
try {
  const spec = path.join(dir, 't.json');
  writeFileSync(spec, JSON.stringify({slug: 't', segments: [
    {role: 'title', text: 'Votre corps [[réagit]]\navant vos mots.'}, {role: 'cta', text: 'Lisez la légende'}]}));
  const mesures = {};
  for (const template of ['reel-render.html', 'moteur-braise.html', 'moteur-fracture.html', 'moteur-manifeste.html']) {
    const out = path.join(dir, template);
    const r = spawnSync('node', [exporter, spec, '--platform=instagram', `--template=${template}`, `--out=${out}`],
      {cwd: root, encoding: 'utf8'});
    assert.equal(r.status, 0, template + ' : ' + r.stderr);
    const t = Number((r.stdout.match(/texte lisible à ([\d.]+) s/) || [])[1]);
    assert.ok(t <= 0.5, `${template} : texte lisible à ${t} s`);
    assert.ok(existsSync(path.join(out, 't-instagram.mp4')), template + ' : mp4 livré');
    mesures[template] = t;
  }
  // Le contrôle seul, sur un mp4 déjà rendu : accepte celui qu'on vient de produire.
  const controle = mp4 => spawnSync('node', [exporter, `--controle=${mp4}`], {cwd: root, encoding: 'utf8'});
  assert.equal(controle(path.join(dir, 'reel-render.html', 't-instagram.mp4')).status, 0, 'mp4 conforme accepté');
  // Contrôles positifs : une grille nette qui n'apparaît qu'à 1,5 s, puis un fond qui reste vide.
  const fabriquer = (nom, filtre) => {
    const mp4 = path.join(dir, nom);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xECE3D0:s=1080x1920:r=30:d=3',
      ...(filtre ? ['-vf', filtre] : []), '-pix_fmt', 'yuv420p', mp4]);
    assert.equal(r.status, 0, 'ffmpeg ' + nom);
    return mp4;
  };
  const tardif = controle(fabriquer('tardif.mp4', "drawgrid=w=40:h=40:t=2:c=black:enable='gte(t,1.5)'"));
  assert.equal(tardif.status, 1, 'texte à 1,5 s refusé : ' + tardif.stdout);
  assert.match(tardif.stdout, /texte lisible à 1\.50 s/);
  const vide = controle(fabriquer('vide.mp4', ''));
  assert.equal(vide.status, 1, 'vidéo sans texte refusée : ' + vide.stdout);
  assert.match(vide.stdout, /aucun texte lisible/);
  console.log(JSON.stringify({passed: 4 + 3, mesures}));
} finally { rmSync(dir, {recursive: true, force: true}); }
