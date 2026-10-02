import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const exams=read('oefenen/content/exams.json');
const review=read('content-authoring/model-scoring.json');
const qs=new Map(exams.flatMap(e=>e.questions).map(q=>[q.id,q]));
test('alle 336 antwoorden hebben een brongebonden normering of expliciet alleen een totaal',()=>{
  assert.equal(review.questions.length,336);assert.equal(new Set(review.questions.map(r=>r.questionId)).size,336);
  for(const r of review.questions){const q=qs.get(r.questionId);assert.equal(createHash('sha256').update(q.solutionHtml).digest('hex'),r.modelSha256);assert.equal(r.total,q.points);assert.equal(q.modelScoring.total,q.points);
    if(['allocated','alternatives'].includes(r.kind))assert.equal(r.items.reduce((n,i)=>n+i.points,0),q.points);
    if(r.kind==='total_only')assert.deepEqual(r.items,[]);
  }
});
test('Clothing kent zeven afzonderlijke criteria van één punt, ook bij kapitaal en arbeid plus economisch verkeer',()=>{
  const r=qs.get('belre3-20260608-s1-q2').modelScoring;
  assert.equal(r.items.length,7);assert.ok(r.items.every(i=>i.points===1&&i.modelQuote));
  assert.match(r.items[1].criterion,/kapitaal en arbeid/);assert.match(r.items[2].criterion,/economische verkeer/);
});
test('volledige journaalposten, keuzemaxima en alternatieve routes tellen niet dubbel',()=>{
  const jp=qs.get('belre3-20260608-s1-q3').modelScoring;assert.deepEqual(jp.items.map(i=>i.points),[2,2,2,1]);
  const choice=qs.get('belre3-20260608-s2-q6').modelScoring;assert.equal(choice.total,4);assert.equal(choice.kind,'capped');assert.equal(choice.items.length,5);
  const groups=qs.get('belre3-20260608-s4-q16').modelScoring;assert.equal(groups.items.length,11);assert.equal(groups.items.reduce((n,i)=>n+i.points,0),11);
  const alt=qs.get('belre3-20201124-s4-q12').modelScoring;assert.equal(alt.kind,'alternatives');assert.deepEqual(alt.items.map(i=>i.points),[3,1,1]);assert.match(alt.note,/niet boven op/);
});
