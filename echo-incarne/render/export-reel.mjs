// Export vidéo des réels typographiques « L'Écho Incarné » — 1080×1920.
// Lit un spec reels-specs/*.json, joue la séquence dans render/reel-render.html
// (Playwright, enregistrement vidéo natif), sort un .webm par plateforme,
// converti en .mp4 H.264 si ffmpeg est disponible.
//
// Usage :
//   npm i -D playwright && npx playwright install chromium
//   node render/export-reel.mjs reels-specs/mon-reel.json                       # instagram, thème papier
//   node render/export-reel.mjs reels-specs/mon-reel.json --platform=all        # ig + tiktok + youtube
//   node render/export-reel.mjs reels-specs/mon-reel.json --platform=youtube --theme=nuit --out=out/reels
//
// Spec attendu (format du vault) :
//   { "slug": "...", "reveal": "staggered", "segments": [ { "role": "title|block|cta", "text": "... [[pivot]] ..." } ] }

import { chromium } from 'playwright';
import { readFile, mkdir, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const specPath = args.find(a => !a.startsWith('--'));
const opt = (name, dflt) => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1] || dflt;

// Contrôle de sortie (2026-10-12, Cyrille : un réel dont le texte tarde ne retient personne, et en
// publicité c'est de l'argent perdu). Mesuré sur le mp4 final, pas sur ce que la page annonce :
// netteté (Sobel) de la zone de texte commune aux plateformes, image par image sur 2 s. Mesures :
// zone vide 0 à 0,5 ; balayage d'entrée seul 1,2 (1,8 au plus par construction) ; le plus petit
// texte du corpus (citation courte d'une story, 36 px) 3,3 ; un écran de réel 20 à 60. Le texte est
// lisible à la première image qui atteint NETTETE_TEXTE ; au-delà de TEXTE_MAX_S, le mp4 est refusé.
const TEXTE_MAX_S = 0.5;
const NETTETE_TEXTE = 2.5;
const ZONE_TEXTE = 'crop=760:920:104:440';
function texteLisibleS(mp4) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-t', '2', '-i', mp4, '-vf',
    `${ZONE_TEXTE},format=gray,sobel,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`,
    '-f', 'null', '-'], { encoding: 'utf8' });
  const i = [...String(r.stdout).matchAll(/YAVG=([\d.]+)/g)].findIndex(m => Number(m[1]) >= NETTETE_TEXTE);
  return i < 0 ? Infinity : i / 30;
}
const verdictTexte = t => Number.isFinite(t) ? `texte lisible à ${t.toFixed(2)} s` : 'aucun texte lisible dans les 2 premières secondes';
// Le même contrôle sur un mp4 déjà rendu : node render/export-reel.mjs --controle=<fichier.mp4>
if (opt('controle', '')) {
  const t = texteLisibleS(opt('controle'));
  console.log(`${t <= TEXTE_MAX_S ? '✓' : '✗'} ${verdictTexte(t)} (maximum ${TEXTE_MAX_S} s) : ${opt('controle')}`);
  process.exit(t <= TEXTE_MAX_S ? 0 : 1);
}
// Première image du réel dans le webm : celle qui suit la dernière image du rideau vert (0 = rideau absent).
function premiereImage(webm) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', webm, '-vf', 'crop=16:16:8:8,scale=1:1,format=rgb24',
    '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 });
  const px = r.stdout || [];
  let derniere = -1;
  for (let i = 0; i * 3 + 2 < px.length; i++) if (px[i * 3] < 90 && px[i * 3 + 1] > 170 && px[i * 3 + 2] < 90) derniere = i;
  return derniere + 1;
}

if (!specPath) {
  console.error('usage: node render/export-reel.mjs <spec.json> [--platform=instagram|tiktok|youtube|all] [--theme=papier|nuit] [--out=dir] [--story]\n       node render/export-reel.mjs --controle=<fichier.mp4>');
  process.exit(1);
}

const PLATFORMS_ALL = ['instagram', 'tiktok', 'youtube'];
const platformArg = opt('platform', 'instagram');
const platforms = platformArg === 'all' ? PLATFORMS_ALL : [platformArg];
const theme = opt('theme', 'papier');
const outDir = opt('out', 'out/reels');
// Moteur de rendu (2026-07-16) : défaut = Écho Incarné historique ; --template=moteur-braise.html
// (ou -fracture / -manifeste) pour les 3 nouvelles directions. Les 4 exposent la même interface.
const template = opt('template', 'reel-render.html');
// Piste audio (layout:audio, 2026-08-20) : WAV de l'extrait du livre audio, muxé en AAC
// dans le mp4 (-shortest). Sans --audio le mp4 reste muet (-an) comme avant.
const audioPath = opt('audio', '');
// Story mantra (2026-10-04) : --story rend l'écran d'une story (zone sûre de story, ni colonne ni
// barre encre). Le fichier garde son nom de plateforme (<slug>-instagram.mp4).
const story = args.includes('--story');
await mkdir(outDir, { recursive: true });

