// Calibration de la loi durée = f(volume) à partir des durées de page MESURÉES
// sur les 3 réels originaux (scene-change ffmpeg + confirmation visuelle).
// Sources :
//  - stoique  37.149s : cuts 11.067 / 24.133 -> 3 pages (11.07 / 13.07 / 12.99)
//  - verites  27.955s : cut 21.533           -> 2 pages (21.53 / 6.42)
//  - ressentir 57.072s: cuts 21.867 / 41.067 -> 3 pages (21.87 / 19.20 / 16.00)
//    (les cuts 14.47/36.33/54.93 = pulses du handle/bruit de fond, PAS des changements
//     de page : frames t13.5==t18 identiques, t22.5==t30 identiques, t42==t48 identiques.)
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripHighlights } from '../src/highlight.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reels = {
  stoique:   { file: 'reconstructions-top15/homme-stoique-homme-absent-long.json', durs: [11.07, 13.07, 12.99] },
  verites:   { file: 'reconstructions-top15/12-verites-sur-les-gens-long.json',    durs: [21.53, 6.42] },
  ressentir: { file: 'reconstructions-top15/homme-ne-sait-pas-ressentir-long.json', durs: [21.87, 19.20, 16.00] },
};

function pageVolumes(file){
  const spec = JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
  return spec.pages.map(p => {
    const txt = p.lines.map(l => stripHighlights(l.text)).join(' ').replace(/\s+/g,' ').trim();
    return { chars: txt.length, words: txt.split(/\s+/).filter(Boolean).length, nlines: p.lines.length };
  });
}

const rows = [];
console.log('reel,page,dur_s,chars,words,nlines,char/s,word/s');
for (const [name, r] of Object.entries(reels)){
  const vols = pageVolumes(r.file);
  vols.forEach((v,i) => {
    const d = r.durs[i];
    rows.push({ name, i:i+1, d, ...v });
    console.log(`${name},${i+1},${d.toFixed(2)},${v.chars},${v.words},${v.nlines},${(v.chars/d).toFixed(1)},${(v.words/d).toFixed(2)}`);
  });
}

// --- Régression linéaire dur = base + k*chars (moindres carrés) ---
function linreg(xs, ys){
  const n = xs.length, mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, den=0;
  for (let i=0;i<n;i++){ num += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)**2; }
  const k = num/den, base = my - k*mx;
  return { k, base };
}
const xs = rows.map(r=>r.chars), ys = rows.map(r=>r.d);
const { k, base } = linreg(xs, ys);
console.log(`\nRégression dur = ${base.toFixed(3)} + ${k.toFixed(5)}*chars`);
console.log(`=> vitesse ≈ ${(1/k).toFixed(1)} char/s, base ${base.toFixed(2)} s`);

// Moyennes simples char/s
const cps = rows.map(r=>r.chars/r.d);
const meanCps = cps.reduce((a,b)=>a+b,0)/cps.length;
console.log(`char/s moyen (toutes pages) ≈ ${meanCps.toFixed(1)}`);

// --- Évaluation d'une loi candidate dur = clamp(BASE + chars/SPEED, MIN, MAX) ---
function evalLaw(BASE, SPEED, MIN, MAX){
  const totals = {};
  let sse=0;
  for (const [name,r] of Object.entries(reels)){
    const vols = pageVolumes(r.file);
    let tot=0, totOrig=0;
    vols.forEach((v,i)=>{
      const auto = Math.min(MAX, Math.max(MIN, BASE + v.chars/SPEED));
      tot += auto; totOrig += r.durs[i];
      sse += (auto - r.durs[i])**2;
    });
    totals[name] = { mine: tot, orig: totOrig, pct: ((tot-totOrig)/totOrig*100) };
  }
  return { totals, rmse: Math.sqrt(sse/rows.length) };
}

