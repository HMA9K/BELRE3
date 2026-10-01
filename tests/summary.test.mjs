import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../js/summary-data.mjs';
import {quoteRanges,normalized,matchingSections} from '../js/summary-core.mjs';
import {summaryTopics} from '../js/course-links.mjs';
import {articleReferences,articleNumbers,lawMembers,requestedMembers} from '../js/summary-law-core.mjs';
const law=JSON.parse(fs.readFileSync(new URL('../js/summary-law.json',import.meta.url)));
const all=data.colleges.flatMap(c=>c.topics.flatMap(t=>t.sections));
const prescribedArticles=new Set(['pdf-5f352a2e817b9e32','pdf-91a384d8deb5a187','pdf-a44edb9235045f17','pdf-7a82bd6214802347']);

test('PDF line wraps do not alter statutory quotations or highlighting offsets',()=>{
  const text='1. De winst\n wordt bepaald.\n2. Een uitzondering blijft gelden.';
  const ranges=quoteRanges(text,['De winst wordt bepaald.','winst wordt']);
  assert.deepEqual(ranges,[[3,27]]);
  assert.equal(normalized(text.slice(...ranges[0])),'de winst wordt bepaald.');
  assert.throws(()=>quoteRanges(text,['De winst wordt niet bepaald.']),/Kernpassage ontbreekt/);
});

test('Every college and mapped exam topic has explanation, objectives and takeaways',()=>{
  assert.deepEqual(data.colleges.map(c=>c.id),['c12','c3','c45','c67','c8','c9']);
  const topics=new Set(data.colleges.flatMap(c=>c.topics.map(t=>t.id)));
  for(const topic of Object.values(summaryTopics))assert.ok(topics.has(topic),topic);
  for(const college of data.colleges){assert.ok(college.objectives.length>=3);assert.ok(college.remember.length>=3);}
  assert.equal(data.coverage.length,19);assert.equal(data.examCount,15);
  assert.ok(data.coverage.every(row=>row.examIds.length<=15));
  assert.equal(data.coverage.find(row=>row.id==='innovatiebox').examIds.length,0);
});

