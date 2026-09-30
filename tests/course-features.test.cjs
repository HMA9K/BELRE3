const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=name=>JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../oefenen/content/'+name+'.json'),'utf8'));
const Core=require('../oefenen/js/mc-core.js'),Engine=require('../oefenen/js/exam-engine.js');
const bank=read('mc'),exams=read('exams'),map=read('course-map'),topics=require('../oefenen/js/topic-practice.js')(map,bank);
test('frequentie telt unieke BELRE3-brontentamens en dekt alle bronopgaven',()=>{
 assert.equal(map.examIds.length,15);assert.equal(map.groups.length,94);
 assert.equal(new Set(map.groups.flatMap(g=>g.questionIds)).size,336);
 for(const t of map.topics){assert.equal(new Set(t.examIds).size,t.examIds.length);assert.ok(!t.examIds.includes('belre3-20220613'));for(const id of t.examIds)assert.ok(map.groups.some(g=>g.examId===id&&g.topicIds.includes(t.id)));}
 for(const g of map.groups){const exam=exams.find(e=>e.id===g.examId);assert.deepEqual(g.questionIds,exam.questions.filter(q=>q.groupId===g.id).map(q=>q.id));assert.ok(g.sourceRefs.every(r=>r.sourceId&&r.pdfPages.length));}
 assert.equal(map.topics.find(t=>t.id==='innovatiebox').examIds.length,0);
 assert.ok(map.topics.find(t=>t.id==='earningsstripping').examIds.includes('belre3-20260608'));
});
test('alle 25 onderwerp- en collegeselecties behouden casus, modellen en afhankelijkheden',()=>{
 assert.equal(topics.choices.length,25);
 for(const c of topics.choices){const available=topics.available(exams,c.number);if(!available.length)continue;
 const combined=topics.build(exams,c.number,available.map(e=>e.id));assert.equal(Engine.validateExam(combined).valid,true,JSON.stringify(Engine.validateExam(combined).errors));
 assert.equal(new Set(combined.questions.map(q=>q.id)).size,combined.questions.length);
 for(const q of combined.questions){const original=exams.find(e=>e.id===q.sourceExamId),source=original.questions.find(item=>item.id===q.id);assert.equal(q.promptHtml,source.promptHtml);assert.equal(q.solutionHtml,source.solutionHtml);assert.equal(combined.sections.find(s=>s.id===q.sectionId).contentHtml,original.sections.find(s=>s.id===q.sectionId).contentHtml);for(const id of q.dependsOnQuestionIds)assert.ok(combined.questions.some(q=>q.id===id));}
 assert.equal(combined.defaultUntimed,true);
 }
 assert.throws(()=>topics.build(exams,6,exams.map(e=>e.id)));assert.throws(()=>topics.build(exams,1,[]));
});
test('gemengde toetsreeks blijft na opslaan gelijk en overschrijft geen eerste keuzes of eigen tekst',()=>{
 const run=Core.createRun(bank,{college:'3'},'sample',{mode:'test',count:20});assert.equal(run.ids.length,20);assert.equal(new Set(run.ids).size,20);
 assert.ok(run.ids.every(id=>Core.select(bank,{college:'3'}).some(q=>q.id===id)));
 const q=bank.questions.find(q=>q.id===run.ids[0]),wrong=q.options.find(o=>o.id!==q.correctOptionId).id;
 run.answers[q.id]={optionId:wrong,ownText:'Mijn berekening',selfReview:'partial'};Core.check(run,q);run.answers[q.id].optionId=q.correctOptionId;Core.check(run,q);
 assert.equal(run.answers[q.id].first.correct,false);assert.equal(run.answers[q.id].correct,true);assert.equal(run.answers[q.id].ownText,'Mijn berekening');
 const restored=JSON.parse(JSON.stringify({version:1,runs:[run]}));assert.equal(Core.validateStore(restored),true);assert.deepEqual(restored.runs[0].ids,run.ids);
 const retry=Core.createRun(bank,{},'retry',{ids:[q.id,q.id]});assert.deepEqual(retry.ids,[q.id]);assert.deepEqual(retry.answers,{});
});
test('concepten zonder MC-keuze kunnen veilig bewaard en hervat worden',()=>{
 const run=Core.createRun(bank,{topic:'innovatiebox'},'draft');run.answers[run.ids[0]]={optionId:'',ownText:'Een eigen redenering'};
 assert.ok(Core.validateStore({version:1,runs:[run]}));assert.ok(Core.canResume(bank,run));run.answers[run.ids[0]].ownText={html:'invalid'};assert.equal(Core.validateStore({version:1,runs:[run]}),false);
});
