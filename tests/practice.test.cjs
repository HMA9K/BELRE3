const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const Core=require('../oefenen/js/mc-core.js'),Policy=require('../oefenen/js/model-policy.js'),Engine=require('../oefenen/js/exam-engine.js');
const bank={contentRevision:'fixture',questions:[
  {id:'q1',category:'kort',difficulty:'basis',topicId:'one',options:[{id:'D'},{id:'B'},{id:'A'},{id:'C'}],correctOptionId:'B'},
  {id:'q2',category:'kort',difficulty:'tentamenniveau',topicId:'one'},
  {id:'q3',category:'tentamen',difficulty:'basis',topicId:'two'},
  {id:'q4',category:'syllabus',difficulty:'toepassing',topicId:'two'}
]};
test('vraagtype en moeilijkheid filteren onafhankelijk',()=>{
  assert.deepEqual(Core.select(bank,{category:'kort'}).map(q=>q.id),['q1','q2']);
  assert.deepEqual(Core.select(bank,{difficulty:'basis'}).map(q=>q.id),['q1','q3']);
  assert.deepEqual(Core.select(bank,{category:'kort',difficulty:'basis'}).map(q=>q.id),['q1']);
  assert.equal(Core.select(bank,{category:'syllabus',difficulty:'basis'}).length,0);
});
test('stabiele optie-IDs en eerste beoordeling blijven behouden bij herhaling',()=>{
  const run=Core.createRun(bank,{category:'kort',difficulty:'basis'},'test-1'),q=bank.questions[0];
  assert.throws(()=>Core.check(run,q));
  run.answers.q1={optionId:'D'};assert.equal(Core.check(run,q),false);
  run.answers.q1.optionId='B';assert.equal(Core.check(run,q),true);
  assert.deepEqual(run.answers.q1.first,{correct:false,optionId:'D'});
  assert.equal(Core.validateStore({version:1,runs:[run]}),true);
  assert.equal(Core.validateStore({version:1,runs:[run,run]}),false);
  assert.equal(Core.validateStore({version:1,runs:[{...run,index:99}]}),false);
  run.status='completed';assert.throws(()=>Core.check(run,q));
});
test('alleen expliciet vrijgegeven oefenmodellen laten puntentoekenning toe',()=>{
  const q={type:'open',modelStatus:'ready',manualModelComparisonAllowed:true,automaticScoringAllowed:false,points:5};
  assert.equal(Policy.score(q,4),4);
  for(const value of [-1,6,NaN,Infinity,'4',null])assert.equal(Policy.score(q,value),null);
  for(const patch of [{modelStatus:'pending'},{manualModelComparisonAllowed:false},{automaticScoringAllowed:true},{modelStatus:undefined}])assert.equal(Policy.score({...q,...patch},4),null);
});
test('overige cursusinhoud blijft gelijk buiten samenvatting, oefenlinks en assistentblokken',()=>{
  const base=cp.execFileSync('git',['show','2e6654be7610f2deca717a89cea2d1ab1ffede1e:index.html'],{maxBuffer:20*1024*1024}).toString('utf8');
  const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const block=current.match(/<!-- belre3-practice-links:start -->[\s\S]*?<!-- belre3-practice-links:end -->/);
  assert.ok(block);assert.equal((block[0].match(/<a /g)||[]).length,2);
  const withoutSummary=html=>html.replace(/<template id="tpl-pg-sam">[\s\S]*?<\/template>/,'<template id="tpl-pg-sam">SUMMARY</template>')
    .replaceAll('Tentamens (oude weergave)','Tentamenvragen &amp; Antwoorden')
    .replace('Volledige tentamens met casussen, opgaven en uitwerkingen. Blader per tentamen of per onderwerp.','Alle 15 tentamens met vragen en (waar beschikbaar) modelantwoorden. Per vraag inklapbaar; sorteer per tentamen of per onderwerp.')
    .replace(/^function goToSummary\(pid\)[^\r\n]*/m,'function goToSummary(pid){SUMMARY_ROUTE}')
    .replace(/<!-- belre3-summary-(assets|boot):start -->[\s\S]*?<!-- belre3-summary-\1:end -->/g,'');
  assert.equal(withoutSummary(current.replace(block[0],'').replace(/<!-- belre3-assistant-(info|assets|boot):start -->[\s\S]*?<!-- belre3-assistant-\1:end -->/g,'')),withoutSummary(base));
});
const content=path.join(__dirname,'../oefenen/content');
test('volledige publicatiebank: selectie, modellen, context en PDF-integriteit',()=>{
  const read=n=>JSON.parse(fs.readFileSync(path.join(content,n+'.json'),'utf8'));
  const mc=read('mc'),exams=read('exams'),sources=read('sources'),review=read('review-ids');
  assert.equal(mc.questions.length,594);assert.equal(exams.length,16);assert.equal(Object.keys(sources).length,55);
  assert.equal(exams.filter(e=>!e.supplemental).length,15);
  const questions=exams.flatMap(e=>e.questions);
  assert.equal(questions.length,336);assert.equal(new Set(questions.map(q=>q.id)).size,336);
  assert.equal(questions.filter(Policy.canCompare).length,336);assert.equal(review.length,0);
  const reviewed=questions.filter(q=>q.modelReviewVerdict);
  assert.equal(reviewed.length,49);
  assert.equal(reviewed.filter(q=>q.modelReviewVerdict==='conditional_on_explicit_assumption').length,5);
  for(const q of reviewed.filter(q=>q.modelReviewVerdict==='conditional_on_explicit_assumption')){
    assert.ok(q.practiceAssumptions2026.length);assert.ok(q.missingData2026.length);
    assert.match(q.solutionHtml,/Oefenmodel met expliciete aannames/);
    assert.equal(Policy.canCompare({...q,practiceAssumptions2026:[]}),false);
  }
  for(const id of ['belre3-20161220-s2-qa','belre3-20211122-s1-q2'])assert.equal(questions.find(q=>q.id===id).answerPresentation,'open_text');
  assert.equal(questions.find(q=>q.id==='belre3-20250611-s6-q26').balanceCount,2);
  for(const e of exams){
    const validation=Engine.validateExam(e);assert.equal(validation.valid,true,JSON.stringify(validation.errors));
    assert.equal(e.maxScore,e.questions.reduce((sum,q)=>sum+q.points,0));
    assert.equal(e.passPoints,undefined);
    if(e.partialSelection)assert.equal(e.defaultUntimed,true);
    for(const q of e.questions){
      assert.equal(q.automaticScoringAllowed,false);
      assert.ok(e.sections.some(s=>s.id===q.sectionId));
      assert.equal(q.dependsOnQuestionIds.length,q.contextQuestionTexts.length);
      q.dependsOnQuestionIds.forEach(id=>assert.ok(e.questions.some(q=>q.id===id)));
      assert.ok(sources[q.sourceRef.sourceId]);
      if(review.some(r=>r.questionId===q.id)){
        assert.equal(q.modelStatus,'pending');assert.equal(Policy.canCompare(q),false);
        assert.match(q.solutionHtml,/wordt nog gecontroleerd/);
        assert.equal(q.solution,undefined);assert.deepEqual(q.sourceRefs2026,[]);
      }
    }
  }
  const crypto=require('node:crypto');
  for(const source of Object.values(sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(content,source.url))).digest('hex'),source.sha256);
  const exam=exams.find(e=>e.questions.some(q=>q.answerPresentation==='drawing')),attempt=Engine.createAttempt(exam,{id:'drawing-test'});
  const q=exam.questions.find(q=>q.answerPresentation==='drawing');attempt.answers[q.id]={drawing:[[[10,10],[20,20]]]};
  assert.equal(Engine.answeredCount(attempt),1);attempt.answers[q.id]={drawing:[[[NaN,10],[20,20]]]};
  assert.equal(Engine.answeredCount(attempt),0);
});
