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
import { readFile, mkdir, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const specPath = args.find(a => !a.startsWith('--'));
const opt = (name, dflt) => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1] || dflt;
if (!specPath) {
  console.error('usage: node render/export-reel.mjs <spec.json> [--platform=instagram|tiktok|youtube|all] [--theme=papier|nuit] [--out=dir]');
  process.exit(1);
}

const PLATFORMS_ALL = ['instagram', 'tiktok', 'youtube'];
const platformArg = opt('platform', 'instagram');
const platforms = platformArg === 'all' ? PLATFORMS_ALL : [platformArg];
const theme = opt('theme', 'papier');
const outDir = opt('out', 'out/reels');
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
      text: lines.map(l => String(l.text)).join('\n'),
    };
  }).filter(s => s.text);
}

if (!Array.isArray(spec.segments) || !spec.segments.length) {
  console.error(`✗ spec sans segments ni pages exploitables : ${specPath}`);
  process.exit(2);
}

// Même loi que la page : caractères ÷ 27, borné 4–26 s
const holdMs = seg => Math.min(26, Math.max(4, seg.text.replace(/\[\[|\]\]/g, '').length / 27)) * 1000;
const totalMs = spec.segments.reduce((a, s) => a + holdMs(s), 0);

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(path.join(here, 'reel-render.html')).href + '?norun=1';

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const browser = await chromium.launch();

for (const platform of platforms) {
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
  });
  const page = await ctx.newPage();
  await page.goto(pageUrl);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ s, o }) => window.loadReel(s, o), { s: spec, o: { platform, theme } });
  await page.waitForTimeout(1200); // pose du chrome (pastille, handle)
  await page.evaluate(() => window.playReel());
  await page.waitForTimeout(800);  // laisse le CTA respirer en fin
  const video = page.video();
  await ctx.close();               // finalise l'enregistrement

  const webm = path.join(outDir, `${slug}-${platform}${theme === 'nuit' ? '-nuit' : ''}.webm`);
  await rename(await video.path(), webm);

  if (hasFfmpeg) {
    const mp4 = webm.replace(/\.webm$/, '.mp4');
    const r = spawnSync('ffmpeg', ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-r', '30', '-movflags', '+faststart', '-an', mp4], { stdio: 'ignore' });
    if (r.status !== 0) {
      process.exitCode = 1; // le pipeline attend les .mp4 : échec ffmpeg = run en échec (2026-07-07)
      console.error(`✗ conversion mp4 échouée, webm conservé : ${webm}`);
    } else console.log(`✓ ${mp4}`);
  } else {
    console.log(`✓ ${webm}  (mp4 : ffmpeg -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart out.mp4)`);
  }
}

await browser.close();
console.log(`Durée séquence : ${(totalMs / 1000).toFixed(1)} s (${spec.segments.length} segments, loi caractères÷27 bornée 4–26 s)`);
