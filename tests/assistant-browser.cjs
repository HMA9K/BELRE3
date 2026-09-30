/** Browser mechanics with simulated responses; this does not establish model quality. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
const output=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/assistant-browser');fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:process.env.BELRE_BROWSER_CHANNEL||'chrome',headless:true});
  const errors=[],requests=[],checks=[];let authenticated=false,release=null;
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage();
    p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/api/study-*',async route=>{
      const name=new URL(route.request().url()).pathname.split('study-').pop();
      if(name==='status')return route.fulfill({json:{ready:true,authenticated,freeAccess:true,codeRequired:false,freeUntil:'2026-10-06T22:00:00.000Z',sourceCount:55}});
      if(name==='auth'){authenticated=true;return route.fulfill({json:{ok:true}});}
      if(name==='chat'){const body=route.request().postDataJSON();requests.push(body);await new Promise(resolve=>{release=resolve;});release=null;return route.fulfill({json:{answer:'**Voorbeeldantwoord voor de bedieningstest.**\n\nDit bericht hoort bij de vastgelegde context.',citations:[]}});}
      return route.fulfill({json:{ok:true}});
    });
    await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
    await p.getByRole('button',{name:'Open de BELRE3 Assistent',exact:true}).click();
    await p.locator('[data-consent]').check();await p.locator('[data-start]').click();
    await p.locator('#belre-assistant-message').fill('Leg dit begrip uit.');
    await p.locator('[data-send]').click();await p.locator('[data-pending]').waitFor();
    await p.locator('#pg-home .hcard').filter({hasText:'Interactieve Samenvatting'}).click();
    await p.waitForFunction(()=>document.querySelector('[data-context-title]').textContent==='Interactieve samenvatting');
    assert.equal(requests[0].context.id,'home');release();
    await p.locator('.study-message.is-assistant').waitFor();checks.push('Lopend antwoord blijft behouden bij navigeren; oude en actuele context gescheiden.');
    await p.locator('#pg-sam .bbtn').first().click();
    await p.locator('#pg-home a[href*="#oefenen"]').click();
    const f=p.frameLocator('#belre-course-frame');await f.getByRole('button',{name:'Selectie oefenen',exact:true}).waitFor();
    await f.locator('[data-mc-filter="category"]').selectOption('kort');await f.getByRole('button',{name:'Selectie oefenen',exact:true}).click();
    await f.locator('[name="mc-choice"]').first().check({force:true});
    await p.waitForFunction(()=>document.querySelector('[data-context-title]').textContent.startsWith('MC · '));
    await p.locator('#belre-assistant-message').fill('Waarom is mijn antwoord goed of fout?');await p.locator('[data-send]').click();await p.locator('[data-pending]').waitFor();
    assert.equal(requests[1].context.kind,'mc');assert.ok(requests[1].context.revision);assert.ok(requests[1].studentAnswer.optionId);assert.match(requests[1].history[0].content,/Home/);
    await f.getByRole('button',{name:'Volgende',exact:true}).click();release();await p.locator('.study-message.is-assistant').nth(1).waitFor();checks.push('MC-keuze, getoonde vraag en bronrevisie kloppen; geen gespreksreset bij volgende vraag.');
    await p.waitForFunction(()=>document.getElementById('belre-assistant').getBoundingClientRect().top>=document.getElementById('belre-course-frame').contentDocument.querySelector('.learning-page-head').getBoundingClientRect().bottom);
    await p.screenshot({path:path.join(output,'assistent-mc-desktop.png')});
    await f.locator('#learning-tools-menu>summary').click();
    const menu=await f.locator('#learning-tools-menu>nav').boundingBox(),panel=await p.locator('#belre-assistant').boundingBox();
    assert.ok(menu.x+menu.width<=panel.x,'Hulpmiddelen blijven naast het paneel bereikbaar');
    await f.locator('#learning-tools-menu>summary').click();
    await f.locator('[data-calc]').click();
    await p.waitForFunction(()=>{const f=document.getElementById('belre-course-frame'),calc=f.contentDocument.querySelector('#calculator-dialog');return calc&&!calc.hidden&&calc.getBoundingClientRect().right<=document.getElementById('belre-assistant').getBoundingClientRect().left;});
    await f.locator('[data-calc-close]').click();checks.push('Hulpmiddelenmenu en rekenmachine blijven bruikbaar naast het paneel.');
    await p.locator('[data-action="close"]').click();
    await f.getByRole('link',{name:'Home',exact:true}).click();
    await p.locator('#pg-home a[href*="#dashboard"]').click();
    await f.getByRole('link',{name:'Toets starten',exact:true}).first().click();
    await f.getByRole('button',{name:'Toets starten',exact:true}).click();
    await f.locator('.exam-question-body').waitFor();
    const editor=f.frameLocator('.tox-edit-area iframe').locator('body');
    await editor.fill('Mijn oefenberekening: 1.500.000 verminderd met de toegestane verliesverrekening.');
    await f.locator('#exam-app:not([hidden]) [data-belre-assistant]').click();
    await p.waitForFunction(()=>!document.querySelector('[data-context-title]').textContent.startsWith('MC · '));
    await p.locator('#belre-assistant-message').fill('Geef alleen een hint voor deze tentamenvraag.');await p.locator('[data-send]').click();await p.locator('[data-pending]').waitFor();
    assert.equal(requests[2].context.kind,'exam');assert.match(requests[2].studentAnswer.text,/Mijn oefenberekening/);release();await p.locator('.study-message.is-assistant').nth(2).waitFor();
    await f.locator('[data-original-pdf="questions"]:visible').click();
    await f.locator('[data-pdf-close="questions"]:visible').click();
    await editor.press('End');await editor.pressSequentially(' Controle blijft bewaard.');
    assert.match(await editor.innerText(),/Controle blijft bewaard/);
    await p.waitForFunction(()=>document.getElementById('belre-assistant').getBoundingClientRect().top>=document.getElementById('belre-course-frame').contentDocument.querySelector('.cirrus-page-head').getBoundingClientRect().bottom);
    await p.screenshot({path:path.join(output,'assistent-tentamen-desktop.png')});checks.push('Tentamenknop en vraagcontext blijven beschikbaar naast casus en editor.');
    await p.setViewportSize({width:393,height:852});
    const rect=await p.locator('#belre-assistant').boundingBox();assert.ok(rect.width<=393&&rect.height<=852);assert.equal(await p.locator('#belre-course-frame').getAttribute('inert'),'');
    await p.screenshot({path:path.join(output,'assistent-mobiel.png')});
    await p.locator('[data-action="close"]').click();assert.equal(await p.locator('#belre-course-frame').getAttribute('inert'),null);
    await p.locator('.study-assistant-launch').click();assert.equal(await p.locator('.study-message.is-assistant').count(),3);
    await p.setViewportSize({width:393,height:460});const send=await p.locator('[data-send]').boundingBox();assert.ok(send.y+send.height<=460);checks.push('Mobiel: leesbaar paneel, bereikbare bediening bij kort scherm, gesprek behouden na sluiten.');
    await p.reload({waitUntil:'domcontentloaded'});await p.locator('.study-message.is-assistant').nth(2).waitFor();checks.push('Gesprek en open paneel worden na bewust verversen hersteld.');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'resultaat.json'),JSON.stringify({checks,errors,modelResponses:'simulated',font:'Arial'},null,2));console.log(JSON.stringify({checks,errors}));
  }finally{release?.();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
