import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'echo-incarne/render');
const specs=process.argv.slice(2).length?process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8'))):[{slug:'spacing-regression',pages:[{lines:[{text:'Une première phrase.\n\nUne seconde phrase.',role:'heading'},{text:'Un autre [[bloc]].',role:'body'},{text:'La dernière idée.',role:'body'}]},{lines:[{text:'Lisez la légende',role:'cta'}]}]}];
const exporter=readFileSync(path.join(dir,'export-reel.mjs'),'utf8');
const adapter=exporter.slice(exporter.indexOf('if (!spec.segments && Array.isArray(spec.pages))'),exporter.indexOf('const STRUCTURED'));
const adapt=new Function('spec',adapter+';return spec;');
const browser=await chromium.launch();const results=[];
try {
 for(const template of ['moteur-manifeste.html','moteur-braise.html','moteur-fracture.html','reel-render.html']){
  for(const source of specs){
   const spec=adapt(structuredClone(source));
   assert.equal(spec.segments[0].text,source.pages[0].lines.map(l=>l.text).join('\n\n'));
   for(const platform of ['instagram','tiktok','youtube']){
    const page=await browser.newPage({viewport:{width:1080,height:1920}});
    await page.goto(pathToFileURL(path.join(dir,template)).href+'?norun=1');
    await page.evaluate(async()=>{await Promise.all(Array.from(document.fonts,face=>face.load()));});
    await page.evaluate(({spec,platform})=>{window.loadReel(spec,{platform});showSegment(0);},{spec,platform});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{showSegment(0);document.querySelectorAll('#page .segLine').forEach(el=>{el.style.opacity='1';el.style.transform='none';});});
    if(template==='reel-render.html') await page.waitForTimeout(900);
    const metrics=await page.evaluate(()=>{
      const page=document.getElementById('page'),content=page.querySelector('.segFit')||page.firstElementChild;
      const r=content.getBoundingClientRect(),bounds=page.getBoundingClientRect();
      const availableHeight=Number(content.dataset.availableHeight), availableWidth=Number(content.dataset.availableWidth);
      const chosen=parseFloat(getComputedStyle(content).fontSize),wrapper=page.firstElementChild;
      // Le bouton suit la taille du texte (Cyrille 2026-10-02) : un pixel de plus vaut pour les deux.
      content.style.fontSize=(chosen+1)+'px';
      if(window.__ctaZone) window.fitReelCta(window.__ctaZone,chosen+1);
      const largerFits=wrapper.scrollHeight<=page.clientHeight-2&&wrapper.scrollWidth<=availableWidth;
      content.style.fontSize=chosen+'px';
      if(window.__ctaZone) window.fitReelCta(window.__ctaZone,chosen);
      return {availableHeight,availableWidth,largerFits,text:content.textContent,fontSize:parseFloat(getComputedStyle(content).fontSize),height:content.scrollHeight,width:content.scrollWidth,clientWidth:content.clientWidth,top:r.top,bottom:r.bottom,pageBottom:bounds.bottom,ctaTop:document.getElementById('ctaRow').offsetTop,safeBottom:1920-parseFloat(getComputedStyle(page.parentElement).paddingBottom),lines:[...page.querySelectorAll('.segLine')].map(el=>({text:el.textContent,margin:parseFloat(getComputedStyle(el).marginTop)})),whiteSpace:getComputedStyle(content).whiteSpace};
    });
    assert.ok(metrics.availableHeight>0);
    assert.equal(metrics.largerFits,false,template+' must use maximum size');
    assert.ok(metrics.width<=metrics.clientWidth+1,template+' width');
    assert.ok(metrics.bottom<=Math.min(metrics.safeBottom,metrics.ctaTop-24),template+' height '+JSON.stringify(metrics));
    if(template==='reel-render.html'){
      assert.equal(metrics.whiteSpace,'pre-line');assert.ok(metrics.text.includes('\n\n'));
    } else {
      const expected=spec.segments[0].text.split('\n').filter(s=>s.trim());
      assert.deepEqual(metrics.lines.map(l=>l.text),expected.map(s=>s.replace(/\[\[|\]\]/g,'')));
      assert.ok(metrics.lines.slice(1).every(l=>l.margin>=metrics.fontSize-.1),'visible blank line between blocks');
      // The direct browser adapter must match the CLI adapter.
      const direct=await page.evaluate(s=>adaptSpec(s).segments[0].text,structuredClone(source));
      assert.equal(direct,spec.segments[0].text);
    }
    results.push({template,slug:source.slug,platform,...metrics});
    if(process.env.SPACING_EVIDENCE && platform==='instagram'){
      await page.waitForTimeout(1000);
      await page.screenshot({path:path.join(process.env.SPACING_EVIDENCE,source.slug+'-'+template+'.png')});
    }
    await page.close();
   }
  }
 }
 console.log(JSON.stringify({passed:results.length,results},null,2));
 if(process.env.SPACING_EVIDENCE)writeFileSync(path.join(process.env.SPACING_EVIDENCE,'spacing-check.json'),JSON.stringify(results,null,2));
} finally {await browser.close();}
