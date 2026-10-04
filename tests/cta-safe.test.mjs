import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const render=path.join(root,'echo-incarne/render');
const browser=await chromium.launch();
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1080,height:1920}});
 await page.goto(pathToFileURL(path.join(render,'moteur-manifeste.html')).href+'?norun=1');
 const samples=await page.evaluate(()=>Object.values(DEMOS));
 for(const file of process.argv.slice(2)) samples.push(JSON.parse(readFileSync(file,'utf8')));
 samples.push({slug:'cta-long',segments:[{role:'block',text:'Un texte court.'},{role:'cta',text:'La suite de cette histoire vous attend dans la légende'}]});
 for(const template of ['moteur-manifeste.html','moteur-braise.html','moteur-fracture.html','reel-render.html']){
  await page.goto(pathToFileURL(path.join(render,template)).href+'?norun=1');
  await page.evaluate(async()=>{await Promise.all(Array.from(document.fonts,face=>face.load()));});
  for(const theme of ['papier','nuit']) for(const platform of ['instagram','tiktok','youtube']) for(const source of samples){
   const spec=structuredClone(source);
   if(!spec.segments&&spec.pages) spec.segments=spec.pages.map(p=>({role:p.lines.some(l=>l.role==='cta')?'cta':'block',text:p.lines.map(l=>l.text).join('\n\n')}));
   await page.evaluate(({spec,platform,theme})=>{
    window.loadReel(spec,{platform,theme});
    if(spec.segments) for(let i=0;i<spec.segments.length;i++) showSegment(i);
    const row=document.getElementById('ctaRow');
    row.style.transition='none';row.style.opacity='1';row.style.transform='none';
   },{spec,platform,theme});
   const m=await page.evaluate(()=>{
    const row=document.getElementById('ctaRow'),cap=document.getElementById('ctaCapsule');
    const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const chosen=parseFloat(getComputedStyle(cap).fontSize),available=Number(cap.dataset.availableWidth);
    const r=rect(cap),range=document.createRange();range.selectNodeContents(cap);
    const text=rect({getBoundingClientRect:()=>range.getBoundingClientRect()});
    cap.style.fontSize=(chosen+1)+'px';const largerFits=cap.getBoundingClientRect().width<=available;cap.style.fontSize=chosen+'px';
    const seg=document.querySelector('#page [data-max-font-size]');let segRef=null;if(seg&&seg.dataset.bouton==='borne'){const pg=document.getElementById('page');window.fitReelSegment(pg,seg,false);segRef=Number(seg.dataset.maxFontSize);window.fitReelSegment(pg,seg,true);}const bands=document.getElementById('platformBands');const cs=getComputedStyle(cap);const lh=parseFloat(cs.lineHeight)||chosen*1.12;return {zone:CFG.Z,lines:Math.round(text.height/lh),capOverflow:text.width-(cap.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)),cap:r,text,children:[...row.children].map(rect),fontSize:chosen,largerFits,whiteSpace:getComputedStyle(cap).whiteSpace,label:cap.textContent,spacers:document.querySelectorAll('#ctaSpace').length,segSize:seg?Number(seg.dataset.maxFontSize):null,segRef,plancher:Number(cap.dataset.ctaPlancher)||0,lignesAuPlancher:(()=>{if(!seg)return 0;const f=cap.style.fontSize;cap.style.fontSize=Math.min(Number(seg.dataset.maxFontSize),Number(cap.dataset.ctaPlancher)||1)+'px';const rr=document.createRange();rr.selectNodeContents(cap);const n=Math.round(rr.getBoundingClientRect().height/(parseFloat(getComputedStyle(cap).lineHeight)||1));cap.style.fontSize=f;return n;})(),bands:bands?[...bands.children].map(rect):null};
   });
   const label=`${template} ${platform} ${theme} ${source.slug}`;
   assert.equal(m.spacers,1,label+' duplicate spacer');
   // Bandes encre (Cyrille 2026-10-02) : colonne à droite, barre en bas, jamais sous le bouton.
   assert.ok(m.bands&&m.bands.length===2,label+' ink bands');
   if(platform==='instagram'){
    // Intention, mesurée sur la capture de Cyrille du 2026-10-04 (px vidéo), indépendante des cotes du code.
    const [col,barre]=m.bands, CAP={coeurHaut:1113,iconesX:957.5,bordVisible:1026,vignetteHaut:1685,nomHaut:1689,U:81};
    assert.ok(col.top<CAP.coeurHaut-10&&col.top>CAP.coeurHaut-CAP.U,label+' column starts just above the heart');
    assert.ok(Math.abs((col.left+CAP.bordVisible)/2-CAP.iconesX)<=4,label+' icons centred in the visible column');
    assert.ok(barre.top<=CAP.nomHaut&&barre.top>=CAP.vignetteHaut-10,label+' account name on the dark bar, bar not above the photo');
    assert.ok(m.cap.bottom<=CAP.vignetteHaut-10&&m.cap.bottom>=CAP.vignetteHaut-CAP.U,label+' button set just above the profile photo');
    assert.ok(m.cap.right<=col.left-10&&1080-m.zone.right<=col.left-10,label+' button and text clear of the column');
   } else {
    // TikTok/YouTube : réglages du 2026-10-02, inchangés (colonne 932 pleine hauteur, barre 1640).
    assert.ok(Math.abs(m.bands[0].left-932)<.5&&m.bands[0].top===0&&Math.abs(m.bands[1].top-1640)<.5,label+' bands position');
    assert.ok(m.cap.right<=932&&m.cap.bottom<=1640,label+' button clear of bands');
   }
   assert.ok(m.capOverflow<=1,label+' button label inside its capsule');
   const segmented=!!m.segSize;
   if(segmented){
    // Réel à segments (Cyrille 2026-10-02) : bouton aussi gros que le texte, sur 2 lignes au plus pour un
    // libellé de 28 caractères ou moins (3 au-delà). Le bouton ne fait jamais rapetisser le texte : celui-ci
    // a la taille du calcul sans bouton ; c'est le bouton qui réduit, jamais sous le plancher du moteur
    // (une ligne de plus permise quand le plancher est atteint).
    assert.equal(m.whiteSpace,'normal',label+' wrapping allowed');
    if(m.segRef!==null) assert.equal(m.segSize,m.segRef,label+' text keeps the size it has without the button');
    assert.ok(m.fontSize<=m.segSize,label+` button no larger than text (${m.fontSize}/${m.segSize})`);
    assert.ok(m.plancher>0&&m.fontSize>=Math.min(m.segSize,m.plancher),label+` button not below the engine floor (${m.fontSize}/${m.plancher})`);
    // Lignes : 2 (≤ 28 car.) ou 3 ; une de plus seulement si, au plancher, le libellé ne tient pas sur ses
    // lignes de base. Un libellé ≤ 28 car. ne dépasse jamais 3 lignes.
    const base=m.label.trim().length<=28?2:3;
    if(m.lines>base) assert.ok(m.lignesAuPlancher>base,label+` extra button line only when the floor needs it (${m.lines} lines, ${m.lignesAuPlancher} at floor)`);
    if(base===2) assert.ok(m.lines<=3,label+` short label on 3 lines at most (${m.lines})`);
   } else {
    assert.equal(m.whiteSpace,'nowrap',label+' wrapping');
    assert.equal(m.largerFits,false,label+' maximum size');
   }
   assert.ok(Math.abs(m.cap.bottom-(1920-m.zone.bottom))<.1,label+' safe bottom');
   for(const r of [...m.children,m.text]){
    assert.ok(r.left>=m.zone.left-.1 && r.right<=1080-m.zone.right+.1,label+' safe width');
    assert.ok(r.top>=m.zone.top-.1 && r.bottom<=1920-m.zone.bottom+.1,label+' safe height');
   }
   if(!segmented) assert.ok(m.text.height< m.fontSize*1.5,label+' text must have one line');
   results.push({template,platform,theme,slug:source.slug,...m});
   if(process.env.CTA_EVIDENCE && source.slug.startsWith('ig-hook-') && theme==='papier'){
    await page.evaluate(()=>document.querySelectorAll('#page .segLine').forEach(el=>{el.style.opacity='1';el.style.transform='none';}));
    await page.waitForTimeout(950);
    await page.screenshot({path:path.join(process.env.CTA_EVIDENCE,source.slug+'-'+template+'-'+platform+'.png')});
   }
  }
 }
 console.log(JSON.stringify({passed:results.length}));
 if(process.env.CTA_EVIDENCE)writeFileSync(path.join(process.env.CTA_EVIDENCE,'cta-check.json'),JSON.stringify(results,null,2));
} finally {await browser.close();}
