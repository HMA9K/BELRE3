import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../js/summary-data.mjs';
import {quoteRanges,normalized,matchingSections} from '../js/summary-core.mjs';
import {summaryTopics} from '../js/course-links.mjs';
const law=JSON.parse(fs.readFileSync(new URL('../js/summary-law.json',import.meta.url)));
const all=data.colleges.flatMap(c=>c.topics.flatMap(t=>t.sections));

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
      assert.ok(!source.title.startsWith('Artikelen/'));assert.notEqual(ref.sourceId,'pdf-40d56b5d959ac9a9');
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
  assert.deepEqual(matchingSections(data.colleges,'zzznietbestaandbegrip'),[]);
});
