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
  async function step(topicId,sectionId='afronding'){
   await p.evaluate(({topicId,sectionId})=>{location.hash='#pagina/sam/'+topicId+(sectionId==='afronding'?'/afronding':'/paragraaf/'+sectionId);},{topicId,sectionId});
   await p.locator('[data-summary-app][data-rendered-topic="'+topicId+'"][data-rendered-section="'+sectionId+'"]').waitFor();
  }
  for(const width of [1440,900,393]){
   await p.setViewportSize({width,height:1000});
   for(const college of data.colleges)for(const topic of college.topics){
    await step(topic.id);
    const verified=await p.evaluate(({college,topic})=>{
     const texts=selector=>[...document.querySelectorAll(selector)].map(node=>node.textContent);
     const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
     if(!same(texts('.summary-recall-guide>p'),college.recallGuide))throw Error('Herhalingsuitleg gewijzigd.');
     if(!same(texts('.summary-objectives li'),college.objectives))throw Error('Leerdoelen gewijzigd.');
     if(!same(texts('.summary-topic-intro>p'),topic.lessonIntro))throw Error('Onderwerpinleiding gewijzigd.');
     if(document.querySelector('.summary-exam-overview').textContent!==topic.examPractice.intro)throw Error('Tentamenbeschrijving gewijzigd.');
     for(const point of college.remember){
      const root=document.querySelector('[data-summary-recall="'+point.id+'"]');
      if(root.querySelector('h4').textContent!==point.title||root.querySelector('.summary-recall-rule').textContent!=='Kernregel: '+point.rule||root.querySelector('.summary-recall-apply').textContent!=='Toepassing: '+point.apply||root.querySelectorAll('[data-summary-open]').length!==point.sectionIds.length)throw Error('Onthoudpunt gewijzigd.');
     }
     for(const section of topic.sections){
      const root=document.querySelector('[data-summary-exam-example="'+section.id+'"]');
      if(root.querySelector('.summary-foundation>p').textContent!==section.foundation.text||root.querySelector('.summary-exam-shape').textContent!==section.examPractice.description||root.querySelector('.summary-example-question p').textContent!==section.examPractice.question||root.querySelector('.summary-worked-answer p').textContent!==section.examAnswer.worked.text)throw Error('Tentamenvraag of uitwerking gewijzigd.');
      if(!same([...root.querySelectorAll('.summary-answer-steps>li')].map(node=>node.textContent),section.examAnswer.steps.map(item=>item.title+' '+item.text)))throw Error('Tentamenaanpak gewijzigd.');
     }
     return {overflow:document.documentElement.scrollWidth>innerWidth+1};
    },{college,topic});
    assert.equal(verified.overflow,false,topic.id+' overflow '+width);
    await p.locator('.summary-coverage>summary').click();
    const finalAnswer=p.locator('[data-summary-exam-example]').last().locator('.summary-example-solution');
    if(await finalAnswer.getAttribute('open')===null)await finalAnswer.locator(':scope>summary').click();
    assert.equal(await finalAnswer.locator('.summary-worked-answer').isVisible(),true);
   }
   checks.push('Alle 20 afrondingen: ongewijzigde leerdoelen, herhaling en 107 tentamenvragen met grondslag, aanpak en antwoord op '+width+'px.');
   await step('c12-bp',data.colleges[0].topics[0].sections[0].id);await p.evaluate(()=>scrollTo(0,0));
   assert.match(await p.locator('.summary-app').evaluate(node=>getComputedStyle(node).fontFamily),/Arial/);
   await p.screenshot({path:path.join(out,'summary-'+width+'.png')});
  }
  await p.setViewportSize({width:1440,height:1000});
  await step('c12-bp');await p.locator('.summary-recall-details>summary').click();
  const foundation=p.locator('[data-summary-recall]').filter({has:p.locator('h4',{hasText:'BV, stichting en vrijstellingen'})});
  await foundation.locator('[data-summary-law]').filter({hasText:'art. 2 lid 6 Wet Vpb'}).click();
  await p.locator('#belre-law-popover .belre-law-quote').waitFor();
  assert.ok((await p.locator('#belre-law-popover .belre-law-quote').textContent()).includes('gehele vermogen'));
  await p.keyboard.press('Escape');await foundation.locator('[data-summary-open="c12-bp-stichting"]').click();
  await p.locator('[data-summary-section="c12-bp-stichting"]').waitFor();
  checks.push('Onthoudblokken: correcte wetsleden en directe verbinding met de bijbehorende paragraaf.');
  for(const college of data.colleges){
   const topic=college.topics.find(topic=>topic.sections.some(section=>section.articles.length));if(!topic)continue;
   const section=topic.sections.find(section=>section.articles.length),reference=section.articles[0];
   await step(topic.id,section.id);
   const link=p.locator('.summary-law-links [data-summary-law]').first();await link.focus();await p.keyboard.press('Enter');
   const law=p.locator('#belre-law-popover');await law.locator('mark').last().waitFor();assert.ok((await law.boundingBox()).width<=430);
   await law.locator('[data-law-full]').click();assert.equal(await law.locator('.belre-law-quote').textContent(),laws[reference.article].text);
   assert.ok(await law.locator('.belre-law-quote mark').count());
   const href=await law.locator('footer a').first().getAttribute('href');assert.match(href,/\.pdf#page=\d+/);
   assert.equal((await p.request.get(base+href.split('#')[0])).status(),200);await p.keyboard.press('Escape');
  }
  checks.push('Per college: toetsenbordbediening, ongewijzigde volledige artikeltekst, kernmarkering en bereikbare bron-PDF.');
  await p.locator('#summary-search-input').fill('15ai');await p.locator('#summary-search-results button').first().click();
  assert.equal(await p.locator('[data-college="c67"]').getAttribute('aria-pressed'),'true');
  const hash=new URL(p.url()).hash,opened=await p.locator('[data-summary-section]').getAttribute('data-summary-section');
  await p.reload();await p.locator('[data-summary-section="'+opened+'"]').waitFor();assert.equal(new URL(p.url()).hash,hash);
  await p.evaluate(()=>sp('home'));await p.evaluate(()=>sp('sam'));await p.locator('[data-summary-section="'+opened+'"]').waitFor();
  await p.locator('.summary-law-links [data-summary-law]').first().click();const law=p.locator('#belre-law-popover');await law.locator('.belre-law-quote').waitFor();
  const context=await p.evaluate(async()=>{const module=await import('/js/assistant-page.mjs');return module.readContext();});
  assert.equal(context.context.id,'sam');assert.ok(context.context.visibleText.includes((await law.locator('.belre-law-quote').innerText()).slice(0,50)));
  await p.screenshot({path:path.join(out,'summary-law.png')});await p.keyboard.press('Escape');
  checks.push('Zoeken, herladen en terugkeren bewaren de leesstap; assistentcontext bevat de geopende letterlijke wettekst.');
  await p.evaluate(()=>sp('exam'));await p.evaluate(()=>goToSummary('c8-tp'));await p.locator('[data-topic="c8-tp"][aria-pressed="true"]').waitFor();
  checks.push('Bestaande samenvattingslinks openen het juiste college en onderwerp.');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