console.log('\n--- Loi candidate dur = clamp(BASE + chars/SPEED, MIN, MAX) ---');
for (const cand of [
  { BASE: base, SPEED: 1/k, MIN: 5, MAX: 24 },     // régression brute
  { BASE: 2.0, SPEED: 17, MIN: 5, MAX: 26 },
  { BASE: 2.5, SPEED: 16, MIN: 5, MAX: 26 },
  { BASE: 3.0, SPEED: 15, MIN: 5, MAX: 26 },
]){
  const { totals, rmse } = evalLaw(cand.BASE, cand.SPEED, cand.MIN, cand.MAX);
  const parts = Object.entries(totals).map(([n,t])=>`${n} ${t.mine.toFixed(1)}/${t.orig.toFixed(1)} (${t.pct>=0?'+':''}${t.pct.toFixed(1)}%)`).join('  ');
  console.log(`BASE=${cand.BASE.toFixed(2)} SPEED=${cand.SPEED.toFixed(1)} MIN=${cand.MIN} MAX=${cand.MAX} | RMSE=${rmse.toFixed(2)}s | ${parts}`);
}

// --- Grid search fin sur (BASE, SPEED) minimisant RMSE, MIN/MAX fixés larges ---
console.log('\n--- Grid search (BASE, SPEED), MIN=4 MAX=26 ---');
let best=null;
for (let BASE=0; BASE<=4; BASE+=0.25){
  for (let SPEED=20; SPEED<=34; SPEED+=0.5){
    const { rmse, totals } = evalLaw(BASE, SPEED, 4, 26);
    const maxPct = Math.max(...Object.values(totals).map(t=>Math.abs(t.pct)));
    if (!best || rmse < best.rmse){ best = { BASE, SPEED, rmse, totals, maxPct }; }
  }
}
{
  const { BASE, SPEED, rmse, totals, maxPct } = best;
  const parts = Object.entries(totals).map(([n,t])=>`${n} ${t.mine.toFixed(1)}/${t.orig.toFixed(1)} (${t.pct>=0?'+':''}${t.pct.toFixed(1)}%)`).join('  ');
  console.log(`BEST RMSE: BASE=${BASE} SPEED=${SPEED} | RMSE=${rmse.toFixed(2)}s maxTotalErr=${maxPct.toFixed(1)}% | ${parts}`);
}

// --- Grid search minimisant l'erreur de durée TOTALE (ce que demande la mission) ---
console.log('\n--- Grid search min(maxTotalErr%) ---');
let best2=null;
for (let BASE=0; BASE<=4; BASE+=0.25){
  for (let SPEED=20; SPEED<=34; SPEED+=0.5){
    const { totals } = evalLaw(BASE, SPEED, 4, 26);
    const maxPct = Math.max(...Object.values(totals).map(t=>Math.abs(t.pct)));
    if (!best2 || maxPct < best2.maxPct){ best2 = { BASE, SPEED, totals, maxPct }; }
  }
}
{
  const { BASE, SPEED, totals, maxPct } = best2;
  const parts = Object.entries(totals).map(([n,t])=>`${n} ${t.mine.toFixed(1)}/${t.orig.toFixed(1)} (${t.pct>=0?'+':''}${t.pct.toFixed(1)}%)`).join('  ');
  console.log(`BEST TOTAL: BASE=${BASE} SPEED=${SPEED} | maxTotalErr=${maxPct.toFixed(1)}% | ${parts}`);
}

// --- Loi retenue : pure chars/SPEED + petit plancher, validation par page ---
function showPerPage(BASE, SPEED, MIN, MAX){
  console.log(`\n--- Détail par page : dur = clamp(${BASE} + chars/${SPEED}, ${MIN}, ${MAX}) ---`);
  console.log('reel,page,chars,auto_s,orig_s,delta_s');
  for (const [name,r] of Object.entries(reels)){
    const vols = pageVolumes(r.file);
    vols.forEach((v,i)=>{
      const auto = Math.min(MAX, Math.max(MIN, BASE + v.chars/SPEED));
      console.log(`${name},${i+1},${v.chars},${auto.toFixed(1)},${r.durs[i].toFixed(1)},${(auto-r.durs[i]).toFixed(1)}`);
    });
  }
}
showPerPage(1.5, 26.5, 4, 26);
