/** Banner alignment across every original page and both practice environments. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
const output=path.resolve(process.env.BELRE_TEST_OUTPUT||'output/assistant-browser');fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:process.env.BELRE_BROWSER_CHANNEL||'chrome',headless:true}),results=[],errors=[];
  try{
    const p=await browser.newPage({viewport:{width:1440,height:1000}});
    p.on('pageerror',error=>errors.push(error.message));
    await p.route('**/api/study-status',route=>route.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false,freeUntil:'2026-10-06T22:00:00.000Z'}}));
    await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
    await p.getByRole('button',{name:'Open de BELRE3 Assistent',exact:true}).click();
    await p.evaluate(()=>window.testPanel=document.getElementById('belre-assistant'));
    async function aligned(label){
      await p.waitForFunction(()=>{
        const f=document.querySelector('#belre-course-frame:not([hidden])'),d=f?f.contentDocument:document;
        const headers=[...d.querySelectorAll(f?'.topbar,.learning-page-head,#exam-app:not([hidden]) .cirrus-page-head':'.mhdr')].filter(n=>n.getClientRects().length);
        const bottom=Math.max(0,...headers.map(n=>n.getBoundingClientRect().bottom));
        const r=document.getElementById('belre-assistant').getBoundingClientRect();
        return Math.abs(r.top-bottom)<1&&Math.abs(r.bottom-innerHeight)<1;
      });
      const value=await p.evaluate(()=>{
        const panel=document.getElementById('belre-assistant'),r=panel.getBoundingClientRect(),f=document.querySelector('#belre-course-frame:not([hidden])'),d=f?f.contentDocument:document;
        const banner=d.querySelector(f?'.topbar':'.mhdr').getBoundingClientRect(),send=panel.querySelector('[data-send]').getBoundingClientRect();
        return{top:r.top,bottom:r.bottom,viewport:innerHeight,width:innerWidth,bannerWidth:banner.width,sendBottom:send.bottom,unchanged:panel===window.testPanel,resizer:document.getElementById('belre-assistant-resizer').getBoundingClientRect().top};
      });
      assert.ok(value.top>=0,label);assert.ok(Math.abs(value.bottom-value.viewport)<1,label);
      assert.ok(Math.abs(value.bannerWidth-value.width)<1,label+' banner remains full width');
      assert.ok(value.sendBottom<=value.viewport+1,label+' compose remains reachable');
      assert.ok(value.unchanged,label+' same conversation DOM');
      if(value.width>760)assert.ok(Math.abs(value.top-value.resizer)<1,label+' aligned resize handle');
      results.push({label,top:value.top,viewport:value.viewport});
    }
    for(const size of [{width:1440,height:1000},{width:1024,height:768},{width:393,height:852}]){
      await p.setViewportSize(size);
      for(const id of ['home','sam','kleur','art','paars','tent','exam','oef']){
        await p.evaluate(id=>window.sp(id),id);await aligned(id+' '+size.width);
        if(id==='home'&&size.width!==1024)await p.screenshot({path:path.join(output,'assistent-home-'+size.width+'.png')});
      }
      for(const route of ['start','oefenen','dashboard','voortgang','bronnen']){
        await p.evaluate(route=>location.hash='#omgeving/'+encodeURIComponent(route),route);
        await p.waitForFunction(route=>{const w=document.querySelector('#belre-course-frame')?.contentWindow;return w?.BelrePractice&&w.location.hash==='#'+route},route);
        await aligned(route+' '+size.width);
      }
    }
    await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>window.sp('home'));await aligned('home before scroll');
    await p.evaluate(()=>scrollTo(0,150));await aligned('home during scroll');
    await p.evaluate(()=>scrollTo(0,500));await aligned('home after banner leaves viewport');
    await p.evaluate(()=>scrollTo(0,0));await p.locator('#belre-assistant-resizer').focus();await p.keyboard.press('ArrowLeft');await aligned('resized pane');
    await p.setViewportSize({width:393,height:460});await aligned('home short mobile');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'uitlijning.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.length,errors}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
