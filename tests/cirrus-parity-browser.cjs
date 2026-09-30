const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const belre=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769',reference=process.env.CAFA_REFERENCE_URL;
if(!reference)throw Error('Stel CAFA_REFERENCE_URL in op de lokaal uitgecheckte openbare referentie.');
for(const url of [belre,reference])if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Gebruik lokale testomgevingen.');
const out=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/cirrus-parity');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true}),checks=[];
 try{
 const a=await b.newPage({viewport:{width:1440,height:1000}}),p=await b.newPage({viewport:{width:1440,height:1000}});
 await a.goto(reference+'/#dashboard',{waitUntil:'domcontentloaded'});await a.waitForFunction(()=>window.CafaExams?.catalog.length);
 const id=await a.evaluate(()=>CafaExams.catalog.find(e=>!e.demo&&e.questions[0].type==='open').id);
 await a.evaluate(id=>location.hash='#welkom/'+id,id);await a.locator('[data-exam-action="start"]').click();
 await a.locator('.tox-edit-area iframe').waitFor();
 await p.goto(belre+'/index.html#omgeving/'+encodeURIComponent('welkom/belre3-20260608'),{waitUntil:'domcontentloaded'});
 const f=p.frameLocator('#belre-course-frame');await f.locator('[data-exam-action="start"]').click();await f.locator('.tox-edit-area iframe').waitFor();
 const af=a.mainFrame(),bf=await p.locator('#belre-course-frame').elementHandle().then(e=>e.contentFrame());
 const selectors=['.topbar','.cirrus-page-head','.exam-case-layout','.exam-case-panel','.cirrus-work-pane','.exam-question-body','.exam-work-head','.exam-footer','.exam-answer-label','.exam-answer-actions'];
 const styles=['fontFamily','fontSize','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','display','borderTopWidth','borderRightWidth','borderBottomWidth','backgroundColor'];
 async function snapshot(frame){return frame.evaluate(({selectors,styles})=>Object.fromEntries(selectors.map(s=>{const n=document.querySelector(s),css=getComputedStyle(n),r=n.getBoundingClientRect();return[s,{styles:Object.fromEntries(styles.map(k=>[k,css[k]])),rect:{x:r.x,y:r.y,width:r.width,height:r.height}}];})),{selectors,styles});}
 for(const size of [{width:1440,height:1000},{width:393,height:852}]){
  await a.setViewportSize(size);await p.setViewportSize(size);await a.waitForTimeout(300);
  const left=await snapshot(af),right=await snapshot(bf),diff=[];
  for(const s of selectors)for(const key of styles)if(left[s].styles[key]!==right[s].styles[key])diff.push({selector:s,property:key,cafa:left[s].styles[key],belre:right[s].styles[key]});
  fs.writeFileSync(path.join(out,'vergelijking-'+size.width+'.json'),JSON.stringify({left,right,diff},null,2));
  await a.screenshot({path:path.join(out,'cafa2-'+size.width+'.png')});await p.screenshot({path:path.join(out,'belre3-'+size.width+'.png')});
  console.log(JSON.stringify({viewport:size.width,diff}));
  assert.deepEqual(diff,[],'Cirrus basisstijlen verschillen');
  if(size.width>760){for(const s of ['.topbar','.exam-case-layout','.exam-case-panel','.cirrus-work-pane','.exam-footer']){assert.ok(Math.abs(left[s].rect.x-right[s].rect.x)<2,s+' x');assert.ok(Math.abs(left[s].rect.width-right[s].rect.width)<2,s+' width');}}
  checks.push({viewport:size.width,components:selectors.length,font:right['.exam-question-body'].styles.fontFamily});
 }
 await p.setViewportSize({width:1440,height:1000});
 for(const kind of ['questions','solutions']){
  const button=f.locator('[data-original-pdf="'+kind+'"]:visible');assert.ok(await button.evaluate(n=>!!n.closest('.exam-footer')));
  await button.click();await f.locator('[data-pdf-close="'+kind+'"]:visible').waitFor();await f.locator('[data-pdf-close="'+kind+'"]:visible').click();
 }
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,pdfButtons:'footer; both open and close'},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
