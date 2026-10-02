import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCaseRegistry} from '../oefenen/js/case-presentation-core.mjs';
const read = name => JSON.parse(readFileSync(new URL('../'+name, import.meta.url),'utf8'));
const exams = read('oefenen/content/exams.json');
const review = read('content-authoring/question-case-scope.json');
const sections = new Map(exams.flatMap(e=>e.sections).map(s=>[s.id,s]));
const signature = html => html.replace(/<br\s*\/?\s*>/g,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();

test('vraagselecties zijn gebonden aan hun ongewijzigde volledige broncasus', () => {
  assert.equal(new Set(review.examIds).size,16);
  assert.equal(new Set(review.questions.map(q=>q.sectionId)).size,review.questions.length);
  for(const entry of review.questions){
    const section=sections.get(entry.sectionId);
    assert.equal(createHash('sha256').update(section.contentHtml).digest('hex'),entry.sourceSha256);
    assert.ok(section.questionContentPresentationHtml);
    assert.ok(section.contentPresentationHtml);
  }
});
test('Clothing-vraag behoudt de volledige broncasus inclusief Duurzaam BV', () => {
  const s=sections.get('belre3-20260608-s1-q2-context');
  const registry=createCaseRegistry(exams,signature);
  const selected=registry.select(s.id,s.contentHtml);
  assert.match(selected,/Stichting Clothing/);
  assert.match(selected,/50\.000/);
  assert.match(selected,/Duurzaam/);
  assert.match(selected,/2\.500\.000/);
  assert.equal(selected,s.contentPresentationHtml);
  assert.equal(s.questionContentPresentationHtml,undefined);
  assert.match(s.contentHtml,/Duurzaam/);
  assert.equal(registry.select(s.id,s.contentHtml.replace('50.000','51.000')),s.contentHtml.replace('50.000','51.000'));
});
test('identieke casussen met verschillende vragen lekken geen selectie naar een onbekende gemengde vraag',()=>{
  const s=sections.get('belre3-20260608-s2-q4-context');
  const registry=createCaseRegistry(exams,signature);
  assert.match(registry.select(s.id,s.contentHtml),/theorievraag/);
  assert.match(registry.select('belre3-20260608-s2-q5-context',s.contentHtml),/50\.000/);
  assert.equal(registry.select('unknown-mixed-case',s.contentHtml),s.contentHtml);
});
test('vervolgvragen behouden de expliciet benodigde eerdere vraagtekst',()=>{
  for(const entry of review.questions){
    const s=sections.get(entry.sectionId);
    if(s.dependsOnQuestionIds.length){
      assert.match(s.questionContentPresentationHtml,/Eerdere vraagtekst bij deze casus/);
      const previous=s.contentPresentationHtml.split('Eerdere vraagtekst bij deze casus')[1];
      assert.ok(s.questionContentPresentationHtml.endsWith(previous));
    }
  }
});

test('feitelijke casussen behouden alle bronpassages bij iedere deelvraag',()=>{
  const ids=new Set(review.questions.map(q=>q.sectionId));
  assert.equal(ids.size,83);
  assert.ok(review.questions.every(q=>q.blocks.length===0));
  const registry=createCaseRegistry(exams,signature);
  for(const section of sections.values()){
    if(ids.has(section.id))continue;
    assert.equal(section.questionContentPresentationHtml,undefined);
    assert.equal(registry.select(section.id,section.contentHtml),section.contentPresentationHtml);
  }
});
