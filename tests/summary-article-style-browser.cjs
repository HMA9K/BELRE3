const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8875';
const output=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/article-style');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale controleomgeving.');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
 try{
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false}}));
  for(const width of [1440,393]){
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/index.html#pagina/sam/c12-bp');await page.locator('[data-summary-section]').waitFor();
   const result=await page.evaluate(async()=>{
    const data=(await import('/js/summary-data.mjs')).default;
    const {readingSteps,readingStepUrl}=await import('/js/summary-sequence.mjs');
    const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const rgba=value=>{const parts=value.match(/[\d.]+/g).map(Number);return [...parts.slice(0,3),parts[3]??1];};
    const luminance=rgb=>rgb.slice(0,3).map(value=>{const v=value/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
    const backgrounds=new Set();let links=0,minContrast=Infinity,choices=0,trees=0;
    function audit(root){
     for(const link of root.querySelectorAll('.summary-article-ref')){
      const style=getComputedStyle(link);
      const expected=link.closest('thead')?'rgb(182, 239, 212)':'rgb(23, 96, 68)';
      if(style.color!==expected||Number(style.fontWeight)<700||!style.textDecorationLine.includes('underline'))throw Error('Artikelstijl wijkt af: '+location.hash+' / '+link.textContent+' / '+style.color+' / '+style.fontWeight);
      for(const child of link.querySelectorAll('*'))if(getComputedStyle(child).color!==style.color||Number(getComputedStyle(child).fontWeight)<700)throw Error('Deel van artikelverwijzing wijkt af: '+location.hash);
      let background=[255,255,255];const layers=[];
      for(let node=link;node;node=node.parentElement)layers.push(rgba(getComputedStyle(node).backgroundColor));
      for(const layer of layers.reverse())background=background.map((v,i)=>layer[i]*layer[3]+v*(1-layer[3]));
      backgrounds.add(background.map(Math.round).join(','));
      const a=luminance(rgba(style.color)),b=luminance(background),ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      if(ratio<4.5)throw Error('Te weinig tekstcontrast: '+location.hash+' / '+ratio);
      minContrast=Math.min(minContrast,ratio);links++;
     }
    }
    function openDetails(app){for(const details of app.querySelectorAll('details'))details.open=true;}
    const steps=readingSteps(data.colleges);
    for(const step of steps){
     location.hash=readingStepUrl(step);await tick();
     const app=document.querySelector('[data-summary-app]');openDetails(app);audit(app);
     for(const figure of app.querySelectorAll('[data-summary-figure]')){
      const options=new Map();for(const button of figure.querySelectorAll('[data-tp-choice]'))if(!options.has(button.dataset.tpChoice)||button.closest('.tp-methods'))options.set(button.dataset.tpChoice,button);
      for(const button of options.values()){button.click();audit(figure);choices++;}
     }
     if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Pagina loopt horizontaal over: '+location.hash);
    }
    for(const college of data.colleges)for(const topic of college.topics)for(const tree of topic.decisionTrees||[]){
     location.hash='#pagina/sam/'+topic.id+'/beslisboom/'+tree.id;await tick();
     const app=document.querySelector('[data-summary-app]'),root=app.querySelector('[data-summary-tree]');openDetails(app);audit(root);
     let turns=0;
     while(root.querySelector('[data-decision-choice]')&&turns++<tree.nodes.length){root.querySelector('[data-decision-choice]').click();audit(root);}
     if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Beslisboom loopt horizontaal over: '+tree.id);
     trees++;
    }
    const fixture=document.createElement('div');
    fixture.innerHTML='<table><thead><tr><th><button class="summary-article-ref">Art. 2 <strong>lid 1</strong></button></th></tr></thead><tbody><tr><th><button class="summary-article-ref">Art. 2 lid 1</button></th><td><button class="summary-article-ref">Art. 2 lid 1</button></td></tr></tbody></table>';
    document.querySelector('[data-summary-app]').append(fixture);audit(fixture);fixture.remove();
    return {width:innerWidth,routes:steps.length,trees,choices,links,minContrast:Number(minContrast.toFixed(2)),backgrounds:[...backgrounds]};
   });
   assert.equal(result.routes,127);assert.equal(result.trees,32);assert.equal(result.choices,145);assert.ok(result.links>4000);results.push(result);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/index.html#pagina/sam/c12-bp/paragraaf/c12-bp-stichting');await page.locator('[data-summary-section]').waitFor();
  const article=page.locator('.summary-reading-main .summary-article-ref').first();
  await article.hover();assert.equal(await article.evaluate(node=>getComputedStyle(node).color),'rgb(23, 96, 68)');
  await article.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert.deepEqual(await article.evaluate(node=>({focus:node.matches(':focus-visible'),color:getComputedStyle(node).color,weight:getComputedStyle(node).fontWeight,outline:getComputedStyle(node).outlineStyle})),{focus:true,color:'rgb(23, 96, 68)',weight:'700',outline:'solid'});
  await page.keyboard.press('Enter');await page.locator('#belre-law-popover .belre-law-quote').waitFor();await page.keyboard.press('Escape');
  await page.evaluate(()=>{const fixture=document.createElement('table');fixture.id='article-style-fixture';fixture.innerHTML='<thead><tr><th><button class="summary-article-ref">Art. 2 lid 1</button></th></tr></thead>';document.querySelector('[data-summary-app]').append(fixture);});
  const header=page.locator('#article-style-fixture .summary-article-ref');await header.hover();
  assert.deepEqual(await header.evaluate(node=>({color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor,weight:getComputedStyle(node).fontWeight})),{color:'rgb(182, 239, 212)',background:'rgb(40, 77, 62)',weight:'700'});
  await header.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert.equal(await header.evaluate(node=>getComputedStyle(node).outlineColor),'rgb(182, 239, 212)');
  await page.evaluate(()=>document.getElementById('article-style-fixture').remove());
  const shot=(locator,name)=>locator.screenshot({path:path.join(output,name),style:'.belre-page-toolbar,.summary-reading-pin,.study-assistant-launch{visibility:hidden!important}'});
  await shot(page.locator('.summary-reading-unit[data-reading-unit="6"]'),'groene-artikelen-desktop.png');
  await page.setViewportSize({width:393,height:1000});await shot(page.locator('.summary-reading-unit[data-reading-unit="6"]'),'groene-artikelen-mobiel.png');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'controle.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
