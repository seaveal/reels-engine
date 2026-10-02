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
    const seg=document.querySelector('#page [data-max-font-size]');const bands=document.getElementById('platformBands');return {zone:CFG.Z,cap:r,text,children:[...row.children].map(rect),fontSize:chosen,largerFits,whiteSpace:getComputedStyle(cap).whiteSpace,label:cap.textContent,spacers:document.querySelectorAll('#ctaSpace').length,segSize:seg?Number(seg.dataset.maxFontSize):null,bands:bands?[...bands.children].map(rect):null};
   });
   const label=`${template} ${platform} ${theme} ${source.slug}`;
   assert.equal(m.spacers,1,label+' duplicate spacer');
   // Bandes encre (Cyrille 2026-10-02) : colonne à droite, barre en bas, jamais sous le bouton.
   assert.ok(m.bands&&m.bands.length===2,label+' ink bands');
   // Instagram : colonne à 930 px depuis 1140 px (au-dessus du cœur), barre à 1690 ; TikTok/YouTube : 932, pleine hauteur, 1640.
   const B=platform==='instagram'?{x:930,haut:1140,barre:1690}:{x:932,haut:0,barre:1640};
   assert.ok(Math.abs(m.bands[0].left-B.x)<.5&&Math.abs(m.bands[0].top-B.haut)<.5&&Math.abs(m.bands[1].top-B.barre)<.5,label+' bands position');
   assert.ok(m.cap.right<=B.x&&m.cap.bottom<=B.barre,label+' button clear of bands');
   const segmented=!!m.segSize;
   if(segmented){
    // Réel à segments : le bouton prend la taille du texte, plusieurs lignes permises.
    assert.equal(m.whiteSpace,'normal',label+' wrapping allowed');
    assert.equal(m.fontSize,m.segSize,label+' button as large as reel text');
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
