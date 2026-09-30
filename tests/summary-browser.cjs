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
  for(const width of [1440,900,393]){
   await p.setViewportSize({width,height:1000});
   for(const college of data.colleges){
    await p.locator('.summary-colleges [data-college="'+college.id+'"]').click();
    assert.equal(await p.locator('.summary-objectives li').count(),college.objectives.length);
    assert.equal(await p.locator('.summary-recall li').count(),college.remember.length);
    for(const topic of college.topics){
     await p.locator('.summary-topics [data-topic="'+topic.id+'"]').click();
     assert.equal(await p.locator('.summary-section').count(),topic.sections.length);
     await p.locator('[data-summary-expand="true"]').click();
     assert.equal(await p.locator('.summary-section[open]').count(),topic.sections.length);
     assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,topic.id+' overflow '+width);
     await p.locator('[data-summary-expand="false"]').click();
    }
   }
   checks.push('Alle colleges en onderwerpen: leerdoelen, kernpunten, uitklappen en geen pagina-overloop bij '+width+'px');
   await p.locator('[data-college="c12"]').click();await p.evaluate(()=>scrollTo(0,0));
   assert.match(await p.locator('.summary-app').evaluate(n=>getComputedStyle(n).fontFamily),/Arial/);
   await p.screenshot({path:path.join(out,'summary-'+width+'.png'),fullPage:false});
  }
  await p.setViewportSize({width:1440,height:1000});
  for(const college of data.colleges){
   const topic=college.topics.find(t=>t.sections.some(s=>s.articles.length));if(!topic)continue;
   const section=topic.sections.find(s=>s.articles.length),reference=section.articles[0];
   await p.locator('[data-college="'+college.id+'"]').click();await p.locator('[data-topic="'+topic.id+'"]').click();
   const detail=p.locator('[data-summary-section="'+section.id+'"]');await detail.locator(':scope>summary').focus();await p.keyboard.press('Enter');
   assert.equal(await detail.getAttribute('open'),'');await detail.locator('.summary-law>summary').first().click();
   const law=detail.locator('.summary-law').first();await law.locator('.summary-law-core mark').first().waitFor();
   await law.locator('.summary-law-full>summary').click();
   assert.equal(await law.locator('.summary-law-text').textContent(),laws[reference.article].text);
   assert.ok(await law.locator('.summary-law-text mark').count());
   const href=await law.locator('.summary-law-meta a').first().getAttribute('href');assert.match(href,/\.pdf#page=\d+/);
   const response=await p.request.get(base+href.split('#')[0]);assert.equal(response.status(),200);
  }
  checks.push('Per college: toetsenbordbediening, gearceerde kern, ongewijzigde volledige artikeltekst en werkende bron-PDF');
  await p.locator('#summary-search-input').fill('15ai');await p.locator('#summary-search-results button').first().click();
  assert.equal(await p.locator('[data-college="c67"]').getAttribute('aria-pressed'),'true');
  assert.ok(await p.locator('.summary-section[open]').count());
  const hash=new URL(p.url()).hash,opened=await p.locator('.summary-section[open]').first().getAttribute('data-summary-section');
  await p.reload();await p.locator('[data-summary-section="'+opened+'"][open]').waitFor();assert.equal(new URL(p.url()).hash,hash);
  await p.evaluate(()=>sp('home'));await p.evaluate(()=>sp('sam'));await p.locator('[data-summary-section="'+opened+'"][open]').waitFor();
  checks.push('Zoeken over colleges, directe link, herladen en terugkeren bewaren onderwerp en open uitleg');
  const law=p.locator('[data-summary-section="'+opened+'"] .summary-law').first();
  await law.locator(':scope>summary').click();await law.locator('.summary-law-core').first().waitFor();
  await law.locator('.summary-law-core').first().scrollIntoViewIfNeeded();
  const context=await p.evaluate(async()=>{const module=await import('/js/assistant-page.mjs');return module.readContext();});
  assert.equal(context.context.id,'sam');assert.ok(context.context.visibleText.includes((await law.locator('.summary-law-core').first().innerText()).slice(0,50)));
  await p.screenshot({path:path.join(out,'summary-law.png')});
  checks.push('Assistentcontext bevat de geopende kernpassage');
  await p.evaluate(()=>sp('exam'));await p.evaluate(()=>goToSummary('c8-tp'));
  await p.locator('[data-topic="c8-tp"][aria-pressed="true"]').waitFor();
  checks.push('Bestaande samenvattingslinks vanuit Vragen en antwoorden openen het juiste college en onderwerp');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
