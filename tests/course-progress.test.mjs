import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import summary from '../js/summary-data.mjs';
import {summaryStudyParts} from '../js/course-links.mjs';
import {studyStorageKey,readStudyProgress,setStudied,studyStatus} from '../js/study-progress.mjs';
import {mcStorageKey,examStorageKey,readQuestionProgress,courseProgress} from '../oefenen/js/course-progress-core.mjs';
const require=createRequire(import.meta.url),mcCore=require('../oefenen/js/mc-core.js'),examEngine=require('../oefenen/js/exam-engine.js');
const read=name=>JSON.parse(fs.readFileSync(new URL('../oefenen/content/'+name+'.json',import.meta.url)));
const bank=read('mc'),exams=read('exams'),map=read('course-map'),dependencies={mcCore,examEngine};
const calculate=input=>courseProgress(bank,exams,map,input,examEngine.answeredCount);
function storage(initial={}){
  const entries=new Map(Object.entries(initial));return {entries,writes:[],getItem:key=>entries.get(key)??null,setItem(key,value){this.writes.push(key);entries.set(key,value);}};
}
function run(question,answer){return {ids:[question.id],answers:{[question.id]:answer}};}
const makeAttempt=()=>examEngine.createAttempt(exams.find(exam=>exam.id==='belre3-20250611'),{id:'progress-test',now:Date.parse('2026-10-01T10:00:00Z')});

test('central totals cover the current bank and all mapped source questions once',()=>{
  const progress=calculate({});
  assert.deepEqual(progress.colleges.map(c=>c.id),['1 en 2','3','4 en 5','6 en 7','8','9']);
  assert.deepEqual(progress.mc,{available:689,answered:0});
  assert.deepEqual(progress.exam,{available:336,answered:0});
  assert.equal(progress.supplementary,13);
  assert.deepEqual(progress.study,{completed:0,total:19});
  const innovation=progress.colleges[0].topics.find(t=>t.id==='innovatiebox');
  assert.equal(innovation.mc.available,25);assert.deepEqual(innovation.exam,{available:0,answered:0});
  assert.ok(progress.colleges.reduce((sum,c)=>sum+c.exam.available,0)>336,'Mixed source groups must be deduplicated in the overall total');
});

test('MC choices are unique across active, completed and retried runs; retired questions are preserved outside coverage',()=>{
  const q=bank.questions[0],choice=q.options[0].id,retired=bank.retiredQuestions[0];
  const progress=calculate({runs:[run(q,{optionId:choice}),run(q,{optionId:''}),run(q,{optionId:'',first:{optionId:choice,correct:false}}),run(bank.questions[1],{ownText:'Een eigen redenering'}),run(bank.questions[2],{optionId:'unknown'}),run(retired,{optionId:retired.options[0].id})]});
  assert.equal(progress.mc.answered,1);
  assert.equal(progress.colleges.flatMap(c=>c.topics).find(t=>t.id===q.topicId).mc.answered,1);
});

test('a source question in a full exam and in a subject practice run counts once',()=>{
  const original=makeAttempt(),q=original.exam.questions[0];original.answers[q.id]={html:'<p>Antwoord met een conclusie.</p>'};
  const duplicate=structuredClone(original);duplicate.id='progress-duplicate';duplicate.status='completed';duplicate.exam.id='subject-practice';
  duplicate.exam.questions=[{...q,id:'practice-copy',sourceExamId:original.exam.id,sourceQuestionId:q.id}];duplicate.answers={'practice-copy':{html:'<p>Een tweede uitwerking.</p>'}};
  original.answers[original.exam.questions[1].id]={html:'<p><br> &nbsp; \u200b</p>'};
  const progress=calculate({attempts:[original,duplicate]});assert.equal(progress.exam.answered,1);
  const group=map.groups.find(g=>g.examId===original.exam.id&&g.questionIds.includes(q.id));
  for(const topic of progress.colleges.flatMap(c=>c.topics))assert.equal(topic.exam.answered,group.topicIds.includes(topic.id)?1:0,topic.id);
});

test('drawings, journal cells and stock cells use the existing exam answer definition',()=>{
  const a=makeAttempt(),[blank,journal,stock,drawing]=a.exam.questions;
  a.answers[blank.id]={html:'<style>abc</style><script>abc</script><p>&#160;</p>'};
  a.answers[journal.id]={journalRows:[['Debet','100']]};
  a.answers[stock.id]={stockCells:{a:'250'}};
  a.answers[drawing.id]={drawing:[[[0,0],[1,1]]]};
  assert.equal(calculate({attempts:[a]}).exam.answered,3);
});

