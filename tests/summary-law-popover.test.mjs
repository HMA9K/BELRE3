import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../js/summary-data.mjs';
import {articleReferences,articleNumbers,selectLaw,focusRanges,requestedTargets,lawSegments} from '../js/summary-law-core.mjs';
const laws=JSON.parse(fs.readFileSync(new URL('../js/summary-law.json',import.meta.url)));
const references=data.colleges.flatMap(c=>c.topics.flatMap(t=>t.sections.flatMap(s=>s.articles)));
const highlights=JSON.parse(fs.readFileSync(new URL('../content-authoring/summary/legal-highlights.json',import.meta.url))).selections;
test('Separate Vpb, AWR, IB and Besluit FE, including lists and ranges',()=>{
  const refs=articleReferences('art. 4 AWR; art. 2 lid 1 onderdeel a; art. 3.53 en 3.54 Wet IB; art. 12 lid 2 Besluit FE; art. 12aa tot en met 12ag');
  assert.deepEqual(refs.map(r=>r.law),['AWR','Vpb','IB','Besluit FE 2003','Vpb']);
  assert.deepEqual(articleNumbers(refs[2],laws),['3.53','3.54']);
  assert.deepEqual(articleNumbers(refs[4],laws),['12aa','12ab','12abis','12ac','12ad','12ae','12af','12ag']);
  assert.equal(refs[1].part,'lid 1 onderdeel a');
  const [bw]=articleReferences('art. 2:391 lid 1 BW');
  assert.equal(bw.law,'BW');assert.equal(bw.article,'2:391');assert.equal(bw.part,'lid 1');
  const compact=articleReferences('art.7–16; art.8b/10b; art.2, lid 1, onderdeel a');
  assert.equal(compact[0].label,'art.7–16');assert.equal(compact[0].last,'16');
  assert.deepEqual(articleNumbers(compact[1],laws),['8b','10b']);
  assert.equal(compact[2].part,'lid 1, onderdeel a');
});
test('Explicit member and letter show the actual requested source, with narrow marks',()=>{
  const fallback=references.filter(r=>r.article==='2');
  const selection=selectLaw(laws['2'],'lid 6',[], '',fallback);
  assert.equal(selection.rows.length,1);assert.equal(selection.rows[0].member,'6');
  assert.ok(selection.rows[0].ranges.length);
  assert.ok(selection.rows[0].ranges.some(([a,b])=>selection.rows[0].text.slice(a,b)==='gehele vermogen'));
  const letter=selectLaw(laws['2'],'lid 1 onderdeel a',[], '',fallback);
  assert.ok(letter.rows.some(r=>r.text.startsWith('a.')));
  assert.ok(!letter.rows.some(r=>/^b\./.test(r.text)));
});
test('All existing source cards use only verified short editorial selections',()=>{
  for(const ref of references){
    const selection=selectLaw(laws[ref.article],ref.label,[ref]);
    assert.ok(selection.ranges.length,ref.label);
    assert.ok(ref.quotes.every(q=>q.split(/\s+/).length<=18),ref.label);
  }
});
test('A repeated legal phrase stays in the reviewed member, not the first occurrence',()=>{
  const text='1. Een uitzondering is niet van toepassing.\n2. De regeling is niet van toepassing bij verlies.';
  const ranges=focusRanges(text,{quotes:['niet van toepassing'],focusPassages:['De regeling is niet van toepassing bij verlies.']});
  assert.equal(text.slice(...ranges[0]),'niet van toepassing');
  assert.ok(ranges[0][0]>text.indexOf('2.'));
  assert.throws(()=>focusRanges(text,{quotes:['uitzondering'],focusPassages:['De regeling is niet van toepassing bij verlies.']}),/beoordeelde passage/);
});
test('Inline Vpb references have source text or an explicit known source gap',()=>{
  const gaps=new Set(['35']);
  for(const c of data.colleges)for(const t of c.topics)for(const s of t.sections)for(const ref of articleReferences(s.bodyHtml.replace(/<[^>]*>/g,' '))){
    if(ref.law==='Vpb')for(const n of articleNumbers(ref,laws))assert.ok(laws[n]||gaps.has(n),s.id+' '+n);
  }
});

