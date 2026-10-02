const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8795';
const output=process.env.BELRE_TEST_OUTPUT||'output/college-schemas';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
  const counts=[];
  for(const width of [1440,393]){
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/index.html#pagina/sam/c12-bp');await page.locator('[data-summary-app][data-rendered-topic] .summary-section').first().waitFor();
   counts.push(await page.evaluate(async()=>{
    const data=(await import('/js/summary-data.mjs')).default;
    const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    let illustrations=0,choices=0,sections=0;
    for(const college of data.colleges)for(const topic of college.topics)for(const section of topic.sections){
     if(!section.figure)continue;
     location.hash='#pagina/sam/'+topic.id+'/paragraaf/'+section.id;await tick();
     const root=document.querySelector('[data-summary-section="'+section.id+'"]');
     const full=root.querySelector('.summary-full-explanation');
     if(full?.open)throw Error('Aanvullende uitleg staat open: '+section.id);
     const context=root.querySelector('.summary-schema-context');
     if(!context?.textContent.trim()||!(context.compareDocumentPosition(root.querySelector('[data-summary-figure]'))&Node.DOCUMENT_POSITION_FOLLOWING))throw Error('Inleidende leerparagraaf ontbreekt: '+section.id);
     if(!root.querySelector('[data-learning-phase="understand"] [data-summary-figure]'))throw Error('Schema niet vóór uitleg');
     const paragraphs=[...root.querySelectorAll('.summary-prose p')].map(p=>p.textContent);
     const tmp=document.createElement('div');tmp.innerHTML=section.bodyHtml;
     if(JSON.stringify(paragraphs.sort())!==JSON.stringify([...tmp.querySelectorAll('p')].map(p=>p.textContent).sort()))throw Error('Uitleg gewijzigd: '+section.id);
     const originalFigures=[section.figure,...(section.additionalFigures||[])];
     for(const [index,figure] of [...root.querySelectorAll('[data-summary-figure]')].entries()){
      if(index)figure.closest('.summary-schema-variant').open=true;
      const model=originalFigures[index].interactive;
      const img=figure.querySelector('.diagram-stage>img');
      if(img){img.loading="eager";await img.decode();if(img.naturalWidth!==1600||img.naturalHeight!==900)throw Error('Slide niet scherp');
       const frame=figure.querySelector('.diagram-frame'),box=frame.getBoundingClientRect();
       if(box.height>291||box.width>figure.getBoundingClientRect().width)throw Error('Schema niet compact: '+section.id);
      }
      for(const choice of model.choices){
       const button=figure.querySelector('.tp-methods [data-tp-choice="'+choice.id+'"]')||figure.querySelector('[data-tp-choice="'+choice.id+'"]');
       button.click();
       if(figure.dataset.tpSelected!==choice.id||!figure.querySelector('[data-tp-detail]').textContent.includes(choice.text))throw Error('Verkeerde selectie');
       if(button.getAttribute('aria-pressed')!=='true')throw Error('Selectie niet toegankelijk');
       choices++;
      }
      for(const zone of figure.querySelectorAll('[data-diagram-zone]')){
       zone.scrollIntoView({block:'center',inline:'center'});await tick();
       const rect=zone.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
       if(!hit||!zone.contains(hit))throw Error('Klikvlak overlapt of is onbereikbaar: '+section.id+' '+zone.dataset.diagramZone);
       zone.click();if(figure.dataset.tpSelected!==zone.dataset.tpChoice)throw Error('Klikvlak selecteert verkeerd');
      }
      illustrations++;
     }
     if(full){full.open=true;
     if(!full.querySelector('.summary-prose').getClientRects().length)throw Error('Verdere uitleg onbereikbaar');}
     if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Overloop '+section.id+' '+innerWidth);
     sections++;
    }
    return {width:innerWidth,sections,illustrations,choices};
   }));
   await page.goto(base+'/index.html#pagina/sam/c45-fusie/paragraaf/c45-fusie-splitsing');await page.locator('[data-summary-section]').waitFor();
   const figure=page.locator('[data-summary-figure]').first();
   await figure.locator('.tp-methods button').last().focus();await page.keyboard.press('Enter');
   assert.equal(await figure.getAttribute('data-tp-selected'),'deel-2');
   await figure.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'fusie-'+width+'.png')});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/index.html#pagina/sam/c8-hyb/paragraaf/c8-hyb-primair');await page.locator('[data-summary-figure]').waitFor();
  await page.locator('.diagram-hotspot').last().click();
  assert.equal(await page.locator('[data-summary-figure]').getAttribute('data-tp-selected'),'deel-2');
  await page.locator('[data-tp-detail] [data-summary-law]').first().click();await page.locator('#belre-law-popover mark').first().waitFor();await page.keyboard.press('Escape');
  await page.locator('[data-summary-figure]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'hybride-desktop.png')});
  const font=await page.locator('[data-tp-detail]').evaluate(e=>getComputedStyle(e).fontFamily);
  assert.deepEqual(errors,[]);assert.ok(counts.every(c=>c.sections===35&&c.illustrations===49&&c.choices>100));
  console.log(JSON.stringify({counts,font,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
