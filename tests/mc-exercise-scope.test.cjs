const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),cp=require('node:child_process');
const Core=require('../oefenen/js/mc-core.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const bank=read('oefenen/content/mc.json'),scope=read('content-authoring/mc-exercise-scope.json');
const all=new Map([...bank.questions,...bank.retiredQuestions].map(q=>[q.id,q]));
test('afbakening verwijdert alle aangewezen IDs en bewaart hun inhoud voor eerdere pogingen',()=>{
  assert.equal(scope.excludedQuestions.length,117);
  const excluded=new Set(scope.excludedQuestions.map(q=>q.id));
  assert.ok(bank.questions.every(q=>!excluded.has(q.id)));
  assert.ok(scope.excludedQuestions.every(q=>all.has(q.id)&&q.reason));
  const previous=bank.previousRevisions.find(r=>r.revision===scope.baseRevision);
  assert.equal(previous.questionIds.length,689);
  const saved={revision:scope.baseRevision,ids:previous.questionIds};
  assert.ok(Core.canResume(bank,saved));
  assert.deepEqual(saved.ids,previous.questionIds);
  assert.ok(!bank.questions.some(q=>['innovatiebox','earningsstripping'].includes(q.topicId)));
  assert.ok(bank.questions.some(q=>q.id==='belre3-mc-c89-0166'));
  assert.ok(bank.questions.some(q=>q.id==='belre3-mc-c89-0067'));
  assert.ok(!bank.questions.some(q=>['belre3-mc-c89-0097','belre3-mc-c89-0077'].includes(q.id)));
});
test('dubbelingen worden op de achtergrond gemarkeerd, korte varianten blijven gericht oefenbaar',()=>{
  assert.equal(bank.duplicateGroups.length,95);
  const active=new Set(bank.questions.map(q=>q.id));
  const retained=bank.duplicateGroups.filter(g=>active.has(g.canonicalQuestionId));
  assert.equal(retained.length,79);
  for(const group of bank.duplicateGroups){
    const normal=all.get(group.canonicalQuestionId);assert.ok(normal);
    for(const id of group.shortQuestionIds){
      const short=all.get(id);assert.ok(short);
      assert.equal(short.authoringBaseQuestionId,normal.id);
      assert.deepEqual(short.options,normal.options);
      assert.equal(short.correctOptionId,normal.correctOptionId);
      assert.deepEqual(short.explanationSteps,normal.explanationSteps);
      if(active.has(normal.id))assert.ok(active.has(id));
    }
  }
  assert.equal(Core.select(bank,{category:'kort'}).length,165);
  const mixed=Core.createRun(bank,{},'exercise-mixed',{mode:'test'});
  assert.equal(mixed.ids.length,407);
  assert.ok(mixed.ids.every(id=>all.get(id).category!=='kort'));
});