test('All highlighted passages are verbatim in the supplied statute; all section sources stay in scope',()=>{
  for(const section of all){
    assert.ok(section.examTip);assert.ok(section.sourceRefs.length);
    for(const ref of section.sourceRefs){
      const source=data.sources[ref.sourceId];assert.ok(source,section.id);
      assert.ok(!source.title.startsWith('Artikelen/')||prescribedArticles.has(ref.sourceId));assert.notEqual(ref.sourceId,'pdf-40d56b5d959ac9a9');
      assert.ok(ref.pdfPages.every(p=>Number.isInteger(p)&&p>=1&&p<=source.pages));
    }
    for(const article of section.articles){
      assert.ok(article.why);const original=law[article.article];assert.ok(original);
      assert.ok(quoteRanges(original.text,article.quotes).length);
      assert.ok(!/Alle \(auteurs|Kamerstuknummer:|^Hoofdstuk /m.test(original.text));
      assert.ok(original.pdfPages.length);
    }
  }
});

test('Search finds articles and content across colleges, not only the visible subject',()=>{
  assert.ok(matchingSections(data.colleges,'liquidatieverlies').some(x=>x.college.id==='c45'));
  assert.ok(matchingSections(data.colleges,'15ai').some(x=>x.college.id==='c67'));
  assert.ok(matchingSections(data.colleges,'transfer pricing').some(x=>x.college.id==='c8'));
  assert.ok(matchingSections(data.colleges,'Vermogenssprong onderscheiden').some(x=>x.section.id==='c67-voeg-rekenvoorbeeld'));
  assert.ok(matchingSections(data.colleges,'andere aangewezen controleur').some(x=>x.section.id==='c9-ht-tcf'));
  assert.ok(matchingSections(data.colleges,'Documentatie en voorafgaande zekerheid').some(x=>x.section.id==='c8-tp-documentatie'));
  assert.ok(matchingSections(data.colleges,'bij verwerking van een concernlening').some(x=>x.section.id==='c9-ht-tcf'));
  assert.deepEqual(matchingSections(data.colleges,'zzznietbestaandbegrip'),[]);
});

test('Every topic and subtopic has exam framing and a concrete paired question and answer',()=>{
  const topics=data.colleges.flatMap(college=>college.topics);
  assert.equal(topics.length,20);assert.equal(all.length,107);
  for(const topic of topics){assert.ok(topic.examPractice.intro.trim());for(const section of topic.sections){
    assert.ok(section.examPractice.description.trim(),section.id);assert.ok(section.examPractice.question.trim(),section.id);
    assert.ok(section.examAnswer.steps.length>=4,section.id);assert.ok(section.examAnswer.worked.text.trim(),section.id);
  }}
  assert.match(topics.find(topic=>topic.id==='c12-inno').examPractice.intro,/geen afzonderlijke historische opgave/);
  assert.match(all.find(section=>section.id==='c8-hyb-cfc').examAnswer.worked.text,/75\.000/);
  assert.match(all.find(section=>section.id==='c67-verlies-carryback').examAnswer.worked.text,/FE-verlies 60/);
});

test('Legal explanations distinguish statute, cited case law and course frameworks',()=>{
  assert.equal(all.filter(section=>section.foundation.kind==='college').length,11);
  for(const section of all){
    assert.ok(section.foundation.text.trim(),section.id);
    assert.ok(section.foundation.sourceRefs.length,section.id);
    for(const ref of section.foundation.sourceRefs){const source=data.sources[ref.sourceId];assert.ok(source);assert.ok(ref.pdfPages.every(page=>page>=1&&page<=source.pages));}
    for(const text of [section.foundation.text,section.bodyHtml.replace(/<[^>]*>/g,' '),section.examTip,section.examPractice.question,section.examAnswer.worked.text,...section.examAnswer.steps.map(step=>step.text)])for(const ref of articleReferences(text).filter(ref=>ref.law==='Vpb'))for(const number of articleNumbers(ref,law)){
      if(number==='35')continue;
      assert.ok(law[number],section.id+' / '+ref.label);
      const members=lawMembers(law[number].text).map(member=>member.member);
      assert.ok(requestedMembers(ref.part).every(member=>members.includes(member)),section.id+' / '+ref.label);
    }
  }
  const reclassification=all.find(section=>section.id==='c3-lening-herkwalificatie');
  assert.match(reclassification.bodyHtml,/BNB 1988\/217/);
  assert.match(reclassification.bodyHtml,/art\. 10 lid 1 onderdeel a/);
  assert.match(reclassification.bodyHtml,/art\. 10 lid 1 onderdeel d/);
  assert.match(reclassification.bodyHtml,/art\. 13 lid 1/);
  assert.match(reclassification.bodyHtml,/art\. 13 lid 4 onderdeel b/);
  assert.match(all.find(section=>section.id==='c3-lening-onzakelijk').bodyHtml,/HR 25 november 2011, BNB 2012\/37/);
  assert.match(all.find(section=>section.id==='c9-ht-tcf').foundation.text,/geen wettelijk voorgeschreven functie-indeling/);
  assert.match(all.find(section=>section.id==='c9-tp-melding').foundation.text,/termijnen en uitzonderingen ontbreken/);
});

test('College recall points cover every explanation and lead to sourced applications',()=>{
  let points=0;
  for(const college of data.colleges){
    const expected=new Set(college.topics.flatMap(topic=>topic.sections.map(section=>section.id))),covered=new Set();
    for(const point of college.remember){
      assert.ok(point.title&&point.rule&&point.apply);assert.ok(point.sourceRefs.length);
      for(const id of point.sectionIds){assert.ok(expected.has(id));covered.add(id);}
      assert.deepEqual(point.sections.map(section=>section.id),point.sectionIds);
      for(const ref of point.sourceRefs){assert.ok(data.sources[ref.sourceId]);assert.ok(ref.pdfPages.every(page=>page>=1&&page<=data.sources[ref.sourceId].pages));}
      for(const ref of articleReferences(point.rule+' '+point.apply).filter(ref=>ref.law==='Vpb'))for(const number of articleNumbers(ref,law)){
        assert.ok(law[number],point.title+' / '+number);
        const members=lawMembers(law[number].text).map(member=>member.member);
        assert.ok(requestedMembers(ref.part).every(member=>members.includes(member)),point.title+' / '+ref.label);
      }
      points++;
    }
    assert.deepEqual(covered,expected);
  }
  assert.equal(points,67);
});

test('Explanations precede checklists and distinguish access from the amount consolidated',()=>{
  for(const section of all){assert.ok(section.teaching.paragraphs>=2,section.id);assert.match(section.bodyHtml,/^<p>/);}
  const section=all.find(section=>section.id==='c67-alg-voorwaarden');
  assert.equal(section.teaching.replacesChecklist,true);
  assert.ok(!section.bodyHtml.includes('<ol>'));
  assert.match(section.bodyHtml,/96%/);assert.match(section.bodyHtml,/88%/);
  assert.match(section.bodyHtml,/ten minste 95% van zowel winst als vermogen/);
  assert.match(section.bodyHtml,/middellijk bezit/);
  assert.match(all.find(section=>section.id==='c67-alg-werking').bodyHtml,/niet slechts 95%/);
  for(const college of data.colleges){assert.ok(college.recallGuide.length>=3);for(const topic of college.topics)assert.ok(topic.lessonIntro.length>=2);}
});

test('Prescribed articles add substantive method and governance explanation; source gaps remain explicit',()=>{
  const used=new Set(all.flatMap(section=>section.sourceRefs.map(ref=>ref.sourceId)));
  for(const id of prescribedArticles)assert.ok(used.has(id),id);
  const methods=all.find(section=>section.id==='c8-tp-methoden').bodyHtml;
  for(const term of ['€ 17,25','€ 40','tested party','contribution analysis','residual analysis','kostenindeling'])assert.ok(methods.includes(term),term);
  assert.match(all.find(section=>section.id==='c9-ht-convenanten').bodyHtml,/gentlemen/);
  assert.match(all.find(section=>section.id==='c9-eth-juridisch').bodyHtml,/publieke zekerheidsfunctie/);
  assert.match(all.find(section=>section.id==='c9-eth-casus').bodyHtml,/kritische tegenspraak/);
  assert.ok(data.curriculum.rows.every(row=>row.required&&row.available&&row.gap&&row.sourceRefs.length));
  assert.match(data.curriculum.rows.find(row=>row.collegeId==='c12').gap,/leerboektekst ontbreekt/);
  assert.match(data.curriculum.rows.find(row=>row.collegeId==='c8').gap,/art\. 35 ontbreken/);
});
