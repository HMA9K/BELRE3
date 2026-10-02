import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../js/summary-data.mjs';
import {decisionDirectoryHtml} from '../js/summary-decision-directory.mjs';
import {decisionTreesHtml} from '../js/summary-decision.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const evidence=read('content-authoring/summary/decision-exam-evidence.json');
const exams=read('oefenen/content/exams.json'),corpus=read('assistant/sources/pages.json');
const trees=data.colleges.flatMap(c=>c.topics.flatMap(t=>t.decisionTrees||[]));

test('Each exam tag has reviewed literal evidence in an original BELRE3 exam or answer PDF',()=>{
  assert.deepEqual(new Set(Object.keys(evidence.trees)),new Set(trees.map(t=>t.id)));
  for(const tree of trees){
    assert.equal(tree.examEvidence.length,evidence.trees[tree.id].length,tree.id);
    for(const [index,example] of evidence.trees[tree.id].entries()){
      const exam=exams.find(e=>e.id===example.examId);assert.ok(exam&&!exam.supplemental,tree.id);
      assert.ok(exam.questions.some(q=>q.id===example.questionId),tree.id);
      assert.ok(exam.pdfReferences.some(ref=>ref.sourceId===example.sourceId&&['questions','model_solution'].includes(ref.role)),tree.id);
      const original=corpus.pages.find(p=>p.sourceId===example.sourceId&&p.page===example.pdfPage);
      assert.ok(original.text.replace(/\s+/g,' ').includes(example.quote),tree.id);
      const visible=tree.examEvidence[index];assert.equal(visible.date,exam.date);assert.equal(visible.pdfPage,example.pdfPage);
      assert.equal(visible.url,data.sources[example.sourceId].url);
      assert.ok(tree.sourceRefs.some(ref=>ref.sourceId===example.sourceId&&ref.pdfPages.includes(example.pdfPage)),tree.id);
    }
  }
});

test('A shared chapter or article cannot give a more specific untested route an exam tag',()=>{
  for(const id of ['verlies-cf','earnings','hybride','deelneming','tp-correctie'])assert.ok(trees.find(t=>t.id===id).examEvidence.length,id);
  for(const id of ['verlies-cb','rentesaldo-belang','hybride-ontvanger','beleggingswaardering','tp-documentatie','cfc','innovatie','eindafrekening','buitenlandse-winst','algemeen-antimisbruik'])assert.deepEqual(trees.find(t=>t.id===id).examEvidence,[],id);
  const directory=decisionDirectoryHtml(data.colleges);
  assert.equal((directory.match(/data-decision-exam-tag/g)||[]).length,trees.filter(t=>t.examEvidence.length).length);
  for(const c of data.colleges)for(const topic of c.topics)for(const tree of topic.decisionTrees||[]){
    for(const html of [decisionTreesHtml({...topic,decisionTrees:[tree]},()=>''),decisionTreesHtml(topic,()=>'',tree.id)]){
      assert.equal(html.includes('data-decision-exam-tag'),tree.examEvidence.length>0,tree.id);
      if(tree.examEvidence.length){assert.match(html,/Tentamenvoorbeeld/);assert.ok(html.includes('#page='+tree.examEvidence[0].pdfPage));}
    }
  }
});
