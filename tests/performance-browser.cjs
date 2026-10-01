const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
(async()=>{
 const browser=process.env.BELRE_BROWSER_ENGINE==='webkit'?await webkit.launch({headless:true}):await chromium.launch({channel:'chrome',headless:true});
 const checks=[],errors=[];
 try{
  const p=await browser.newPage({viewport:{width:1440,height:1000}});
  p.on('pageerror',error=>errors.push(error.message));
  await p.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false,freeUntil:'2026-10-06T22:00:00.000Z'}}));
  await p.goto(base+'/index.html');await p.locator('#belre-site-nav').waitFor();
  assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/summary-data\.mjs/.test(e.name)).length),0);
  checks.push('Home laadt de leerstofbank niet.');
  await p.locator('#belre-site-nav a[href="#pagina/sam/c12"]').click();await p.locator('.summary-objectives').waitFor();
  assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/summary-data\.mjs/.test(e.name)).length),1);
  const first=await p.locator('[data-summary-section]').first().getAttribute('data-summary-section');
  await p.evaluate(()=>window.performanceSummaryApp=document.querySelector('[data-summary-app]'));
  await p.locator('#summary-search-input').fill('belastingplicht');
  await p.locator('#belre-site-nav a[href="#pagina/home"]').click();
  await p.locator('#belre-site-nav a[href="#pagina/sam"]').click();await p.locator('.summary-objectives').waitFor();
  assert.equal(await p.evaluate(()=>document.querySelector('[data-summary-app]')===window.performanceSummaryApp),true);
  assert.equal(await p.locator('#summary-search-input').inputValue(),'belastingplicht');
  await p.locator('[data-summary-section="'+first+'"]>summary').click();
  const isOpen=await p.locator('[data-summary-section="'+first+'"]').evaluate(n=>n.open);
  await p.locator('#belre-site-nav a[href="#pagina/home"]').click();await p.locator('#belre-site-nav a[href="#pagina/sam"]').click();
  assert.equal(await p.locator('[data-summary-section="'+first+'"]').evaluate(n=>n.open),isOpen);
  await p.locator('#summary-search-input').fill('renteaftrek');assert.ok(await p.locator('[data-summary-jump]').count());
  checks.push('Terugkeren behoudt dezelfde leerstofweergave, zoektekst, uitklapstand en werkende bediening.');
  await p.locator('#belre-site-nav a[href="#pagina/beslisbomen"]').click();await p.locator('.decision-directory-card').first().waitFor();
  assert.equal(await p.locator('.decision-directory-card').count(),25);
  await p.locator('.decision-directory-open').first().click();await p.waitForFunction(()=>document.querySelector('[data-summary-tree][open]'));
  checks.push('Alle 25 beslisbomen en hun directe routes blijven beschikbaar.');
  await p.locator('#belre-site-nav a[href="/oefenen/#oefenen"]').click();
  const frame=p.frameLocator('#belre-course-frame');await frame.locator('[data-mc="start-test"]').waitFor().catch(async error=>{
   console.error(await p.evaluate(()=>{const f=document.getElementById('belre-course-frame'),w=f?.contentWindow,d=w?.document;return {hash:location.hash,frameHidden:f?.hidden,courseHash:w?.location.hash,ready:!!w?.BelrePractice,mcHidden:d?.getElementById('mc-app')?.hidden,start:d?.getElementById('start')?.innerText};}));throw error;
  });
  await p.waitForFunction(()=>{const w=document.getElementById('belre-course-frame').contentWindow;return !!w.CafaExams&&!!w.CafaCalculator;});
  assert.equal(await p.evaluate(()=>document.getElementById('belre-course-frame').contentWindow.CourseCalculatorOptions.storageKey),'belre3-calculator-history-v1');
  checks.push('Parallel opgehaalde scripts starten MC, tentamens en rekenmachine in de juiste volgorde.');
  const models=await p.evaluate(async()=>{
   const w=document.getElementById('belre-course-frame').contentWindow;
   const {createAnswerModels}=await import('/oefenen/js/answer-models.mjs');let calls=0;
   const q=w.CAFA2_EXAMS[0].questions.find(q=>q.type==='open'),renderer=createAnswerModels([{questions:[q]}],html=>{calls++;return w.CafaAnswerEditor.sanitize(html);});
   if(calls!==0)throw Error('Modellen worden vooraf verwerkt.');
   const first=renderer.render(q.id,q.solutionHtml,q.solution),firstCalls=calls;
   const second=renderer.render(q.id,q.solutionHtml,q.solution),secondCalls=calls-firstCalls;
   const other=renderer.render(q.id,'<p>Een afwijkend oud model.</p>','');
   return {same:first===second,checkedOnce:firstCalls===secondCalls+1,scored:first.includes('exam-model-max-points'),otherUnscored:!other.includes('exam-model-max-points'),otherPreserved:other.includes('Een afwijkend oud model.')};
  });
  assert.deepEqual(models,{same:true,checkedOnce:true,scored:true,otherUnscored:true,otherPreserved:true});
  checks.push('Antwoordmodelcontrole gebeurt bij gebruik, wordt hergebruikt en vervangt geen afwijkend oud model.');
  const original=execFileSync('git',['show','5bac8127dba11b97cf5fb6972c541cc3b9232504:oefenen/js/answer-models.mjs'],{maxBuffer:1024*1024}).toString('utf8').replace("'./answer-model-core.mjs'","'/oefenen/js/answer-model-core.mjs'");
  await p.route('**/baseline-answer-models.mjs',route=>route.fulfill({body:original,contentType:'text/javascript'}));
  const compared=await p.evaluate(async()=>{
   const w=document.getElementById('belre-course-frame').contentWindow;
   const before=await import('/baseline-answer-models.mjs'),after=await import('/oefenen/js/answer-models.mjs');
   const sanitize=html=>w.CafaAnswerEditor.sanitize(html),a=before.createAnswerModels(w.CAFA2_EXAMS,sanitize),b=after.createAnswerModels(w.CAFA2_EXAMS,sanitize);
   let count=0;for(const exam of w.CAFA2_EXAMS)for(const q of exam.questions){
    if(a.render(q.id,q.solutionHtml,q.solution)!==b.render(q.id,q.solutionHtml,q.solution))throw Error('Modelweergave gewijzigd: '+q.id);
    count++;
   }return count;
  });
  assert.equal(compared,336);checks.push('Alle 336 antwoordmodellen behouden exact dezelfde HTML-weergave.');
  await p.goto(base+'/index.html#pagina/sam/c3-lening');await p.locator('.summary-objectives').waitFor();
  assert.equal(await p.locator('.summary-topics [aria-pressed="true"]').getAttribute('data-topic'),'c3-lening');
  assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/summary-data\.mjs/.test(e.name)).length),1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({checks,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
