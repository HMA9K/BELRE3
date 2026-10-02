import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../js/summary-data.mjs';
import {validateDecisionTree,decisionPath,decisionRewind,decisionText} from '../js/summary-decision-core.mjs';
import {decisionPathHtml} from '../js/summary-decision.mjs';
import {matchingSections} from '../js/summary-core.mjs';
import {articleReferences,articleNumbers,requestedMembers,lawMembers} from '../js/summary-law-core.mjs';
const authored=JSON.parse(fs.readFileSync(new URL('../content-authoring/summary/decision-trees.json',import.meta.url),'utf8'));
const law=JSON.parse(fs.readFileSync(new URL('../js/summary-law.json',import.meta.url),'utf8'));
const trees=data.colleges.flatMap(college=>college.topics.flatMap(topic=>topic.decisionTrees||[]));
const tree=id=>trees.find(tree=>tree.id===id);
const endpoint=(id,labels)=>decisionPath(tree(id),labels).at(-1).node.id;

test('A no answers one condition; other requalification conditions remain separate steps',()=>{
  assert.equal(endpoint('lening',['Nee']),'bodem');
  assert.equal(endpoint('lening',['Nee','Nee']),'participating');
  assert.equal(endpoint('lening',['Nee','Nee','Nee']),'debt');
  assert.equal(endpoint('lening',['Nee','Nee','Nee','Verder']),'limits');
  const first=decisionPathHtml(tree('lening'),[]),second=decisionPathHtml(tree('lening'),['Nee']);
  assert.doesNotMatch(first,/na deze keuze|Vervolgvraag|Uitkomst/);
  assert.equal((second.match(/data-decision-current/g)||[]).length,1);
  assert.match(second,/Gemaakte keuzes/);assert.match(second,/Je koos: Nee/);
  assert.match(second,/Stap 2/);
  assert.ok(!decisionPathHtml(tree('lening'),['Ja']).includes('data-decision-choice='));
  for(const route of trees){
    function visit(labels){const current=decisionPath(route,labels).at(-1).node,html=decisionPathHtml(route,labels);assert.equal((html.match(/data-decision-current/g)||[]).length,1);for(const choice of current.choices||[])visit([...labels,choice.label]);}
    visit([]);
  }
});

test('Reviewed routes reach explained conclusions and retain slide and precise statutory provenance',()=>{
  assert.equal(trees.length,32);assert.equal(new Set(trees.map(tree=>tree.topicId)).size,18);
  assert.equal(authored.trees.length,trees.length);
  for(const entry of trees){
    validateDecisionTree(entry);
    assert.ok(entry.nodes.some(node=>node.type==='decision'));
    assert.ok(entry.sourceRefs.some(ref=>data.sources[ref.sourceId].title.startsWith('Collegeslides/')||ref.sourceId==='pdf-339e313c8d9ef642'),entry.id);
    assert.equal(entry.sections.length,entry.sectionIds.length);
    for(const ref of entry.sourceRefs)assert.ok(ref.pdfPages.every(page=>page>0&&page<=data.sources[ref.sourceId].pages));
    for(const ref of articleReferences(decisionText(entry)).filter(ref=>ref.law==='Vpb'))for(const number of articleNumbers(ref,law)){
      assert.ok(law[number],entry.id+' / '+number);
      const members=lawMembers(law[number].text).map(member=>member.member);
      assert.ok(requestedMembers(ref.part).every(member=>members.includes(member)),entry.id+' / '+ref.label);
      assert.ok(entry.sourceRefs.some(source=>source.sourceId===law[number].sourceId&&source.pdfPages.includes(law[number].pdfPages[0])));
    }
  }
});

test('Graph guard rejects a broken destination, circular route and unreachable rule',()=>{
  const original=authored.trees[0];
  const broken=structuredClone(original);broken.nodes[0].choices[0].to='missing';assert.throws(()=>validateDecisionTree(broken),/bestemming/);
  const cycle=structuredClone(original);cycle.nodes[0].choices[0].to=cycle.start;assert.throws(()=>validateDecisionTree(cycle),/cirkel/);
  const orphan=structuredClone(original);orphan.nodes.push({id:'unused',type:'outcome',title:'Los',text:'Onbereikbaar',choices:[]});assert.throws(()=>validateDecisionTree(orphan),/onbereikbare/);
  assert.throws(()=>decisionPath(original,['Verder']),/Ongeldige keuze/);
});

test('Reopening a visited step drops dependent choices and allows a different conclusion',()=>{
  const route=tree('fe-sanctie'),original=['Ja','Nee','Nee','Nee','Nee','Ja'];
  assert.equal(decisionPath(route,original).at(-1).node.id,'alternative');
  const reopened=decisionRewind(route,original,3);
  assert.equal(decisionPath(route,reopened).at(-1).node.id,'three');
  assert.equal(decisionPath(route,[...reopened,'Ja']).at(-1).node.id,'none');
  assert.equal(original.length,6);
  assert.equal(decisionPath(route,decisionRewind(route,original,0)).at(-1).node.id,route.start);
  for(const index of [-1,7,1.5])assert.throws(()=>decisionRewind(route,original,index),/Onbekende stap/);
});

