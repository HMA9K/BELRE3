const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769';
const out=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/summary-browser');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const data=(await import(pathToFileURL(path.resolve('js/summary-data.mjs')))).default;
 const laws=JSON.parse(fs.readFileSync('js/summary-law.json','utf8'));
 const browser=process.env.BELRE_BROWSER_ENGINE==='webkit'?await webkit.launch({headless:true,executablePath:process.env.BELRE_BROWSER_EXECUTABLE||undefined}):await chromium.launch({channel:process.env.BELRE_BROWSER_CHANNEL||'chrome',headless:true});
 const checks=[],errors=[];
 try{
  const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/study-status',r=>r.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
  await p.goto(base+'/index.html#pagina/sam/c12-bp');await p.locator('.summary-objectives').waitFor();
  const presentation=await p.evaluate(async()=>{
   const data=(await import('/js/summary-data.mjs')).default;
   const {presentationParts}=await import('/js/summary-presentation.mjs');
   const {readingOutline}=await import('/js/summary-reading.mjs');let sections=0,headings=0;
   for(const college of data.colleges)for(const topic of college.topics)for(const section of topic.sections){
    const before=document.createElement('div'),after=document.createElement('div');
    const outline=readingOutline(college,topic).sections.find(item=>item.id===section.id),parts=presentationParts(section,document,outline);
    before.innerHTML=section.bodyHtml;after.innerHTML=parts.explanationHtml+parts.examplesHtml;
    const titleNodes=outline.paragraphs.map(item=>after.querySelector('#'+item.id));
    if(titleNodes.some(node=>!node))throw Error('Uitlegblok ontbreekt: '+section.id);
    const originalOrder=titleNodes.map(node=>node.parentElement);
    if(JSON.stringify(titleNodes.map(n=>n.textContent))!==JSON.stringify(section.readingGuide.paragraphs.map(p=>p.heading)))throw Error('Tussenkop ontbreekt: '+section.id);
    headings+=titleNodes.length;
    after.querySelectorAll('.summary-reading-block>h4,.summary-reading-label').forEach(n=>n.remove());
    if(before.textContent!==originalOrder.map(node=>node.textContent).join(''))throw Error('Uitleg gewijzigd door presentatie: '+section.id);
    if(parts.explanationHtml.includes('summary-reading-example'))throw Error('Voorbeeld staat tussen regels: '+section.id);
    for(const term of after.querySelectorAll('.summary-key-term'))if(!before.textContent.includes(term.textContent))throw Error('Kernbegrip gewijzigd: '+section.id);
    sections++;
   }
   return {sections,headings};
  });
  assert.equal(presentation.sections,107);assert.ok(presentation.headings>250);
  checks.push('Alle 107 onderdelen: tussenkoppen en kernbegrippen, oorspronkelijke uitleg exact behouden');
  for(const width of [1440,900,393]){
   await p.setViewportSize({width,height:1000});
   for(const college of data.colleges){
    await p.locator('.summary-colleges [data-college="'+college.id+'"]').click();
   assert.deepEqual(await p.locator('.summary-recall-guide>p').allTextContents(),college.recallGuide);
    assert.equal(await p.locator('.summary-objectives li').count(),college.objectives.length);
    assert.equal(await p.locator('.summary-recall-list>li').count(),college.remember.length);
    for(const point of college.remember){
     const recall=p.locator('[data-summary-recall="'+point.id+'"]');
     assert.equal(await recall.locator('h4').textContent(),point.title);
     assert.equal(await recall.locator('.summary-recall-rule').textContent(),'Kernregel: '+point.rule);
     assert.equal(await recall.locator('.summary-recall-apply').textContent(),'Toepassing: '+point.apply);
     assert.equal(await recall.locator('[data-summary-open]').count(),point.sectionIds.length);
    }
    for(const topic of college.topics){
     await p.locator('.summary-topics [data-topic="'+topic.id+'"]').click();
     assert.deepEqual(await p.locator('.summary-topic-intro>p').allTextContents(),topic.lessonIntro);
     assert.equal(await p.locator('.summary-section').count(),topic.sections.length);
     const coverage=p.locator('.summary-coverage');
     assert.equal(await coverage.locator('.summary-exam-overview').textContent(),topic.examPractice.intro);
     assert.equal(await coverage.locator('[data-summary-exam-example]').count(),topic.sections.length);
     await coverage.locator(':scope>summary').click();
     for(const section of topic.sections){
      const detail=p.locator('[data-summary-section="'+section.id+'"]');
      assert.equal(await detail.locator('.summary-learning-goal>p').textContent(),section.examTip);
      const expectedPhases=['understand','foundation',...((section.figure||section.readingGuide.paragraphs.some(item=>item.tone==='example'))?['apply']:[]),'practice'];
      assert.deepEqual(await detail.locator('[data-learning-phase]').evaluateAll(nodes=>nodes.map(node=>node.dataset.learningPhase)),expectedPhases);
      const basis=detail.locator('[data-learning-phase="foundation"]>.summary-foundation');
      assert.equal(await basis.getAttribute('data-foundation-kind'),section.foundation.kind);
      assert.equal(await basis.locator(':scope>p').textContent(),section.foundation.text);
      assert.ok(await basis.locator('.summary-foundation-sources a').count());
      const answer=p.locator('[data-summary-section="'+section.id+'"] .summary-exam-tip');
      assert.deepEqual(await answer.locator('.summary-answer-steps>li').allTextContents(),section.examAnswer.steps.map(step=>step.title+' '+step.text));
      const worked=answer.locator('.summary-worked-answer');
      assert.equal(await worked.locator('h5').textContent(),section.examAnswer.worked.title);
      assert.equal(await worked.locator('p').textContent(),section.examAnswer.worked.text);
      assert.deepEqual(await worked.locator('dd').allTextContents(),(section.examAnswer.worked.points||[]).map(point=>point.text));
      const example=coverage.locator('[data-summary-exam-example="'+section.id+'"]');
      assert.equal(await example.locator('.summary-foundation>p').textContent(),section.foundation.text);
      assert.equal(await example.locator('.summary-exam-shape').textContent(),section.examPractice.description);
      assert.equal(await example.locator('.summary-example-question p').textContent(),section.examPractice.question);
      assert.deepEqual(await example.locator('.summary-answer-steps>li').allTextContents(),section.examAnswer.steps.map(step=>step.title+' '+step.text));
      assert.equal(await example.locator('.summary-worked-answer p').textContent(),section.examAnswer.worked.text);
     }
     const finalAnswer=coverage.locator('[data-summary-exam-example]').last().locator('.summary-example-solution');
     if(await finalAnswer.getAttribute('open')===null)await finalAnswer.locator(':scope>summary').click();
     assert.equal(await finalAnswer.locator('.summary-worked-answer').isVisible(),true);
     await p.locator('[data-summary-expand="true"]').click();
     assert.equal(await p.locator('.summary-section[open]').count(),topic.sections.length);
     assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,topic.id+' overflow '+width);
     await p.locator('[data-summary-expand="false"]').click();
     await coverage.locator(':scope>summary').click();
    }
   }
   checks.push('Alle colleges en onderwerpen: 20 tentamenbeschrijvingen, 107 concrete vragen met aanpak en antwoord, uitklappen en geen pagina-overloop bij '+width+'px');
   await p.locator('[data-college="c12"]').click();await p.evaluate(()=>scrollTo(0,0));
   assert.match(await p.locator('.summary-app').evaluate(n=>getComputedStyle(n).fontFamily),/Arial/);
   await p.screenshot({path:path.join(out,'summary-'+width+'.png'),fullPage:false});
  }
  await p.setViewportSize({width:1440,height:1000});
  await p.locator('[data-college="c12"]').click();
  await p.locator('.summary-recall-details>summary').click();
  const foundation=p.locator('[data-summary-recall]').filter({has:p.locator('h4',{hasText:'BV, stichting en vrijstellingen'})});
  await foundation.locator('[data-summary-law]').filter({hasText:'art. 2 lid 6 Wet Vpb'}).click();
  await p.locator('#belre-law-popover .belre-law-quote').waitFor();
  assert.ok((await p.locator('#belre-law-popover .belre-law-quote').textContent()).includes('gehele vermogen'));
  await p.keyboard.press('Escape');
  await foundation.locator('[data-summary-open="c12-bp-stichting"]').click();
  await p.locator('[data-summary-section="c12-bp-stichting"][open]').waitFor();
  checks.push('Onthoudblokken: kernregels, toepassingen, correcte wetsleden en doorklikken naar volledig antwoord');
  await p.locator('.summary-coverage>summary').click();
  const coverageLaw=p.locator('[data-summary-exam-example="c12-bp-stichting"] .summary-answer-steps [data-summary-law]').first();
  await p.locator('[data-summary-exam-example="c12-bp-stichting"] .summary-example-solution>summary').click();
  await coverageLaw.click();await p.locator('#belre-law-popover .belre-law-quote').waitFor();
  assert.ok(await p.locator('#belre-law-popover footer a').count());await p.keyboard.press('Escape');
  await p.locator('.summary-coverage>summary').click();
  checks.push('Artikelvensters en bronverwijzingen werken ook binnen de nieuwe vraaguitwerkingen');
  for(const college of data.colleges){
   const topic=college.topics.find(t=>t.sections.some(s=>s.articles.length));if(!topic)continue;
   const section=topic.sections.find(s=>s.articles.length),reference=section.articles[0];
   await p.locator('[data-college="'+college.id+'"]').click();await p.locator('.summary-topics [data-topic="'+topic.id+'"]').click();
   const detail=p.locator('[data-summary-section="'+section.id+'"]');if(await detail.getAttribute('open')===null){await detail.locator(':scope>summary').focus();await p.keyboard.press('Enter');}
   assert.equal(await detail.getAttribute('open'),'');await detail.locator('.summary-law-links [data-summary-law]').first().click();
   const law=p.locator('#belre-law-popover');await law.locator('mark').last().waitFor();
   assert.ok((await law.boundingBox()).width<=430);
   await law.locator('[data-law-full]').click();
   assert.equal(await law.locator('.belre-law-quote').textContent(),laws[reference.article].text);
   assert.ok(await law.locator('.belre-law-quote mark').count());
   const href=await law.locator('footer a').first().getAttribute('href');assert.match(href,/\.pdf#page=\d+/);
   const response=await p.request.get(base+href.split('#')[0]);assert.equal(response.status(),200);
   await p.keyboard.press('Escape');
  }
  checks.push('Per college: toetsenbordbediening, gearceerde kern, ongewijzigde volledige artikeltekst en werkende bron-PDF');
  await p.locator('#summary-search-input').fill('15ai');await p.locator('#summary-search-results button').first().click();
  assert.equal(await p.locator('[data-college="c67"]').getAttribute('aria-pressed'),'true');
  assert.ok(await p.locator('.summary-section[open]').count());
  const hash=new URL(p.url()).hash,opened=await p.locator('.summary-section[open]').first().getAttribute('data-summary-section');
  await p.reload();await p.locator('[data-summary-section="'+opened+'"][open]').waitFor();assert.equal(new URL(p.url()).hash,hash);
  await p.evaluate(()=>sp('home'));await p.evaluate(()=>sp('sam'));await p.locator('[data-summary-section="'+opened+'"][open]').waitFor();
  checks.push('Zoeken over colleges, directe link, herladen en terugkeren bewaren onderwerp en open uitleg');
  const link=p.locator('[data-summary-section="'+opened+'"] .summary-law-links [data-summary-law]').first();
  await link.click();const law=p.locator('#belre-law-popover');await law.locator('.belre-law-quote').waitFor();
  const context=await p.evaluate(async()=>{const module=await import('/js/assistant-page.mjs');return module.readContext();});
  assert.equal(context.context.id,'sam');assert.ok(context.context.visibleText.includes((await law.locator('.belre-law-quote').innerText()).slice(0,50)));
  await p.screenshot({path:path.join(out,'summary-law.png')});
  checks.push('Assistentcontext bevat de geopende letterlijke wettekst');
  await p.evaluate(()=>sp('exam'));await p.evaluate(()=>goToSummary('c8-tp'));
  await p.locator('[data-topic="c8-tp"][aria-pressed="true"]').waitFor();
  checks.push('Bestaande samenvattingslinks vanuit Vragen en antwoorden openen het juiste college en onderwerp');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
