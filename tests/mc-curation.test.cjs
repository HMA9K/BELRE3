const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const Core=require('../oefenen/js/mc-core.js');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bank=read('oefenen/content/mc.json'),decisions=read('content-authoring/mc-curation.json');
const original=JSON.parse(cp.execFileSync('git',['show','050b2dec366e215c1e9f21a697f4922b19030d79:oefenen/content/mc.json'],{maxBuffer:10*1024*1024}).toString('utf8'));
const all=new Map([...bank.questions,...bank.retiredQuestions].map(q=>[q.id,q]));

test('redactie is expliciet, zonder stille herindeling of verweesde leerdoelen',()=>{
  const counts=Object.fromEntries(['syllabus','tentamen','kort'].map(c=>[c,Core.select(bank,{category:c}).length]));
  assert.deepEqual(counts,{syllabus:448,tentamen:53,kort:93});
  assert.equal(decisions.retired.length,54);assert.equal(decisions.additions.length,20);
  assert.equal(bank.questions.length,594);assert.equal(all.size,648);
  assert.deepEqual(read('oefenen/content/summary.json').mcCategories,counts);
  assert.equal(bank.retiredQuestions.length,54);
  const active=new Set(bank.questions.map(q=>q.id));
  for(const r of decisions.retired){
    assert.ok(r.reason);assert.ok(!active.has(r.id));
    assert.ok(r.replacementIds.length);r.replacementIds.forEach(id=>assert.ok(active.has(id),id));
  }
  for(const t of bank.topicOrder)assert.ok(Core.select(bank,{topic:t.id}).length,t.id);
  for(const q of original.questions)assert.deepEqual(all.get(q.id),q,q.id);
  assert.deepEqual(bank.questions.filter(q=>!original.questions.some(old=>old.id===q.id)),decisions.additions);
});

test('nieuwe casussen hebben unieke opties, uitleg en uitsluitend vrijgegeven bronvragen',()=>{
  const sources=read('oefenen/content/sources.json'),exams=read('oefenen/content/exams.json');
  const normalized=new Set();
  for(const q of bank.questions){
    const key=(q.caseText+'\n'+q.prompt).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    assert.ok(!normalized.has(key),q.id);normalized.add(key);
  }
  for(const q of decisions.additions){
    assert.equal(q.category,'tentamen');assert.ok(q.caseText&&q.prompt&&q.explanationSteps.length>=3);
    assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.text)).size,4);
    assert.equal(q.options.filter(o=>o.id===q.correctOptionId).length,1);
    assert.ok(q.options.every(o=>o.explanation));assert.ok(q.legalReferences.length);
    for(const ref of q.sourceRefs){
      assert.ok(sources[ref.sourceId]);assert.ok(ref.pdfPages.length);
      assert.ok(ref.pdfPages.every(n=>Number.isInteger(n)&&n>0&&n<=sources[ref.sourceId].pages));
    }
    for(const a of q.examAlignment){
      const e=exams.find(e=>e.id===a.examId);assert.ok(e);
      const origin=e.questions.find(q=>q.groupTitle===a.sourceSection&&String(q.sourceQuestionNumber)===String(a.sourceQuestion));
      assert.ok(origin);assert.equal(origin.modelStatus,'ready');assert.ok(a.changesFromSource);
    }
  }
});

test('oude reeksen inclusief vervallen vragen behouden inhoud, antwoorden en eerste score',()=>{
  const old=Core.createRun(original,{category:'kort'},'before-update');
  const id=decisions.retired.find(r=>r.category==='kort').id,q=all.get(id);
  old.index=old.ids.indexOf(id);assert.ok(old.index>=0);
  old.answers[id]={optionId:q.options.find(o=>o.id!==q.correctOptionId).id};
  Core.check(old,q);const saved=JSON.parse(JSON.stringify(old));
  assert.ok(Core.canResume(bank,saved));assert.ok(Core.validateStore({version:1,runs:[saved]}));
  saved.answers[id].optionId=q.correctOptionId;assert.equal(Core.check(saved,q),true);
  assert.equal(saved.answers[id].first.correct,false);
  assert.deepEqual(saved.ids,old.ids);assert.equal(saved.index,old.index);
  const current=Core.createRun(bank,{category:'kort'},'after-update');
  assert.ok(Core.canResume(bank,current));assert.ok(!current.ids.includes(id));
  assert.equal(Core.canResume(bank,{...old,revision:'unknown'}),false);
  assert.equal(Core.canResume(bank,{...old,ids:[decisions.additions[0].id]}),false);
  assert.equal(Core.canResume(bank,{...current,ids:[id]}),false);
  old.status='completed';assert.ok(Core.canResume(bank,old));assert.throws(()=>Core.check(old,q));
});

test('alle oorspronkelijke MC-reeksen blijven hervatbaar, alle nieuwe alleen met actieve IDs',()=>{
  for(const category of ['','syllabus','tentamen','kort']){
    const old=Core.createRun(original,{category},'old-'+(category||'all'));
    assert.ok(Core.canResume(bank,old));
    const current=Core.createRun(bank,{category},'new-'+(category||'all'));
    assert.ok(Core.canResume(bank,current));
    assert.ok(!current.ids.some(id=>decisions.retired.some(r=>r.id===id)));
  }
});