test('Art. 10a proof alternatives do not become cumulative and the inspector override remains reachable',()=>{
  assert.equal(endpoint('winstdrainage',['Ja','Ja','Ja']),'next');
  assert.equal(endpoint('winstdrainage',['Ja','Ja','Nee','Ja','Nee']),'next');
  assert.equal(endpoint('winstdrainage',['Ja','Ja','Nee','Ja','Ja']),'denied');
  assert.equal(endpoint('winstdrainage',['Ja','Ja','Nee','Nee']),'denied');
  assert.match(tree('winstdrainage').nodes.find(node=>node.id==='next').text,/10b.*15b/);
  assert.equal(tree('lening').nodes.find(node=>node.id==='limits').nextTrees[0].id,'winstdrainage');
  assert.equal(tree('winstdrainage').nodes.find(node=>node.id==='next').nextTrees[0].id,'laagrentend');
  assert.equal(tree('laagrentend').nodes.find(node=>node.id==='next').nextTrees[0].id,'earnings');
});

test('Carry forward and carry back retain separate activity and year tests',()=>{
  assert.equal(endpoint('verlies-cf',['Ja','Nee','Ja','Ja','Nee']),'yearblocked');
  assert.equal(endpoint('verlies-cf',['Ja','Nee','Ja','Nee','Ja']),'restricted');
  assert.equal(endpoint('verlies-cb',['Ja','Nee']),'blocked');
  assert.equal(endpoint('verlies-cb',['Ja','Ja','Nee']),'blocked');
  assert.equal(endpoint('verlies-cb',['Ja','Ja','Ja']),'normal');
  assert.match(tree('verlies-cb').nodes.find(node=>node.id==='investment').text,/beide jaren/);
});

test('Deelneming uses alternative qualifying investment tests and liquidatie checks timing after the amount cap',()=>{
  assert.equal(endpoint('deelneming',['Nee','Ja','Ja','Ja']),'exempt');
  assert.equal(endpoint('deelneming',['Nee','Ja','Ja','Nee','Ja']),'exempt');
  assert.equal(endpoint('deelneming',['Nee','Ja','Ja','Nee','Nee']),'credit');
  assert.equal(endpoint('liquidatie',['Verder','Ja','Ja','Nee','Verder','Ja']),'deduct');
  assert.equal(endpoint('liquidatie',['Verder','Ja','Nee','Nee','Ja']),'deferred');
});

test('FE sanction treats three years as conditional and six years as a separate exception',()=>{
  assert.equal(endpoint('fe-sanctie',['Ja','Nee','Nee','Ja']),'none');
  assert.equal(endpoint('fe-sanctie',['Ja','Nee','Nee','Nee','Ja']),'none');
  assert.equal(endpoint('fe-sanctie',['Ja','Nee','Nee','Nee','Nee','Ja']),'alternative');
  assert.equal(endpoint('fe-sanctie',['Ja','Nee','Nee','Nee','Nee','Nee']),'market');
  assert.match(tree('fe-sanctie').nodes.find(node=>node.id==='three').text,/eigen aandelen/);
});

test('Hybride primary priority and secondary receiver rule do not tax a repaired mismatch twice',()=>{
  assert.equal(endpoint('hybride',['Ja','Ja','Ja','Ja']),'none');
  assert.equal(endpoint('hybride',['Ja','Ja','Ja','Nee','Nee']),'deny');
  assert.equal(endpoint('hybride-ontvanger',['Ja','Ja','Ja']),'none');
  assert.equal(endpoint('hybride-ontvanger',['Ja','Ja','Nee','Niet gedekt of andere categorie']),'include');
  assert.equal(endpoint('hybride-ontvanger',['Ja','Ja','Nee','Volledig gedekt']),'dual-full');
});

test('Decision text is searchable through its associated explanation',()=>{
  assert.ok(matchingSections(data.colleges,'beslisboom').length);
  assert.ok(matchingSections(data.colleges,'drie kalenderjaren eigen aandelen').some(match=>match.topic.id==='c67-anti'));
});