test('both exam storage formats are read without writes or migration',()=>{
  const a=makeAttempt(),mc={version:1,runs:[],filters:{}};
  const legacy=storage({[mcStorageKey]:JSON.stringify(mc),[examStorageKey]:JSON.stringify({version:1,attempts:[a]})});
  const key=examStorageKey+':attempt:'+a.id+':test';
  const split=storage({[mcStorageKey]:JSON.stringify(mc),[examStorageKey]:JSON.stringify({version:2,attempts:[{id:a.id,key}]}),[key]:JSON.stringify(a)});
  for(const source of [legacy,split]){
    const result=readQuestionProgress(source,dependencies);assert.equal(result.mcOK,true);assert.equal(result.examOK,true);assert.deepEqual(result.attempts,[a]);assert.deepEqual(source.writes,[]);
  }
});

test('unreadable or incomplete stores are reported separately and never silently overwritten',()=>{
  const invalid=storage({[mcStorageKey]:'broken',[examStorageKey]:JSON.stringify({version:2,attempts:[{id:'missing',key:examStorageKey+':attempt:missing:test'}]})});
  assert.deepEqual(readQuestionProgress(invalid,dependencies),{runs:[],attempts:[],mcOK:false,examOK:false});assert.deepEqual(invalid.writes,[]);
  const wrongKey=storage({[examStorageKey]:JSON.stringify({version:2,attempts:[{id:'other',key:'unrelated-key'}]})});
  assert.equal(readQuestionProgress(wrongKey,dependencies).examOK,false);assert.equal(readQuestionProgress(wrongKey,dependencies).mcOK,true);
  const blocked={getItem(){throw new Error('Storage blocked');}};
  const result=readQuestionProgress(blocked,dependencies);assert.equal(result.mcOK,false);assert.equal(result.examOK,false);
});

test('every reading tab contributes to a named subject, including FE antiabuse and all college 9 tabs',()=>{
  const parts=new Set(bank.topicOrder.flatMap(t=>summaryStudyParts(t.id)));
  const tabs=summary.colleges.flatMap(c=>c.topics.map(t=>t.id));
  assert.deepEqual([...parts].sort(),tabs.sort());
  for(const row of summary.coverage)assert.equal(summaryStudyParts(row.id)[0],row.summaryTopic);
});

test('study marks survive reload and preserve other subjects and partial reading progress',()=>{
  const s=storage(),topic='fiscale-strategie-toezicht-ethiek',parts=summaryStudyParts(topic);
  assert.equal(setStudied(s,topic,[parts[0]],true,100).ok,true);
  assert.deepEqual(studyStatus(readStudyProgress(s).store,topic),{completed:1,total:3,studied:false});
  assert.equal(setStudied(s,'belastingplicht',['c12-bp'],true,200).ok,true);
  assert.equal(setStudied(s,topic,parts,true,300).ok,true);
  const stored=readStudyProgress(s).store;assert.equal(studyStatus(stored,topic).studied,true);assert.equal(studyStatus(stored,'belastingplicht').studied,true);
  assert.equal(calculate({study:stored}).study.completed,2);
  setStudied(s,topic,['c9-tp'],false,400);
  assert.deepEqual(studyStatus(readStudyProgress(s).store,topic),{completed:2,total:3,studied:false});
  assert.equal(studyStatus(readStudyProgress(s).store,'belastingplicht').studied,true);
  const shared=storage();setStudied(shared,'winstbegrip',['c12-winst'],true,500);
  assert.equal(studyStatus(readStudyProgress(shared).store,'zakelijkheidsbeginsel').studied,false,'Subjects sharing one text retain separate explicit marks');
});

test('study failures do not erase existing data or create a false saved state',()=>{
  for(const raw of ['broken','{"version":9,"topics":{}}','{"version":1,"topics":{"belastingplicht":{"c12-bp":{"studied":"yes","updatedAt":0}}}}']){
    const s=storage({[studyStorageKey]:raw});assert.equal(setStudied(s,'belastingplicht',['c12-bp'],true).ok,false);assert.equal(s.getItem(studyStorageKey),raw);assert.deepEqual(s.writes,[]);
  }
  const s=storage();s.setItem=()=>{throw new Error('Quota');};
  assert.equal(setStudied(s,'belastingplicht',['c12-bp'],true).ok,false);assert.equal(readStudyProgress(s).store.topics.belastingplicht,undefined);
  assert.equal(setStudied(storage(),'unknown',['c12-bp'],true).ok,false);
  assert.equal(setStudied(storage(),'belastingplicht',['c9-tp'],true).ok,false);
});
