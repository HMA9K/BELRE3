const assert=require('node:assert/strict');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8850';

// Fresh browser profiles only. Accelerate the existing idle-release callback;
// production still releases hidden readers after sixty seconds.
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
 try{for(const width of [1440,393]){
  const p=await browser.newPage({viewport:{width,height:1000}});
  p.on('pageerror',error=>errors.push(error.message));
  await p.addInitScript(()=>{const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===60000?1800:ms,...args);});
  await p.route('**/collect.js*',r=>r.abort());await p.route('**/gc.zgo.at/**',r=>r.abort());
  await p.route('**/api/study-status',r=>r.fulfill({json:{ready:false,authenticated:false,freeAccess:true}}));
  await p.goto(base+'/index.html#omgeving/welkom%2Fbelre3-20260608');
  const f=p.frameLocator('#belre-course-frame');await f.locator('[data-exam-action="start"]').waitFor();
  await p.evaluate(()=>{
   const w=document.getElementById('belre-course-frame').contentWindow;
   const exam=w.CafaExams.catalog.find(e=>e.id==='belre3-20260608');
   const a=w.CafaExamEngine.createAttempt(exam,{id:'pdf-position-check',untimed:true});a.currentIndex=1;
   a.answers[exam.questions[1].id]={text:'Bewaard antwoord',html:'<p>Bewaard antwoord</p>'};
   localStorage.setItem('belre3-full-exams-v1',JSON.stringify({version:1,attempts:[a]}));
  });
  await p.goto(base+'/index.html#omgeving/tentamen%2Fpdf-position-check');
  const readers={solutions:'#exam-original-solutions iframe',questions:'.original-pdf-left-viewer iframe'};
  async function open(kind){
   await f.locator('[data-original-pdf="'+kind+'"]:visible').click();
   const pdf=await (await f.locator(readers[kind]).elementHandle()).contentFrame();
   await pdf.waitForFunction(()=>window.CafaPdfReader?.ready);
   await pdf.waitForFunction(()=>PDFViewerApplication.isInitialViewSet&&PDFViewerApplication.pdfViewer.pageViewsReady&&!window.CafaPdfContentView?.restoring);
   await pdf.waitForFunction(()=>{const v=PDFViewerApplication.pdfViewer;return v.getPageView(v.currentPageNumber-1)?.renderingState===3;});
   await p.waitForTimeout(450);return pdf;
  }
  const state=pdf=>pdf.evaluate(()=>{
   const v=PDFViewerApplication.pdfViewer;
   return {page:v.currentPageNumber,top:v.container.scrollTop,scale:v.currentScale,offset:v._location?.top,stored:localStorage.getItem('belre3-pdf-view-v1:'+CafaPdfReader.key)};
  });
  async function scroll(pdf,page){
   await pdf.evaluate(page=>PDFViewerApplication.pdfViewer.currentPageNumber=page,page);
   await pdf.waitForFunction(page=>PDFViewerApplication.pdfViewer.getPageView(page-1)?.renderingState===3,page);
   await p.waitForTimeout(300);
   await pdf.evaluate(()=>PDFViewerApplication.pdfViewer.container.scrollTop+=125);
   await p.waitForTimeout(200);return state(pdf);
  }
  const close=kind=>f.locator('[data-pdf-close="'+kind+'"]:visible').click();
  const same=(actual,expected,label)=>{
   assert.equal(actual.page,expected.page,label+' page');
   assert.ok(Math.abs(actual.top-expected.top)<5,label+' scroll '+JSON.stringify({actual,expected}));
   assert.ok(Math.abs(actual.scale-expected.scale)<.001,label+' zoom');
  };
  const positions={};
  for(const kind of ['solutions','questions']){
   let pdf=await open(kind);const before=await scroll(pdf,kind==='solutions'?3:2);positions[kind]=before;
   await close(kind);await p.waitForTimeout(300);
   assert.equal((await state(pdf)).scale,before.scale,'hidden viewport must not change zoom');
   pdf=await open(kind);same(await state(pdf),before,kind+' reopen');
   if(kind==='solutions'){
    await f.locator('[data-pdf-close="solutions"]').focus();await p.keyboard.press('Escape');
    await p.waitForTimeout(250);pdf=await open(kind);same(await state(pdf),before,'Escape reopen');
   }
   // Close synchronously while text bounds are still being awaited.
   await pdf.evaluate(kind=>{
    void CafaPdfContentView.focus({fit:true});
    parent.document.querySelector('[data-pdf-close="'+kind+'"]').click();
   },kind);
   await p.waitForTimeout(250);pdf=await open(kind);same(await state(pdf),before,kind+' pending fit');
   await close(kind);await p.waitForTimeout(2400);
   assert.equal(await f.locator(readers[kind]).count(),0,'idle reader released');
   pdf=await open(kind);const restored=await state(pdf);
   assert.equal(restored.page,before.page,kind+' recreated page');
   assert.ok(Math.abs(restored.offset-before.offset)<5,kind+' recreated offset '+JSON.stringify({before,restored}));
   await close(kind);
  }
  await p.reload();await f.locator('[data-original-pdf="solutions"]').waitFor();
  const pdf=await open('solutions');const restored=await state(pdf);assert.equal(restored.page,3,'reload saved page');
  assert.ok(Math.abs(restored.offset-positions.solutions.offset)<5,'reload saved offset');
  const stored=await p.evaluate(()=>document.getElementById('belre-course-frame').contentWindow.CafaExams.getAttempt('pdf-position-check'));
  assert.match(JSON.stringify(stored.answers),/Bewaard antwoord/);
  console.log(JSON.stringify({width,closeAndEscape:true,idleRecreation:true,reload:true,questionsAndSolutions:true,answersPreserved:true}));
  await p.close();
 }}finally{await browser.close();}
 assert.deepEqual(errors,[]);
})().catch(error=>{console.error(error);process.exit(1)});