const spec = JSON.parse(await readFile(specPath, 'utf8'));
const slug = spec.slug || path.basename(specPath, '.json');

// Adaptateur schéma VAULT (2026-07-07) : les specs de production (reels-specs/*.json,
// écrites par studio_render depuis produce_reel) sont au format normalisé
// { pages: [{ lines: [{text, role: heading|body|cta}], arrow }] } — le moteur attend
// { segments: [{ role: title|block|cta, text }] }. Mapping : 1 page = 1 segment,
// heading→title (1re page) / block, page contenant une ligne cta → cta, textes des
// lignes joints. Les [[pivot]] traversent tels quels. hand_emoji ignoré (abandonné
// dans ce design, cf. mission §8).
if (!spec.segments && Array.isArray(spec.pages)) {
  spec.segments = spec.pages.map((p, i) => {
    const lines = (p.lines || []).filter(l => String(l.text || '').trim());
    const isCta = lines.some(l => String(l.role || '').toLowerCase() === 'cta');
    const isHeading = lines.every(l => String(l.role || '').toLowerCase() === 'heading');
    return {
      role: isCta ? 'cta' : (i === 0 && isHeading ? 'title' : 'block'),
      text: lines.map(l => String(l.text)).join('\n\n'),
      // hold_s de la page (durée imposée, ex. un écran relu en boucle) : prime sur la loi caractères÷27.
      ...(Number(p.hold_s) > 0 ? { hold_s: Number(p.hold_s) } : {}),
    };
  }).filter(s => s.text);
}

const STRUCTURED = ['message', 'confrontation', 'avantapres', 'timeline', 'liste', 'citation',
  'notes', 'calendrier', 'page', 'audio'];  // + dérivés pub (chantier 2026-08-20)
const isMessage = spec.layout === 'message';
const isConfrontation = spec.layout === 'confrontation';
const isStructured = STRUCTURED.includes(spec.layout);
if (!isStructured && (!Array.isArray(spec.segments) || !spec.segments.length)) {
  console.error(`✗ spec sans segments ni pages exploitables : ${specPath}`);
  process.exit(2);
}
// Validation minimale du champ porteur par layout structuré.
const NEED = { message: 'messages', avantapres: 'avant', timeline: 'steps', liste: 'items', citation: 'quote',
  notes: 'items', calendrier: 'blocks', page: 'paras', audio: 'words' };
if (isConfrontation && !(spec.top && spec.bottom)) {
  console.error(`✗ spec layout:confrontation sans top/bottom : ${specPath}`); process.exit(2);
}
if (NEED[spec.layout] && !spec[NEED[spec.layout]]) {
  console.error(`✗ spec layout:${spec.layout} sans « ${NEED[spec.layout]} » : ${specPath}`); process.exit(2);
}

// Même loi que la page : caractères ÷ 27, borné 4–26 s
const holdMs = seg => seg.hold_s > 0 ? seg.hold_s * 1000 : Math.min(26, Math.max(4, seg.text.replace(/\[\[|\]\]/g, '').length / 27)) * 1000;
// Durée RÉELLE pilotée par window.playReel (awaité au rendu) ; totalMs = estimation pour le log.
const msgReadMs = t => Math.min(4200, Math.max(1300, String(t || '').length / 22 * 1000));
const cfBottomReadMs = t => Math.min(5200, Math.max(2600, String(t || '').length / 20 * 1000));
const totalMs = isMessage
  ? spec.messages.reduce((a, m) => a + 650 + msgReadMs(m.text), 0) + 1600
  : isConfrontation
  ? 400 + 2600 + 650 + cfBottomReadMs((spec.bottom || {}).text) + 1600
  : isStructured ? 12000
  : spec.segments.reduce((a, s) => a + holdMs(s), 0);

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(path.join(here, template)).href + '?norun=1';

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const browser = await chromium.launch();