test('Every article linked to the course explanation is referenced by a route or fixed check',()=>{
  const linked=new Set(data.colleges.flatMap(c=>c.topics.flatMap(t=>t.sections.flatMap(s=>s.articles.map(a=>a.article)))));
  const covered=new Set(trees.flatMap(t=>articleReferences(decisionText(t)).filter(r=>r.law==='Vpb').flatMap(r=>articleNumbers(r,law))));
  assert.equal(linked.size,60);
  for(const article of linked)assert.ok(covered.has(article),'Wet Vpb art. '+article);
  for(const [id,article] of [['verlies-cf','20b'],['verlies-cb','20b'],['fe-verliezen','20b'],['innovatie','12bg'],['hybride','12ag'],['hybride-ontvanger','12ag']])assert.ok(tree(id).notes.some(note=>articleReferences(note).some(ref=>ref.article===article)),id);
});

test('General tax liability separates residents, the foreign subject test and Dutch income',()=>{
  assert.equal(endpoint('bp-algemeen',['Ja']),'domestic');
  assert.equal(endpoint('bp-algemeen',['Nee','Nee']),'outside');
  assert.equal(endpoint('bp-algemeen',['Nee','Ja','Ja']),'taxable');
  assert.equal(endpoint('bp-algemeen',['Nee','Ja','Nee','Ja']),'taxable');
  assert.equal(endpoint('bp-algemeen',['Nee','Ja','Nee','Nee']),'outside');
});

test('Art. 13a has its own cumulative scope and a separate CFC overlap result',()=>{
  for(const labels of [['Nee'],['Ja','Nee'],['Ja','Ja','Nee'],['Ja','Ja','Ja','Nee']])assert.equal(endpoint('beleggingswaardering',labels),'ordinary');
  assert.equal(endpoint('beleggingswaardering',['Ja','Ja','Ja','Ja','Nee']),'wev');
  assert.equal(endpoint('beleggingswaardering',['Ja','Ja','Ja','Ja','Ja']),'adjusted');
  assert.equal(tree('deelneming').nodes.find(n=>n.id==='credit').nextTrees[0].id,'beleggingswaardering');
});

test('Old interest balances retain the investment, activity, year and request conditions',()=>{
  assert.equal(endpoint('rentesaldo-belang',['Nee']),'current');
  assert.equal(endpoint('rentesaldo-belang',['Ja','Nee']),'available');
  assert.equal(endpoint('rentesaldo-belang',['Ja','Ja','Ja']),'available');
  assert.equal(endpoint('rentesaldo-belang',['Ja','Ja','Nee','Nee']),'blocked');
  assert.equal(endpoint('rentesaldo-belang',['Ja','Ja','Nee','Ja','Ja','Nee']),'yearblocked');
  assert.equal(endpoint('rentesaldo-belang',['Ja','Ja','Nee','Ja','Nee','Ja']),'restricted');
  assert.equal(endpoint('rentesaldo-belang',['Ja','Ja','Nee','Ja','Nee','Nee']),'blocked');
});

test('Art. 11 retains the scope, annual threshold and demonstrated additional deduction',()=>{
  assert.equal(endpoint('commissaris',['Nee']),'ordinary');
  assert.equal(endpoint('commissaris',['Ja','Nee']),'ordinary');
  assert.equal(endpoint('commissaris',['Ja','Ja','Verder','Nee']),'limited');
  assert.equal(endpoint('commissaris',['Ja','Ja','Verder','Ja']),'additional');
});

test('Exit taxation reaches residual gains after separately determining the resident exit rule',()=>{
  assert.equal(endpoint('eindafrekening',['Ja','Ja','Verder','Ja','Ja']),'residual');
  assert.equal(endpoint('eindafrekening',['Ja','Ja','Verder','Ja','Nee']),'done');
  assert.equal(endpoint('eindafrekening',['Nee','Ja','Ja']),'residual');
  assert.equal(endpoint('eindafrekening',['Ja','Nee','Nee']),'done');
});

test('Dossier and country report thresholds remain separate and local reporting retains exceptions',()=>{
  assert.equal(endpoint('tp-documentatie',['Nee']),'general');
  assert.equal(endpoint('tp-documentatie',['Ja','Nee','Nee']),'nocbc');
  assert.equal(endpoint('tp-documentatie',['Ja','Ja','Verder','Nee']),'nocbc');
  assert.equal(endpoint('tp-documentatie',['Ja','Ja','Verder','Ja','Ja']),'report');
  assert.equal(endpoint('tp-documentatie',['Ja','Ja','Verder','Ja','Nee','Nee']),'nocbc');
  assert.equal(endpoint('tp-documentatie',['Ja','Ja','Verder','Ja','Nee','Ja','Ja']),'nocbc');
  assert.equal(endpoint('tp-documentatie',['Ja','Ja','Verder','Ja','Nee','Ja','Nee']),'report');
});

test('Art. 29i requires the purpose, statutory objective and artificiality cumulatively',()=>{
  for(const labels of [['Nee'],['Ja','Nee'],['Ja','Ja','Nee']])assert.equal(endpoint('algemeen-antimisbruik',labels),'none');
  assert.equal(endpoint('algemeen-antimisbruik',['Ja','Ja','Ja']),'ignore');
});
