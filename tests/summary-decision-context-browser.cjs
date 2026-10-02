const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8781';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
const output=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/decision-context');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const data=(await import('../js/summary-data.mjs')).default;
  const entries=data.colleges.flatMap(college=>college.topics.flatMap(topic=>(topic.decisionTrees||[]).map(tree=>({college,topic,tree,href:'#pagina/sam/'+topic.id+'/beslisboom/'+tree.id}))));
  const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
    await page.goto(base+'/index.html');await page.locator('#belre-site-nav').waitFor();
    const progress=JSON.stringify({version:1,topics:{belastingplicht:{'c12-bp':{studied:true,updatedAt:1}}}});
    await page.evaluate(value=>localStorage.setItem('belre3-study-progress-v1',value),progress);
    async function menu(){
      if(!await page.locator('#belre-site-nav').isVisible())await page.getByRole('button',{name:'Navigatie openen',exact:true}).click();
      await page.locator('#belre-site-nav a[href="#pagina/beslisbomen"]').click();
      await page.locator('.decision-directory-card').first().waitFor();
      assert.equal(new URL(page.url()).hash,'#pagina/beslisbomen');
      assert.equal(await page.locator('.decision-directory-card').count(),32);
    }
    async function select(entry){
      await page.evaluate(href=>{location.hash=href;},entry.href);
      await page.locator('[data-summary-app][data-rendered-decision="'+entry.tree.id+'"]').waitFor();
      await page.waitForFunction(title=>document.title.includes('Beslisbomen')&&document.title.includes(title),entry.tree.title);
    }
    for(const width of [1440,900,393]){
      await page.setViewportSize({width,height:1000});
      await menu();
      for(const id of ['stichting','vordering']){
        const entry=entries.find(item=>item.tree.id===id);
        await page.locator('.decision-directory-open[href="'+entry.href+'"]').click();
        await page.locator('.summary-decision-focused').waitFor();
        assert.equal(await page.locator('.summary-decision-title').innerText(),entry.tree.title);
        assert.equal(await page.locator('.summary-decision-context').isVisible(),true);
        assert.ok(await page.locator('.summary-decision-context').evaluate(node=>node.getBoundingClientRect().top>=0));
        await page.locator('.summary-decision-context a').click();
        await page.locator('.decision-directory-card').first().waitFor();
      }
      for(const entry of entries){
        await select(entry);
        assert.equal(await page.locator('[data-summary-tree]').count(),1);
        assert.equal(await page.locator('.summary-decision-focused').getAttribute('data-summary-tree'),entry.tree.id);
        assert.equal(await page.locator('.summary-decision-title').innerText(),entry.tree.title);
        assert.equal(await page.locator('[data-decision-college-label]').innerText(),entry.college.label);
        assert.equal(await page.locator('[data-decision-topic-label]').innerText(),entry.topic.title);
        assert.equal(await page.locator('.belre-page-toolbar h1').innerText(),'Beslisbomen');
        assert.equal(await page.locator('#belre-site-nav a[href="#pagina/beslisbomen"]').getAttribute('aria-current'),'page');
        assert.equal(await page.locator('[data-summary-outline]').isVisible(),false);
        assert.equal(await page.locator('.summary-sequence,.summary-topic-intro,.summary-objectives,#summary-completion-title,.summary-study').count(),0);
        assert.equal(await page.locator('[data-decision-current]').innerText(),entry.tree.nodes.find(node=>node.id===entry.tree.start).title);
        assert.equal(await page.locator('.decision-reading [data-summary-open]').count(),entry.tree.sections.length);
        assert.equal(await page.locator('.decision-intro').innerText(),entry.tree.intro);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      }
      await select(entries.find(entry=>entry.tree.id==='vordering'));
      await page.screenshot({path:path.join(output,'decision-'+width+'.png')});
      checks.push('Alle 32 beslisbomen: één gekozen boom, herkenbaar college en onderwerp, actieve menu-ingang en geen onderwerpafronding of overloop op '+width+'px.');
    }
    await page.setViewportSize({width:1440,height:1000});
    await select(entries.find(entry=>entry.tree.id==='stichting'));
    await page.locator('[data-decision-choice]').first().click();
    assert.equal(await page.locator('.decision-history li').count(),1);
    await menu();await page.goBack();await page.locator('.summary-decision-focused').waitFor();
    assert.equal(await page.locator('.decision-history li').count(),1);
    await page.locator('[data-decision-revisit]').first().click();
    assert.equal(await page.locator('.decision-history').count(),0);
    await page.reload();await page.locator('.summary-decision-focused').waitFor();
    assert.equal(await page.locator('.summary-decision-title').innerText(),entries.find(entry=>entry.tree.id==='stichting').tree.title);
    await page.locator('.summary-decision-focused [data-summary-law]').first().click();
    await page.locator('#belre-law-popover .belre-law-quote').waitFor();await page.keyboard.press('Escape');
    const context=await page.evaluate(async()=>{const module=await import('/js/assistant-page.mjs?v=20261001-decision-context1');return module.readContext();});
    assert.match(context.label,/^Beslisboom · Stichting of vereniging/);
    assert.equal(context.context.id,'sam');
    const section=await page.locator('.decision-reading [data-summary-open]').first().getAttribute('data-summary-open');
    await page.locator('.decision-reading [data-summary-open]').first().click();
    await page.locator('[data-summary-section="'+section+'"]').waitFor();
    assert.equal(await page.locator('.belre-page-toolbar h1').innerText(),'Leerstof en uitleg');
    assert.equal(await page.locator('[data-summary-outline]').isVisible(),true);
    await page.goBack();await page.locator('.summary-decision-focused').waitFor();
    await page.evaluate(()=>{location.hash='#pagina/sam/c45-dvs/afronding';});
    await page.locator('#summary-completion-title').waitFor();
    assert.equal(await page.locator('[data-summary-tree]').count(),entries.filter(entry=>entry.topic.id==='c45-dvs').length);
    await select(entries.find(entry=>entry.tree.id==='deelneming'));
    await select(entries.find(entry=>entry.tree.id==='vordering'));
    assert.equal(await page.locator('[data-summary-tree]').count(),1);
    checks.push('Overzicht, browser-terug, herladen, leeruitleg en meerdere bomen bij hetzelfde onderwerp behouden de juiste weergave; eerdere keuzes blijven bereikbaar.');
    await select(entries.find(entry=>entry.tree.id==='lening'));
    for(const answer of ['Nee','Nee','Nee','Verder'])await page.locator('[data-decision-choice="'+answer+'"]').click();
    await page.locator('.decision-chosen-path [data-summary-decision="winstdrainage"]').click();
    await page.locator('[data-summary-app][data-rendered-decision="winstdrainage"]').waitFor();
    assert.equal(await page.locator('[data-summary-tree]').count(),1);
    assert.equal(await page.evaluate(()=>localStorage.getItem('belre3-study-progress-v1')),progress);
    checks.push('Vervolgbeslisboom, wetsvenster en assistentcontext verwijzen naar de gekozen route; studiemarkeringen blijven ongewijzigd.');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checks,errors},null,2));
    console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
