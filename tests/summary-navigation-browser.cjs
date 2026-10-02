const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8781';
const output=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/summary-navigation');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=process.env.BELRE_BROWSER_ENGINE==='webkit'?await webkit.launch({headless:true}):await chromium.launch({channel:'chrome',headless:true});
  const errors=[],checks=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
    for(const width of [1440,900,393]){
      await page.setViewportSize({width,height:1000});
      await page.goto(base+'/index.html#pagina/sam/c12-bp');
      await page.locator('.summary-section').waitFor();
      const traversal=await page.evaluate(async()=>{
        const data=(await import('/js/summary-data.mjs')).default;
        const {readingSteps,completionStep,readingStepUrl}=await import('/js/summary-sequence.mjs');
        const steps=readingSteps(data.colleges),topics=data.colleges.flatMap(college=>college.topics);
        const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        let sections=0,finishes=0;
        for(const [index,step] of steps.entries()){
          await tick();
          const app=document.querySelector('[data-summary-app]'),outline=document.querySelector('[data-summary-outline]');
          if(app.dataset.renderedTopic!==step.topicId||app.dataset.renderedSection!==step.sectionId)throw Error('Leesstap overgeslagen: '+step.sectionId);
          if(outline.querySelectorAll('.summary-nav-topic').length!==topics.length)throw Error('Onderwerp ontbreekt in de kolom.');
          if(outline.querySelectorAll('.summary-nav-topics>li:not(.summary-nav-topic-current) .summary-nav-sections').length)throw Error('Ander onderwerp toont details.');
          if(outline.querySelector('.summary-nav-paragraphs,.summary-nav-stages,.summary-nav-trees'))throw Error('Navigatie toont overbodige leesdetails.');
          if(document.querySelector('[data-reading-current]')||outline.textContent.includes('Je leesplek')||document.querySelector('[data-summary-expand]'))throw Error('Dubbele leesplek of uitklapbediening aanwezig.');
          const topic=topics.find(topic=>topic.id===step.topicId);
          if(step.sectionId!==completionStep){
            const section=topic.sections.find(section=>section.id===step.sectionId),root=app.querySelector('[data-summary-section]');
            if(app.querySelectorAll('[data-summary-section]').length!==1||root.dataset.summarySection!==section.id||root.tagName!=='ARTICLE')throw Error('Geen afzonderlijke open paragraaf.');
            if(root.querySelector('.summary-learning-goal>p').textContent!==section.learningGoal)throw Error('Leerdoel gewijzigd.');
            if(root.querySelector('[data-learning-phase="foundation"]>.summary-foundation>p').textContent!==section.foundation.text)throw Error('Grondslag gewijzigd.');
            if(root.querySelector('.summary-example-question p').textContent!==section.examPractice.question)throw Error('Vraag gewijzigd.');
            if(root.querySelector('.summary-worked-answer>p').textContent!==section.examAnswer.worked.text)throw Error('Antwoord gewijzigd.');
            if(JSON.stringify([...root.querySelectorAll('.summary-answer-steps>li')].map(node=>node.textContent))!==JSON.stringify(section.examAnswer.steps.map(item=>item.title+' '+item.text)))throw Error('Aanpak gewijzigd.');
            const expected=['understand','foundation','practice'];
            if(JSON.stringify([...root.querySelectorAll('[data-learning-phase]')].map(node=>node.dataset.learningPhase))!==JSON.stringify(expected))throw Error('Leerfasen ontbreken.');
            if(app.querySelector('.summary-coverage'))throw Error('Afronding staat tussen de paragrafen.');
            sections++;
          }else{
            if(app.querySelector('[data-summary-section]')||!app.querySelector('#summary-completion-title'))throw Error('Afronding ontbreekt.');
            if(app.querySelectorAll('[data-summary-exam-example]').length!==topic.sections.length)throw Error('Oefenvragen ontbreken in de afronding.');
            if(app.querySelectorAll('[data-summary-tree]').length!==(topic.decisionTrees||[]).length)throw Error('Beslisboom ontbreekt.');
            finishes++;
          }
          if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Horizontale overloop: '+step.sectionId+' op '+innerWidth);
          const nextLink=[...app.querySelectorAll('.summary-sequence a')].find(link=>link.querySelector('strong')?.textContent==='Volgende');
          if(index===steps.length-1){if(nextLink)throw Error('Laatste stap heeft een ongeldige vervolgroute.');}
          else{
            if(nextLink.getAttribute('href')!==readingStepUrl(steps[index+1]))throw Error('Volgende heeft een verkeerde bestemming.');
            nextLink.click();
          }
        }
        return {sections,finishes,steps:steps.length};
      });
      assert.deepEqual(traversal,{sections:107,finishes:20,steps:127});
      checks.push('Alle 127 leesstappen, 107 brongebonden paragrafen en 20 afrondingen: juiste inhoud, één gedetailleerde paragraaf en geen overloop op '+width+'px.');
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'/index.html#pagina/sam/c12-bp/paragraaf/c12-bp-vestiging');await page.locator('#section-c12-bp-vestiging').waitFor();
    await page.locator('.summary-learning-route [data-reading-order]').first().click();
    const paragraph=page.locator('.summary-nav-section-current>[data-reading-jump]').first();
    await paragraph.click();
    const anchor=await paragraph.getAttribute('data-reading-jump');
    await page.waitForFunction(id=>document.querySelector('[data-reading-jump="'+id+'"]').getAttribute('aria-current')==='location',anchor);
    assert.ok(await page.locator('#'+anchor).evaluate(node=>node.getBoundingClientRect().top>=document.querySelector('.belre-page-toolbar').getBoundingClientRect().bottom));
    await page.screenshot({path:path.join(output,'navigation-desktop.png')});
    const currentUrl=page.url();
    await page.getByRole('link',{name:/^Volgende/}).first().click();await page.locator('#section-c12-bp-stichting').waitFor();
    await page.getByRole('link',{name:/^Vorige/}).first().click();assert.equal(page.url(),currentUrl);
    await page.reload();await page.locator('#section-c12-bp-vestiging').waitFor();
    await page.getByRole('link',{name:/^Volgende/}).first().click();await page.goBack();await page.locator('#section-c12-bp-vestiging').waitFor();
    checks.push('Vorige, browser-terug en herladen herstellen de exacte paragraaf; de inhoudsopgave springt naar de juiste uitleg.');
    await page.locator('#summary-search-input').fill('15ai');await page.locator('#summary-search-results button').first().click();
    assert.equal(await page.locator('[data-summary-app]').getAttribute('data-rendered-college'),'c67');
    assert.equal(await page.locator('[data-summary-section]').count(),1);
    await page.locator('.summary-law-links [data-summary-law]').first().click();await page.locator('#belre-law-popover .belre-law-quote').waitFor();await page.keyboard.press('Escape');
    await page.locator('#belre-site-nav a[href="#pagina/beslisbomen"]').click();await page.locator('.decision-directory-open').first().click();
    await page.locator('.summary-decision-focused').waitFor();
    assert.equal(await page.locator('[data-summary-app]').getAttribute('data-rendered-section'),'afronding');
    await page.locator('.summary-decision-focused [data-summary-open]').first().click();assert.equal(await page.locator('[data-summary-section]').count(),1);
    const treeRoutes=await page.evaluate(async()=>{
      const data=(await import('/js/summary-data.mjs')).default;
      let count=0;
      for(const college of data.colleges)for(const topic of college.topics)for(const tree of topic.decisionTrees||[]){
        location.hash='#pagina/sam/'+topic.id+'/beslisboom/'+tree.id;
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const root=document.querySelector('[data-summary-tree="'+tree.id+'"]');
        if(root?.tagName!=='ARTICLE'||!root.getClientRects().length)throw Error('Directe beslisboomroute onbereikbaar: '+tree.id);
        count++;
      }
      return count;
    });
    assert.equal(treeRoutes,32);
    checks.push('Zoekresultaten, wetsartikelvensters en alle directe beslisboomroutes blijven verbonden met de leeruitleg.');
    await page.locator('.summary-decision-focused [data-summary-open]').first().click();
    await page.setViewportSize({width:393,height:852});
    await page.getByRole('button',{name:'Navigatie openen',exact:true}).click();
    const mobileLink=page.locator('[data-summary-outline] a[href="#pagina/sam/c8-tp"]');
    await mobileLink.click();await page.locator('[data-summary-app][data-rendered-topic="c8-tp"]').waitFor();
    assert.equal(await page.locator('#belre-site-nav').isVisible(),false);
    assert.equal(await page.locator('#belre-main').getAttribute('inert'),null);
    await page.getByRole('button',{name:'Navigatie openen',exact:true}).click();
    assert.ok(await page.locator('.summary-nav-topic-current>.summary-nav-topic').evaluate(node=>{const rect=node.getBoundingClientRect();return rect.top>=40&&rect.bottom<innerHeight;}));
    await page.screenshot({path:path.join(output,'navigation-mobile.png')});
    await page.keyboard.press('Escape');await page.screenshot({path:path.join(output,'reading-mobile.png')});
    assert.equal(await page.locator('[data-summary-app]').evaluate(node=>getComputedStyle(node).fontFamily),'Arial, sans-serif');
    checks.push('Mobiele navigatie sluit na de keuze en geeft de inhoud vrij; lettertype Arial is behouden.');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checks,errors},null,2));
    console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
