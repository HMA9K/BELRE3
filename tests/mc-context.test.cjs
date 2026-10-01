const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../oefenen/js/mc-core.js');
const bank=JSON.parse(fs.readFileSync('oefenen/content/mc.json','utf8'));
const edits=JSON.parse(fs.readFileSync('content-authoring/mc-context.json','utf8'));

test('contextredactie behoudt de bedragen en opgeslagen reeksen van de direct voorafgaande versie',()=>{
  const previous=structuredClone(bank);
  previous.contentRevision=edits.baseRevision;
  for(const edit of edits.questions){
    Object.assign(previous.questions.find(q=>q.id===edit.id),edit.before);
    const amounts=text=>(text.match(/€\s*[\d.,]+/g)||[]).map(x=>x.replace(/\s/g,''));
    assert.deepEqual(amounts(edit.after.caseText),amounts(edit.before.caseText),edit.id);
  }
  const run=Core.createRun(previous,{category:'kort',topic:'belastingplicht'},'before-context');
  const question=previous.questions.find(q=>q.id==='belre3-mc-c12-0013');
  run.index=run.ids.indexOf(question.id);
  run.answers[question.id]={optionId:question.options.find(o=>o.id!==question.correctOptionId).id};
  Core.check(run,question);
  const saved=JSON.parse(JSON.stringify(run));
  assert.ok(Core.canResume(bank,saved));
  assert.deepEqual(saved.ids,run.ids);
  saved.answers[question.id].optionId=question.correctOptionId;
  Core.check(saved,bank.questions.find(q=>q.id===question.id));
  assert.equal(saved.answers[question.id].first.correct,false);
});
