const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769',out=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/library-browser');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await (process.env.BELRE_BROWSER_ENGINE==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
 const checks=[],errors=[];
 try{
  const p=await browser.newPage({viewport:{width:1914,height:1026}});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('belre3-document-panel-v1',JSON.stringify({width:36})));
  await p.route('**/api/study-status',r=>r.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
  await p.goto(base+'/index.html#omgeving/bronnen');const f=p.frameLocator('#belre-course-frame');
  await f.locator('[data-source-id="pdf-40cd187402607edf"]').click();
  const dialog=f.locator('#exam-original-solutions');await dialog.locator('iframe').waitFor();
  const geo=()=>f.locator('body').evaluate(()=>{
   const r=document.getElementById('exam-original-solutions').getBoundingClientRect(),l=document.querySelector('.study-assistant-layout').getBoundingClientRect(),list=document.querySelector('.study-assistant-primary').getBoundingClientRect();
   return {pdf:r.width,height:r.height,top:r.top,bottom:r.bottom,layout:l.width,list:list.width,view:innerWidth,viewHeight:innerHeight,header:document.querySelector('.learning-page-head').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1,stacked:document.querySelector('.study-assistant-layout').classList.contains('is-stacked')};
  });
  await p.waitForTimeout(200);const desktop=await geo();
  assert.ok(desktop.layout>1600,JSON.stringify(desktop));assert.ok(desktop.pdf>1200,JSON.stringify(desktop));assert.ok(desktop.height>800);assert.ok(desktop.list>=240);assert.equal(desktop.overflow,false);
  assert.ok(desktop.top>=desktop.header-1);assert.ok(desktop.bottom<=desktop.viewHeight+1);
  const pdf=f.frameLocator('#exam-original-solutions iframe');await pdf.locator('.page[data-page-number="1"] canvas').waitFor();
  const pdfWindow=await (await dialog.locator('iframe').elementHandle()).contentFrame();
  await pdfWindow.waitForFunction(()=>window.CafaPdfReader?.ready);
  await pdf.locator('#pageNumber').fill('2');await pdf.locator('#pageNumber').press('Enter');
  await pdfWindow.waitForFunction(()=>window.PDFViewerApplication?.pdfViewer.getPageView(1)?.renderingState===3);
  await p.screenshot({path:path.join(out,'library-desktop.png')});checks.push({desktop});
  const separator=f.locator('.study-assistant-resizer');await separator.focus();await p.keyboard.press('End');assert.equal(await separator.getAttribute('aria-valuenow'),'85');
  assert.ok((await geo()).pdf>desktop.pdf);await p.keyboard.press('Home');assert.equal(await separator.getAttribute('aria-valuenow'),'75');
  const preferences=await f.locator('body').evaluate(()=>({exam:JSON.parse(localStorage.getItem('belre3-document-panel-v1')).width,library:JSON.parse(localStorage.getItem('belre3-source-panel-v1')).width}));assert.deepEqual(preferences,{exam:36,library:75});
  await f.locator('#exam-original-solutions [data-pdf-close]:visible').click();await f.locator('[data-source-id="pdf-40cd187402607edf"]').click();assert.equal(await separator.getAttribute('aria-valuenow'),'75');
  checks.push('Breedte instellen, sluiten en heropenen bewaren de bronvoorkeur en wijzigen geen tentamenvoorkeur');
  for(const size of [{width:900,height:900},{width:393,height:852},{width:393,height:460}]){
   await p.setViewportSize(size);await p.waitForTimeout(200);const g=await geo();assert.equal(g.overflow,false,JSON.stringify(g));assert.ok(g.top>=g.header-1,JSON.stringify(g));assert.ok(g.bottom<=g.viewHeight+2,JSON.stringify(g));
   if(size.width===393){assert.ok(g.stacked);assert.ok(g.pdf>=size.width-40);}
   const close=dialog.locator('[data-pdf-close]:visible');assert.ok(await close.isVisible());
   const hit=await close.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});assert.ok(hit);
   checks.push({viewport:size,geometry:g});if(size.height===852)await p.screenshot({path:path.join(out,'library-mobile.png')});
  }
  await p.setViewportSize({width:1914,height:1026});await f.locator('body').evaluate(()=>location.hash='#welkom/belre3-20260608');
  await f.getByRole('button',{name:'Toets starten',exact:true}).click();await f.locator('[data-original-pdf="solutions"]:visible').click();
  await separator.waitFor();assert.equal(await separator.getAttribute('aria-valuenow'),'36');assert.equal(await separator.getAttribute('aria-valuemax'),'50');
  assert.equal(await f.locator('body').evaluate(b=>b.classList.contains('belre-sources-page')),false);
  const editor=f.frameLocator('.tox-edit-area iframe').locator('body');await editor.fill('Controle van behoud van de antwoordeditor.');
  await f.locator('#exam-original-solutions [data-pdf-close]:visible').click();assert.match(await editor.innerText(),/behoud/);
  checks.push('Tentamen behoudt zijn eigen paneelbreedte en de antwoordeditor blijft werken');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
