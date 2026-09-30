const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769',out=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/course-browser');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
 try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('br3-theme-mode','dark'));
 await p.route('**/api/study-status',r=>r.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false,freeUntil:'2026-10-06T22:00:00.000Z'}}));
 await p.goto(base+'/index.html');await p.waitForSelector('#belre-site-nav');
 // Production adds privacy controls to the host as well as the course frame.
 await p.addScriptTag({url:base+'/js/privacy.js'});await p.evaluate(()=>StudyPrivacy.setMode('owner'));
 async function checkPrivacyControl(){
  const count=await p.evaluate(()=>{const visible=n=>!!n?.getClientRects().length;const frame=document.getElementById('belre-course-frame');return Number(visible(document.getElementById('study-privacy-control')))+Number(visible(frame)&&visible(frame.contentDocument.getElementById('study-privacy-control')));});
  assert.equal(count,1,'Exactly one visible privacy control');
 }
 await checkPrivacyControl();
 for(const size of [{width:1440,height:1000},{width:393,height:852}]){
 await p.setViewportSize(size);
 const widths=[];
 for(const id of ['home','sam','kleur','art','paars','tent','exam','oef']){
  await p.evaluate(id=>sp(id),id);
  const dimensions=await p.evaluate(()=>{const page=document.querySelector('.pg.vis'),r=page.getBoundingClientRect();return {width:r.width,top:r.top,overflow:document.documentElement.scrollWidth>innerWidth+1,theme:document.body.dataset.theme};});
  assert.equal(dimensions.theme,'light');assert.equal(dimensions.overflow,false,id+' overflow');widths.push(dimensions.width);
 }
 assert.equal(new Set(widths).size,1);
 checks.push('Acht leerpagina’s dezelfde breedte, vaste lichte weergave, geen horizontale pagina-overloop bij '+size.width+'px');
 await p.evaluate(()=>sp('home'));await p.screenshot({path:path.join(out,'home-'+size.width+'.png')});
 }
 await p.getByRole('button',{name:/Navigatie/}).first().click();assert.equal(await p.locator('#belre-main').getAttribute('inert'),'');
 await p.locator('#belre-site-nav a[href="#pagina/sam/c8"]').click();
 await p.waitForSelector('.summary-colleges [data-college="c8"][aria-pressed="true"]');assert.equal(await p.locator('#belre-main').getAttribute('inert'),null);
 checks.push('Mobiele navigatie opent, wisselt naar het juiste college en geeft de pagina vrij');
 await p.setViewportSize({width:1440,height:1000});
 await p.locator('#belre-site-nav a[href="/oefenen/#oefenen"]').click();
 const f=p.frameLocator('#belre-course-frame');await f.locator('[data-mc="start-test"]').waitFor();
 await p.evaluate(()=>window.initialFrame=document.getElementById('belre-course-frame'));
 await f.locator('[data-mc-filter="college"]').selectOption('3');await f.locator('[data-mc="start-test"]').click();
 await f.locator('[name="mc-choice"]').first().waitFor({state:'attached'});
 await checkPrivacyControl();
 async function checkPracticeNavigation(){
  await p.waitForFunction(()=>document.getElementById('belre-site-nav').hidden);
  assert.equal(await f.locator('[data-belre-nav-toggle]').isVisible(),false);
  const layout=await p.evaluate(()=>{const d=document.getElementById('belre-course-frame').contentDocument,w=d.defaultView,r=d.getElementById('app-content').getBoundingClientRect();return {reserved:getComputedStyle(document.documentElement).getPropertyValue('--belre-nav-width'),left:r.left,right:r.right,width:w.innerWidth,overflow:d.documentElement.scrollWidth>w.innerWidth+1,inert:document.getElementById('belre-course-frame').inert};});
  assert.equal(layout.reserved,'0px');assert.ok(layout.left<16&&layout.right>layout.width-16,JSON.stringify(layout));assert.equal(layout.overflow,false);assert.equal(layout.inert,false);
 }
 await checkPracticeNavigation();
 await p.setViewportSize({width:393,height:852});await checkPracticeNavigation();
 await p.setViewportSize({width:1440,height:1000});
 await p.screenshot({path:path.join(out,'mc-zonder-navigatie.png')});
 const selection=await p.evaluate(()=>{const w=document.getElementById('belre-course-frame').contentWindow,q=w.BelrePractice.current().question;return {id:q.id,correct:q.correctOptionId,wrong:q.options.find(o=>o.id!==q.correctOptionId).id};});
 await f.getByText('Zelf uitwerken',{exact:true}).click();await f.locator('[data-mc-own]').fill('Mijn berekening blijft bij deze vraag.');
 await f.locator('[name="mc-choice"][value="'+selection.wrong+'"]').check({force:true});await f.getByRole('heading',{name:'Dit antwoord klopt niet',exact:true}).waitFor();
 await f.locator('[data-self-review]').selectOption('partial');
 await f.locator('[data-mc="next"]').click();await f.locator('[data-mc="previous"]').click();
 assert.equal(await f.locator('[data-mc-own]').inputValue(),'Mijn berekening blijft bij deze vraag.');
 await f.locator('[data-mc="retry"]').click();await f.locator('[name="mc-choice"][value="'+selection.correct+'"]').check({force:true});
 await f.getByRole('heading',{name:'Goed beantwoord',exact:true}).waitFor();
 const snapshot=await p.evaluate(()=>JSON.parse(localStorage.getItem('belre3-mc-v1')).runs.at(-1));
 assert.equal(snapshot.ids.length,20);assert.equal(snapshot.answers[selection.id].first.correct,false);assert.equal(snapshot.answers[selection.id].correct,true);
 await p.reload();await f.locator('.belre-mc-question').waitFor();
 await p.addScriptTag({url:base+'/js/privacy.js'});await checkPrivacyControl();
 await checkPracticeNavigation();
 const restored=await p.evaluate(()=>JSON.parse(localStorage.getItem('belre3-mc-v1')).runs.at(-1));assert.deepEqual(restored.ids,snapshot.ids);assert.equal(restored.answers[selection.id].ownText,'Mijn berekening blijft bij deze vraag.');
 await f.locator('[data-mc="finish"]').click();await f.locator('[data-mc="confirm-finish"]').click();await f.locator('[data-result-filter]').waitFor();
 await p.locator('#belre-site-nav').waitFor({state:'visible'});
 await f.locator('[data-result-filter]').selectOption('wrong');assert.equal(await f.locator('.belre-results table').last().locator('tbody tr').count(),1);
 await p.screenshot({path:path.join(out,'mc-resultaten.png')});
 await f.locator('[data-mc="repeat-wrong"]').click();await f.locator('.belre-mc-question').waitFor();
 await checkPracticeNavigation();
 const repeated=await p.evaluate(()=>JSON.parse(localStorage.getItem('belre3-mc-v1')).runs);assert.equal(repeated.length,2);assert.deepEqual(repeated[1].ids,[selection.id]);assert.deepEqual(repeated[1].answers,{});
 checks.push('Gemengde toetsreeks: direct feedback, eigen tekst, zelfbeoordeling, hervatten, eerste score, detailresultaten en aparte foutenreeks');
 await f.locator('.belre-learning-help>summary').click();await f.getByRole('link',{name:'Bijbehorende samenvatting'}).click();await p.locator('#pg-sam.vis').waitFor();
 await checkPrivacyControl();
 await p.locator('#belre-site-nav').waitFor({state:'visible'});
 checks.push('MC-oefenen gebruikt de volle breedte zonder navigatie of mobiele menuknop; hervatten en foutenreeks behouden dit, resultaten en samenvatting herstellen de navigatie');
 const anchor=await p.evaluate(()=>location.hash.split('/').at(-1));await p.locator('.summary-topics [data-topic="'+anchor+'"][aria-pressed="true"]').waitFor();
 await p.locator('#belre-site-nav a[href="/oefenen/#oefenen"]').click();await f.locator('.belre-mc-menu').waitFor();
 await f.locator('[data-mc-filter="college"]').selectOption('');
 const frequency=await f.locator('.belre-frequency summary').allTextContents();assert.equal(frequency.length,19);assert.ok(frequency.every(t=>t.includes('van 15 BELRE3-tentamens')));
 checks.push('Leerhulp verwijst naar de juiste samenvatting; 19 brongebonden frequenties met 15 originele tentamens als basis');
 await p.locator('#belre-site-nav a[href="/oefenen/#welkom/opgaven"]').click();await f.locator('[name="opgave-number"]').first().waitFor();
 assert.equal(await p.locator('#belre-site-nav').isVisible(),false);
 await f.locator('[name="opgave-number"][value="119"]').check();
 for(const box of await f.locator('[data-opgave-exam]:not(:disabled)').all()){const value=await box.getAttribute('value');await box.setChecked(['belre3-20260608','belre3-20251105'].includes(value));}
 await f.locator('[data-exam-action="start-opgave"]').click();await f.locator('.exam-question-body').waitFor();
 await checkPrivacyControl();
 await f.locator('#study-privacy-control>button').click();await f.locator('#study-privacy-choices [data-mode="excluded"]').click();
 await p.waitForFunction(()=>StudyPrivacy.state().excluded&&document.getElementById('belre-course-frame').contentWindow.StudyPrivacy.state().excluded);
 await f.locator('#study-privacy-control>button').click();await f.locator('#study-privacy-choices [data-mode="owner"]').click();
 await p.waitForFunction(()=>StudyPrivacy.state().mode==='owner'&&document.getElementById('belre-course-frame').contentWindow.StudyPrivacy.state().mode==='owner');
 checks.push('Precies één knop voor eigen telling op Home, MC, na herladen, samenvatting en tentamen; uitsluiten en apart meetellen synchroniseren tussen beide omgevingen');
 const editor=f.frameLocator('.tox-edit-area iframe').locator('body');await editor.fill('Eigen tentamenberekening.');
 await f.locator('[data-exam-action="overview"]').click();assert.equal(await f.locator('.compact-overview-group').count(),3);await p.keyboard.press('Escape');
 await f.locator('[data-original-pdf="questions"]:visible').click();await f.locator('.original-pdf-left-viewer:visible iframe').waitFor();
 await f.locator('[data-pdf-close="questions"]:visible').click();await editor.press('End');await editor.pressSequentially(' Verder werken.');
 assert.match(await editor.innerText(),/Verder werken/);
 await f.locator('[data-exam-action="introduction"]').click();assert.match(await f.locator('dialog[open]').innerText(),/20260608/);await p.keyboard.press('Escape');
 await f.locator('[data-belre-assistant]').click();await p.locator('#belre-assistant:not([hidden])').waitFor();
 const context=await p.evaluate(async()=>{const{readContext}=await import('/js/assistant-page.mjs');return readContext(document.getElementById('belre-course-frame').contentWindow);});
 const original=JSON.parse(fs.readFileSync(path.join(__dirname,'../oefenen/content/exams.json'))).find(e=>e.id==='belre3-20260608');
 const q=original.questions[0],{questionRecord,revision}=await import('../js/assistant-context.mjs');assert.equal(context.context.revision,await revision(questionRecord('exam',q,original.sections.find(s=>s.id===q.sectionId),original)));
 await p.locator('[data-action="close"]').click();
 await p.screenshot({path:path.join(out,'tentamen-onderwerp.png')});
 checks.push('Open college-reeks: oorspronkelijke casus, PDF, introductie en canonieke assistentcontext; editor blijft bruikbaar; geen navigatieboom');
 const examRoute='omgeving/tentamen%2F'+encodeURIComponent(await p.evaluate(()=>document.getElementById('belre-course-frame').contentWindow.CafaExams.getPosition().attempt));
 for(const viewport of [{width:1440,height:1000},{width:393,height:852},{width:393,height:460}]){
 await p.setViewportSize(viewport);
 for(const route of ['pagina/home','omgeving/oefenen',examRoute]){
 await p.evaluate(route=>location.hash='#'+route,route);await p.waitForTimeout(250);
 for(const delta of [1,1,1,1,0]){
  await p.evaluate(delta=>BelreDisplay.adjust(delta),delta);await p.evaluate(()=>BelreAssistant.open());await p.waitForTimeout(100);
  const geo=await p.evaluate(()=>{const f=document.querySelector('#belre-course-frame:not([hidden])'),d=f?.contentDocument||document,scale=StudyScale.get();const headers=[...d.querySelectorAll(f?'.topbar,.learning-page-head,#exam-app:not([hidden]) .cirrus-page-head':'.belre-site-header,.belre-page-toolbar')].filter(n=>n.getClientRects().length);let top=Math.max(0,...headers.map(n=>n.getBoundingClientRect().bottom));if(f)top=f.getBoundingClientRect().top+top*(f.getBoundingClientRect().width/f.contentWindow.innerWidth);const a=document.getElementById('belre-assistant').getBoundingClientRect();return{top,actual:a.top,bottom:a.bottom,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.ok(Math.abs(geo.top-geo.actual)<2,JSON.stringify({route,geo}));assert.ok(Math.abs(geo.bottom-geo.height)<2);assert.equal(geo.overflow,false);
  const send=await p.locator('[data-send]').boundingBox();assert.ok(send.y+send.height<=viewport.height+1,JSON.stringify({viewport,route,send}));
  await p.locator('[data-action="close"]').click();
 }
 }
 }
 checks.push('Assistent en verzendknop blijven binnen het scherm bij vijf paginaschalen, drie schermformaten en Home, MC en tentamen');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors,font:'Arial'},null,2));console.log(JSON.stringify({checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
