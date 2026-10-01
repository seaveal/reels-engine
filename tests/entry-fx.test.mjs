import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch(),results=[];
try {
 const page=await browser.newPage({viewport:{width:1080,height:1920}});
 for(const template of ['moteur-manifeste.html','moteur-braise.html','moteur-fracture.html','reel-render.html']){
  await page.goto(pathToFileURL(path.join(root,'echo-incarne/render',template)).href+'?norun=1');
  await page.evaluate(async()=>Promise.all([...document.fonts].map(f=>f.load())));
  for(const platform of ['instagram','tiktok','youtube']) for(const theme of ['papier','nuit']){
   const metrics=await page.evaluate(async({platform,theme})=>{
    const spec={segments:[{role:'block',text:'Votre corps [[réagit]].\n\nAvant vos mots.'},{role:'cta',text:'Lisez la légende'}]};
    loadReel(spec,{platform,theme});showSegment(0);
    const page=document.getElementById('page'),before=page.getBoundingClientRect();
    playReelEntry(CFG);await new Promise(r=>requestAnimationFrame(r));
    const fx=document.getElementById('reelEntryFx'),a=fx.firstElementChild.getAnimations()[0];
    a.pause();a.currentTime=150;
    const rect=fx.getBoundingClientRect(),after=page.getBoundingClientRect();
    const result={zone:CFG.Z,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,duration:a.effect.getTiming().duration,color:getComputedStyle(fx.firstElementChild).backgroundColor,transform:getComputedStyle(fx.firstElementChild).transform,unchanged:before.width===after.width&&before.height===after.height,text:page.textContent};
    window.testEntryAnimation=a;return result;
   },{platform,theme});
   assert.equal(metrics.duration,420);assert.ok(metrics.unchanged);
   assert.ok(metrics.left>=metrics.zone.left&&metrics.right<=1080-metrics.zone.right);
   assert.ok(metrics.top>=metrics.zone.top&&metrics.bottom<=1920-metrics.zone.bottom);
   assert.notEqual(metrics.transform,'none');
   if(process.env.ENTRY_EVIDENCE && platform==='instagram' && theme==='papier') await page.screenshot({path:path.join(process.env.ENTRY_EVIDENCE,template+'-150ms.png')});
   await page.evaluate(async()=>{testEntryAnimation.finish();await testEntryAnimation.finished;await Promise.resolve();});
   assert.equal(await page.locator('#reelEntryFx').count(),0);
   await page.evaluate(async()=>{playReelEntry(CFG);playReelEntry({...CFG,spec:{entry_fx:false}});await new Promise(r=>requestAnimationFrame(r));});
   assert.equal(await page.locator('#reelEntryFx').count(),0);
   results.push({template,platform,theme,...metrics});
  }
  // The public playback entrypoint triggers the effect too (not only the helper).
  await page.evaluate(()=>{loadReel({segments:[{role:'block',text:'Un premier texte.'}]});void playReel();});
  await page.waitForSelector('#reelEntryFx',{state:'attached'});
 }
 console.log(JSON.stringify({passed:results.length,playbackEntrypoints:4}));
 if(process.env.ENTRY_EVIDENCE)writeFileSync(path.join(process.env.ENTRY_EVIDENCE,'entry-check.json'),JSON.stringify(results,null,2));
} finally {await browser.close();}