test('A compound reference keeps every requested member and letter in one link',()=>{
  const [a]=articleReferences('Art. 2 lid 1 onderdeel a en lid 6 Wet Vpb: een BV.');
  assert.equal(a.label,'Art. 2 lid 1 onderdeel a en lid 6 Wet Vpb');
  assert.deepEqual(requestedTargets(a.part),[{member:'1',letters:['a']},{member:'6',letters:[]}]);
  const [b]=articleReferences('Art. 2 lid 1 onderdelen a en g, lid 2 en lid 8 Wet Vpb 1969 onderscheiden lichamen.');
  assert.equal(b.label,'Art. 2 lid 1 onderdelen a en g, lid 2 en lid 8 Wet Vpb 1969');
  assert.deepEqual(requestedTargets(b.part),[{member:'1',letters:['a','g']},{member:'2',letters:[]},{member:'8',letters:[]}]);
  const rows=selectLaw(laws['2'],b.part,highlights.filter(r=>r.article==='2'),'',references.filter(r=>r.article==='2')).rows;
  assert.deepEqual([...new Set(rows.map(r=>r.member))],['1','2','8']);
  assert.deepEqual(rows.filter(r=>r.letter).map(r=>r.letter),['a','g']);
  assert.ok(rows.filter(r=>r.letter||r.member!=='1').every(r=>r.ranges.length));
});

test('Art. 4 parts a and b both have their own kernel; full view marks no unrelated sibling',()=>{
  const refs=[...references,...highlights].filter(r=>r.article==='4');
  const selection=selectLaw(laws['4'],'onderdelen a en b',refs);
  const b=selection.rows.find(r=>r.letter==='b');
  assert.ok(b.ranges.some(([start,end])=>b.text.slice(start,end).includes('verzorging van werknemers')));
  const a=selectLaw(laws['2'],'lid 1 onderdeel a',[...references,...highlights].filter(r=>r.article==='2'));
  const segments=lawSegments(laws['2'].text,'lid 1 onderdeel a');
  assert.ok(a.ranges.length);
  assert.ok(a.ranges.every(([start,end])=>segments.some(s=>start>=s.start&&end<=s.end)));
  assert.ok(a.rows.every(r=>!r.letter||r.letter==='a'));
  assert.throws(()=>focusRanges(laws['2'].text,{part:'lid 1 onderdeel a',quotes:['Nederlandse publiekrechtelijke rechtspersonen']}),/genoemde lid of onderdeel/);
});

test('Supplemental kernels are short literal phrases pinned to their exact source part',()=>{
  assert.deepEqual(data.legalHighlights,highlights);
  for(const ref of highlights){
    assert.ok(ref.quotes.every(q=>q.split(/\s+/).length<=18),ref.article+' '+ref.part);
    const rows=selectLaw(laws[ref.article],ref.part,[ref]).rows.filter(r=>r.letter!==null);
    assert.ok(rows.length&&rows.every(r=>r.ranges.length),ref.article+' '+ref.part);
  }
});

test('All explicit Vpb parts across explanations, examples, recall and decision trees have kernels',()=>{
  const texts=[];
  for(const c of data.colleges){
    for(const point of c.remember)texts.push(point.rule,point.apply);
    for(const t of c.topics){
      for(const tree of t.decisionTrees||[]){texts.push(tree.title,tree.intro,...(tree.notes||[]));for(const node of tree.nodes)texts.push(node.title,node.text);}
      for(const s of t.sections)texts.push(s.bodyHtml,s.foundation.text,s.examTip,s.examPractice?.question,s.examAnswer?.worked?.text,...(s.examAnswer?.steps||[]).map(step=>step.text),...(s.examAnswer?.worked?.points||[]).map(point=>point.text));
    }
  }
  for(const text of texts.filter(Boolean))for(const ref of articleReferences(text.replace(/<[^>]*>/g,''))){
    if(ref.law!=='Vpb'||!ref.part||!laws[ref.article])continue;
    const selected=selectLaw(laws[ref.article],ref.part,highlights.filter(r=>r.article===ref.article),'',references.filter(r=>r.article===ref.article));
    const rows=selected.rows.filter(r=>r.letter!==null);
    assert.ok(rows.length&&rows.every(r=>r.ranges.length),ref.label);
  }
});
