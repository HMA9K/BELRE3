const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BELRE_PLAYWRIGHT||'playwright');
const base=process.env.BELRE_TEST_URL||'http://127.0.0.1:8769';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Gebruik een lokale testomgeving.');
fs.mkdirSync(path.dirname(process.env.BELRE_PERF_OUTPUT||'output/performance-audit.json'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];
 try{for(let run=0;run<Number(process.env.BELRE_PERF_RUNS||3);run++){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{
   localStorage.setItem('study:tracking-mode','excluded');localStorage.setItem('skipgc','1');
   const stats=window.__perf={observers:[],longTasks:[],frames:0};
   const MO=window.MutationObserver;
   window.MutationObserver=class extends MO{constructor(callback){const stat={source:new Error().stack.split('\n').slice(2,4).map(s=>s.replace(/https?:\/\/[^/]+/g,'')).join(' '),calls:0,records:0,ms:0};stats.observers.push(stat);super((records,observer)=>{const start=performance.now();stat.calls++;stat.records+=records.length;try{callback(records,observer);}finally{stat.ms+=performance.now()-start;}});}};
   new PerformanceObserver(list=>stats.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
  });
  await context.route(/gc\.zgo\.at|fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
  await context.route('**/api/study-status',r=>r.fulfill({json:{ready:false,authenticated:false,freeAccess:true,codeRequired:false,freeUntil:'2026-10-06T22:00:00.000Z'}}));
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const session=await context.newCDPSession(p);
  if(process.env.BELRE_THROTTLE!=='0'){
   await session.send('Emulation.setCPUThrottlingRate',{rate:4});
   await session.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  }
  let start=Date.now();await p.goto(base+'/index.html');await p.locator('#belre-site-nav').waitFor();
  const homeMs=Date.now()-start;
  await p.waitForTimeout(300);
  const home=await p.evaluate(()=>({nodes:document.querySelectorAll('*').length,resources:performance.getEntriesByType('resource').map(e=>({url:e.name.split('/').at(-1),ms:e.duration,bytes:e.decodedBodySize})),longTasks:__perf.longTasks}));
  start=Date.now();await p.locator('#belre-site-nav a[href="#pagina/sam/c12"]').click();await p.locator('.summary-objectives').waitFor();
  const summaryMs=Date.now()-start;
  const topicMs=await p.evaluate(()=>{const start=performance.now();document.querySelectorAll('.summary-topics [data-topic]')[1].click();return performance.now()-start;});
  start=Date.now();await p.locator('#belre-site-nav a[href="/oefenen/#oefenen"]').click();
  const f=p.frameLocator('#belre-course-frame');await f.locator('[data-mc="start-test"]').waitFor();
  await p.waitForFunction(()=>document.getElementById('belre-course-frame').contentWindow.CafaExams);
  const practiceMs=Date.now()-start;
  const before=await p.evaluate(()=>{const w=document.getElementById('belre-course-frame').contentWindow;return {host:structuredClone(__perf),course:structuredClone(w.__perf)};});
  await p.waitForTimeout(500);await session.send('Performance.enable');
  const metricsA=await session.send('Performance.getMetrics');await p.waitForTimeout(1500);const metricsB=await session.send('Performance.getMetrics');
  const idle=Object.fromEntries(metricsB.metrics.filter(m=>['TaskDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'].includes(m.name)).map(m=>[m.name,m.value-metricsA.metrics.find(x=>x.name===m.name).value]));
  const after=await p.evaluate(()=>{const w=document.getElementById('belre-course-frame').contentWindow;return {host:structuredClone(__perf),course:structuredClone(w.__perf),courseResources:w.performance.getEntriesByType('resource').map(e=>({url:e.name.split('/').at(-1),ms:e.duration,bytes:e.decodedBodySize}))};});
  results.push({run,homeMs,summaryMs,topicMs,practiceMs,home,idle,before,after,errors});
  fs.writeFileSync(process.env.BELRE_PERF_OUTPUT||'output/performance-audit.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify({run,homeMs,summaryMs,topicMs,practiceMs,idle,observers:after.host.observers.map((s,i)=>({...s,idleCalls:s.calls-(before.host.observers[i]?.calls||0)})),courseObservers:after.course.observers.map((s,i)=>({...s,idleCalls:s.calls-(before.course.observers[i]?.calls||0)})),errors}));
  await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(process.env.BELRE_PERF_OUTPUT||'output/performance-audit.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
