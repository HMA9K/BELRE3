const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8874';
const output=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/reading-layout');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale controleomgeving.');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
 try{
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  const shot=(locator,name)=>locator.screenshot({path:path.join(output,name),style:'.belre-page-toolbar,.summary-reading-pin,.study-assistant-launch{visibility:hidden!important}'});
  await page.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
  for(const width of [1440,900,393]){
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/index.html#pagina/sam/c12-bp');await page.locator('[data-summary-section]').waitFor();
   const result=await page.evaluate(async()=>{
    const width=innerWidth;
    const data=(await import('/js/summary-data.mjs')).default;
    const {readingOutline}=await import('/js/summary-reading.mjs');
    const {readingSteps,readingStepUrl,completionStep}=await import('/js/summary-sequence.mjs');
    const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const plain=node=>node.textContent.replace(/\s+/g,' ').trim();
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    let paragraphs=0,figures=0,choices=0,finishes=0;const pages=[];
    for(const step of readingSteps(data.colleges)){
     location.hash=readingStepUrl(step);await tick();
     const app=document.querySelector('[data-summary-app]');
     if(app.dataset.renderedTopic!==step.topicId||app.dataset.renderedSection!==step.sectionId)throw Error('Onjuiste leesroute: '+step.sectionId);
     const college=data.colleges.find(c=>c.id===step.collegeId),topic=college.topics.find(t=>t.id===step.topicId);
     if(step.sectionId===completionStep){
      if(!app.querySelector('#summary-completion-title')||app.querySelectorAll('[data-summary-exam-example]').length!==topic.sections.length)throw Error('Afronding verloor oefenvragen: '+topic.id);
      if(app.querySelectorAll('[data-summary-tree]').length!==(topic.decisionTrees||[]).length)throw Error('Afronding verloor beslisboom: '+topic.id);
      finishes++;
     }else{
      const source=topic.sections.find(s=>s.id===step.sectionId),root=app.querySelector('[data-summary-section]');
      const before=document.createElement('div');before.innerHTML=source.bodyHtml;
      const flow=root.querySelector('.summary-reading-flow'),outline=readingOutline(college,topic).sections.find(s=>s.id===source.id);
      const actual=[...flow.querySelectorAll('[data-reading-paragraph]')].sort((a,b)=>Number(a.dataset.readingParagraph)-Number(b.dataset.readingParagraph));
      if(!same(actual.map(plain),[...before.querySelectorAll('p')].map(plain)))throw Error('Bronalinea veranderd of verloren: '+source.id);
      if(actual.some(node=>!node.getClientRects().length)||outline.paragraphs.some(p=>!root.querySelector('#'+p.id)?.getClientRects().length))throw Error('Kernuitleg verborgen: '+source.id);
      for(const tag of ['table','li'])if(!same([...flow.querySelectorAll(tag)].map(plain).sort(),[...before.querySelectorAll(tag)].map(plain).sort()))throw Error('Tabel of opsomming veranderd: '+source.id);
      const copy=flow.cloneNode(true);copy.querySelectorAll('[data-summary-location],.summary-note-reference').forEach(node=>node.remove());
      const words=node=>{const content=document.createElement('div');content.innerHTML=node.innerHTML.replace(/<\/(?:p|tr|th|td|li|ul|ol|div|section|aside|h[1-6])>/g,'$& ');return plain(content).split(/\s+/).sort();};
      if(!same(words(copy),words(before)))throw Error('Brontekst veranderd door groepering: '+source.id);
      if(root.querySelector('.summary-full-explanation,.summary-schema-variant,.summary-reading-label'))throw Error('Oude verborgen of dubbele koplaag aanwezig: '+source.id);
      if(!same([...root.querySelectorAll('[data-learning-phase]')].map(node=>node.dataset.learningPhase),['understand','foundation','practice']))throw Error('Onjuiste leesvolgorde: '+source.id);
      if(plain(root.querySelector('.summary-foundation>p'))!==source.foundation.text)throw Error('Grondslag veranderd: '+source.id);
      if(plain(root.querySelector('.summary-example-question p'))!==source.examPractice.question)throw Error('Vraag veranderd: '+source.id);
      if(plain(root.querySelector('.summary-worked-answer>p'))!==source.examAnswer.worked.text)throw Error('Uitwerking veranderd: '+source.id);
      if(root.querySelector('.summary-example-solution').open)throw Error('Oefenantwoord wordt vooraf getoond: '+source.id);
      const nav=document.querySelector('[data-summary-outline]');
      if(nav.querySelector('.summary-nav-paragraphs,.summary-nav-stages,.summary-nav-trees')||nav.querySelectorAll('.summary-nav-section').length!==topic.sections.length)throw Error('Navigatie wijkt af van de compacte onderwerpenlijst: '+source.id);
      const originalFigures=[source.figure,...(source.additionalFigures||[])].filter(Boolean);
      const renderedFigures=[...root.querySelectorAll('[data-summary-figure]')];
      if(renderedFigures.length!==originalFigures.length)throw Error('Schema ontbreekt: '+source.id);
      if(width===1440||width===393)for(const [index,figure] of renderedFigures.entries()){
       if(!figure.getClientRects().length)throw Error('Schema verborgen: '+source.id);
       for(const choice of originalFigures[index].interactive.choices){
        const button=figure.querySelector('.tp-methods [data-tp-choice="'+choice.id+'"]')||figure.querySelector('[data-tp-choice="'+choice.id+'"]');
        button.click();
        if(button.getAttribute('aria-pressed')!=='true'||figure.dataset.tpSelected!==choice.id||!figure.querySelector('[data-tp-detail]').textContent.includes(choice.text))throw Error('Schemauitleg onjuist: '+source.id+'/'+choice.id);
        choices++;
       }
       figures++;
      }
      const sideUnits=[...flow.querySelectorAll('.summary-reading-with-notes:not(.summary-reading-full)')];
      for(const unit of sideUnits){
       const main=unit.querySelector('.summary-reading-main').getBoundingClientRect(),side=unit.querySelector('.summary-reading-side').getBoundingClientRect();
       if(width===393&&side.top<main.bottom-1)throw Error('Mobiele kaders staan niet onder de hoofdtekst: '+source.id);
       if(width===1440&&flow.getBoundingClientRect().width>=800&&side.left<main.right-1)throw Error('Brede kaders staan niet rechts: '+source.id);
      }
      const notes=outline.paragraphs.filter(p=>p.note);
      pages.push({id:source.id,route:readingStepUrl(step),paragraphs:actual.length,main:outline.paragraphs.filter(p=>!p.note).length,notes:notes.map(p=>({id:p.id,title:p.title,parent:p.parentId})),figures:renderedFigures.length});
      paragraphs+=actual.length;
     }
     if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Pagina loopt horizontaal over: '+step.sectionId+' op '+innerWidth);
    }
    return {width:innerWidth,sections:pages.length,finishes,paragraphs,figures,choices,pages};
   });
   assert.equal(result.sections,107);assert.equal(result.finishes,20);assert.equal(result.paragraphs,547);
   results.push(result);console.log(JSON.stringify({...result,pages:undefined}));
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/index.html#pagina/sam/c12-bp/paragraaf/c12-bp-stichting');await page.locator('[data-summary-section]').waitFor();
  await shot(page.locator('.summary-reading-flow'),'hoofdtekst-desktop.png');
  await page.locator('[data-reading-order="learning-c12-bp-stichting-foundation"]').click();
  await page.waitForTimeout(100);
  const position=await page.locator('#learning-c12-bp-stichting-foundation').evaluate(node=>({top:node.getBoundingClientRect().top,bar:document.querySelector('.belre-page-toolbar').getBoundingClientRect().bottom}));
  assert.ok(position.top>=position.bar);
  await shot(page.locator('[data-learning-phase="foundation"]'),'wetsartikelen-desktop.png');
  await page.locator('.summary-law-links [data-summary-law]').first().click();await page.locator('#belre-law-popover .belre-law-quote').waitFor();await page.keyboard.press('Escape');
  await page.goto(base+'/index.html#pagina/sam/c12-bp/paragraaf/c12-bp-vestiging');await page.locator('.summary-figure-gallery').waitFor();
  await page.locator('.summary-figure-gallery img').evaluateAll(nodes=>Promise.all(nodes.map(async node=>{node.loading='eager';await node.decode();})));
  await shot(page.locator('.summary-figure-gallery'),'schemas-desktop.png');
  const gallery=await page.locator('.summary-figure-gallery').evaluate(node=>{const a=node.children[0].getBoundingClientRect(),b=node.children[1].getBoundingClientRect();return {width:node.getBoundingClientRect().width,beside:Math.abs(a.top-b.top)<2&&b.left>=a.right};});
  if(gallery.width>=900)assert.equal(gallery.beside,true);
  await page.setViewportSize({width:393,height:852});
  await page.goto(base+'/index.html#pagina/sam/c12-bp/paragraaf/c12-bp-stichting');await page.locator('[data-summary-section]').waitFor();
  await shot(page.locator('.summary-reading-flow'),'hoofdtekst-mobiel.png');
  await page.getByRole('button',{name:'Navigatie openen',exact:true}).click();
  await page.locator('[data-reading-jump="section-c12-bp-stichting"]').click();
  assert.equal(await page.locator('#belre-site-nav').isVisible(),false);
  await page.locator('.summary-example-solution>summary').click();assert.equal(await page.locator('.summary-example-solution').getAttribute('open'),'');
  await page.locator('[data-summary-foundation]').click();
  assert.equal(new URL(page.url()).hash,'#pagina/sam/c12-bp/paragraaf/c12-bp-stichting');
  await page.goto(base+'/index.html#pagina/sam/c12-bp/afronding');await page.locator('#summary-completion-title').waitFor();
  await page.locator('.summary-coverage>summary').click();
  const question=page.locator('[data-summary-exam-example="c12-bp-stichting"]');
  await question.locator('.summary-example-solution>summary').click();await question.locator('[data-summary-foundation]').click();
  await page.locator('[data-summary-section="c12-bp-stichting"]').waitFor();
  assert.equal(new URL(page.url()).hash,'#pagina/sam/c12-bp/paragraaf/c12-bp-stichting');
  await page.reload();await page.locator('[data-summary-section="c12-bp-stichting"]').waitFor();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify({baseCommit:process.env.BELRE_TEST_BASE||null,widths:results.map(r=>r.width),totals:results.map(({pages,...summary})=>summary),pages:results[0].pages,errors},null,2)+'\n');
  console.log(JSON.stringify({routes:127,widths:results.map(r=>r.width),preservedParagraphs:547,errors,screenshots:4}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