// Rendu d'UNE plateforme (contexte + enregistrement + conversion mp4). Isolé pour pouvoir
// exécuter les plateformes EN PARALLÈLE (fix masse 2026-07-15) : l'enregistrement est en temps
// réel (~la durée du réel), or c'était fait 3× en SÉQUENTIEL → ~2min40/réel. En parallèle
// (contextes indépendants, même navigateur), un réel passe à ~la durée d'UNE plateforme (×3).
async function renderPlatform(platform) {
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
  });
  // Rideau vert plein cadre, du chargement de la page au départ du jeu : il marque dans la vidéo
  // elle-même où commence le réel. L'horloge ne le donne pas : l'amorce enregistrée a duré jusqu'à
  // 1,8 s de plus que le temps mesuré, autant d'écran vide en tête des mp4 (pub-kit du 2026-10-12).
  await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const r = document.createElement('div'); r.id = 'rideauExport';
    r.style.cssText = 'position:fixed;inset:0;background:#00ff00;z-index:2147483647';
    document.body.append(r);
  }));
  const page = await ctx.newPage();
  await page.goto(pageUrl);
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.fonts, face => face.load()));
    await document.fonts.ready;
  });
  await page.evaluate(({ s, o }) => window.loadReel(s, o), { s: spec, o: { platform: story ? 'story' : platform, theme } });
  // Page au repos, rideau tenu : sous charge la capture tombe à 2-4 images/s, et un rideau jamais
  // filmé laisse le début du réel inconnu (1 rendu sur 126 à 200 ms, six captures en parallèle).
  await page.waitForTimeout(600);
  // Délai début du mp4 → début du karaoké : l'amorce interne de playAudio (AUDIO_LEAD_MS).
  const leadMs = await page.evaluate(() => window.AUDIO_LEAD_MS || 0);
  // Rideau retiré dans la tâche qui lance le jeu : la première image sans rideau est la première du réel.
  await page.evaluate(() => { document.getElementById('rideauExport').remove(); return window.playReel(); });
  await page.waitForTimeout(800);  // laisse le CTA respirer en fin
  const video = page.video();
  await ctx.close();               // finalise l'enregistrement

  const webm = path.join(outDir, `${slug}-${platform}${theme === 'nuit' ? '-nuit' : ''}.webm`);
  await rename(await video.path(), webm);

  if (hasFfmpeg) {
    const mp4 = webm.replace(/\.webm$/, '.mp4');
    const debut = premiereImage(webm);
    if (!debut) throw new Error(`rideau de départ introuvable dans ${webm} : début du réel inconnu, mp4 non produit`);
    const coupe = `select='gte(n,${debut})',setpts=PTS-STARTPTS`;
    const ffArgs = audioPath
      ? ['-y', '-i', webm, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-vf', coupe, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
         '-r', '30', '-af', `adelay=${Math.max(0, Math.round(leadMs))}:all=1,apad`, '-c:a', 'aac', '-b:a', '160k',
         '-shortest', '-movflags', '+faststart', mp4]
      : ['-y', '-i', webm, '-vf', coupe, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-an', mp4];
    const r = spawnSync('ffmpeg', ffArgs, { stdio: 'ignore' });
    if (r.status !== 0) {
      process.exitCode = 1; // le pipeline attend les .mp4 : échec ffmpeg = run en échec (2026-07-07)
      console.error(`✗ conversion mp4 échouée, webm conservé : ${webm}`);
      return;
    }
    const t = texteLisibleS(mp4);
    if (t > TEXTE_MAX_S) {
      await rm(mp4); // un mp4 refusé ne reste pas sur le disque : aucun appelant ne peut le publier
      throw new Error(`${verdictTexte(t)} (maximum ${TEXTE_MAX_S} s) : mp4 refusé, webm conservé : ${webm}`);
    }
    console.log(`✓ ${mp4} (${verdictTexte(t)})`);
  } else {
    console.log(`✓ ${webm}  (mp4 : ffmpeg -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart out.mp4)`);
  }
}

// Plateformes en parallèle. Un échec de plateforme n'arrête pas les autres (exitCode posé,
// run marqué en échec) — le pipeline attend les 3 mp4.
await Promise.all(platforms.map(p => renderPlatform(p).catch(e => {
  process.exitCode = 1;
  console.error(`✗ ${p} : ${(e && e.message) || e}`);
})));

await browser.close();
console.log(`Durée séquence : ${(totalMs / 1000).toFixed(1)} s (${isStructured ? 'layout:' + spec.layout : spec.segments.length + ' segments'}, loi caractères÷27 bornée 4–26 s)`);
