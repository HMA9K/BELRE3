const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL,fileURLToPath}=require('node:url');
const Core=require('../oefenen/js/mc-core.js');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'oefenen/content',name+'.json'),'utf8'));

test('zes brongebonden collegegroepen dekken elke actieve vraag precies eenmaal',()=>{
  const bank=read('mc'),groups=Core.colleges(bank);
  assert.deepEqual(groups.map(g=>g.id),['1-2','3','4-5','6-7','8','9']);
  assert.equal(groups.flatMap(g=>g.topics).length,19);
  const ids=groups.flatMap(g=>Core.select(bank,{college:g.id}).map(q=>q.id));
  assert.equal(ids.length,594);assert.equal(new Set(ids).size,594);
  assert.deepEqual(new Set(ids),new Set(bank.questions.map(q=>q.id)));
  assert.equal(Core.select(bank,{college:'onbekend'}).length,0);
});

test('collegefilters combineren met type, niveau en onderwerp zonder bestaande pogingen te veranderen',()=>{
  const bank=read('mc'),group=Core.colleges(bank).find(g=>g.id==='6-7');
  const question=bank.questions.find(q=>q.category==='tentamen'&&group.topics.some(t=>t.id===q.topicId));
  const filters={college:group.id,topic:question.topicId,category:question.category,difficulty:question.difficulty};
  const selected=Core.select(bank,filters);
  assert.ok(selected.length);assert.ok(selected.every(q=>q.topicId===question.topicId&&q.category===question.category&&q.difficulty===question.difficulty));
  assert.equal(Core.select(bank,{...filters,college:'3'}).length,0);
  const run=Core.createRun(bank,filters,'college-test');
  assert.equal(Core.canResume(bank,run),true);
  const original=Core.createRun(bank,{topic:question.topicId},'earlier-topic-test');
  assert.equal(Core.validateStore({version:1,runs:[original,run]}),true);
  assert.equal(Core.canResume(bank,original),true);
});

test('nieuwe tentamen-PDF-koppelingen behouden de 55 bestaande annotatiesleutels',async()=>{
  const previousFetch=global.fetch;
  global.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
  try{
    const {originalPdfs}=await import(pathToFileURL(path.join(root,'oefenen/data/exam-original-pdfs.mjs')).href);
    const sources=read('sources'),exams=read('exams');
    const entries=Object.entries(originalPdfs).flatMap(([id,exam])=>['questions','solutions'].map(kind=>({id,kind,file:exam[kind]})));
    for(const source of Object.values(sources)){
      const url=new URL(source.url,pathToFileURL(path.join(root,'oefenen/content/'))).href;
      const first=entries.find(e=>e.file.url===url);
      assert.equal(first.id+':'+first.kind+':'+first.file.sha256,source.id+':questions:'+source.sha256);
    }
    for(const exam of exams)for(const [kind,role] of [['questions','questions'],['solutions','model_solution']]){
      const ref=exam.pdfReferences.find(r=>r.role===role);
      if(ref)assert.equal(originalPdfs[exam.id][kind].sha256,sources[ref.sourceId].sha256);
      else assert.equal(originalPdfs[exam.id][kind].url,null);
    }
  }finally{global.fetch=previousFetch;}
});

function browserFixture({storage=new Map(),url='https://belre3.pages.dev/oefenen/#oefenen',unavailable=false}={}){
  const listeners=new Map(),counts=[],attributes={};
  const currentUrl=new URL(url),host={querySelector:()=>null};
  const counter={getAttribute:()=> 'https://wb9k.goatcounter.com/count',addEventListener(){}};
  const document={readyState:'loading',visibilityState:'visible',title:'BELRE3',
    documentElement:{setAttribute:(k,v)=>attributes[k]=v},
    querySelector:selector=>selector==='script[data-goatcounter]'?counter:selector.includes('#exam-app:not')?host:null,
    addEventListener(){}};
  const window={addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    dispatchEvent:event=>(listeners.get(event.type)||[]).forEach(fn=>fn(event)),
    CafaExams:{},BelrePractice:{current:()=>null},goatcounter:{count:value=>counts.push(value),filter:()=>false}};
  const context=vm.createContext({window,document,location:currentUrl,URL,Event,
    history:{replaceState(){}},setTimeout:()=>1,clearTimeout(){},
    localStorage:{getItem:key=>{if(unavailable)throw Error('Unavailable');return storage.get(key)??null;},
      setItem:(key,value)=>{if(unavailable)throw Error('Unavailable');storage.set(key,value);},
      removeItem:key=>{if(unavailable)throw Error('Unavailable');storage.delete(key);}}});
  vm.runInContext(fs.readFileSync(path.join(root,'js/privacy.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'oefenen/js/page-names.js'),'utf8'),context);
  return {window,context,counts,attributes,storage,location:currentUrl};
}

test('Eigen telling werkt op MC, tentamens en na een paginawissel; uitsluiten stopt meten',()=>{
  const storage=new Map([['belre3-mc-v1','existing progress']]),first=browserFixture({storage});
  first.window.StudyPrivacy.setMode('owner');
  first.window.StudyMeasure.activity('Onderdeel geopend');
  assert.equal(first.counts.at(-1).path,'Eigen bezoeken / BELRE3 / MC-oefenvragen / Onderdeel geopend');
  const next=browserFixture({storage});
  assert.equal(next.window.StudyPrivacy.state().mode,'owner');
  next.location.hash='#mc/private-attempt-1/0';
  next.window.BelrePractice.current=()=>({index:0,topic:{college:'6 en 7',title:'Fiscale eenheid'}});
  next.window.StudyMeasure.activity('Vraag beantwoord');
  assert.equal(next.counts.at(-1).path,'Eigen bezoeken / BELRE3 / MC-oefenvragen / Hoorcollege 6 en 7 / Fiscale eenheid / Vraag 1 / Vraag beantwoord');
  assert.doesNotMatch(JSON.stringify(next.counts),/private-attempt/);
  next.location.hash='#welkom/example';
  next.window.CafaExams.catalog=[{id:'example',date:'2026-06-03'}];
  next.window.StudyMeasure.activity('Onderdeel geopend');
  assert.equal(next.counts.at(-1).path,'Eigen bezoeken / BELRE3 / Tentamens / Tentamen 03-06-2026 / Start / Onderdeel geopend');
  const count=next.counts.length;next.window.StudyPrivacy.setMode('excluded');
  next.window.StudyMeasure.activity('Vraag beantwoord');assert.equal(next.counts.length,count);
  assert.equal(browserFixture({storage}).window.StudyPrivacy.canMeasure(),false);
  next.window.StudyPrivacy.setMode('normal');next.window.StudyMeasure.activity('Onderdeel geopend');
  assert.ok(next.counts.at(-1).path.startsWith('BELRE3 /'));
  assert.equal(storage.get('belre3-mc-v1'),'existing progress');
});

test('lokale previews en onbeschikbare browseropslag versturen geen meetgegevens',()=>{
  for(const config of [{url:'http://127.0.0.1:8768/oefenen/#oefenen'},{unavailable:true}]){
    const fixture=browserFixture(config);fixture.window.StudyMeasure.activity('Vraag beantwoord');
    assert.equal(fixture.counts.length,0);
  }
});
