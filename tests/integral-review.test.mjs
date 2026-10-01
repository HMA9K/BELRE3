import test from 'node:test';import assert from 'node:assert/strict';import data from '../js/summary-data.mjs';import {decisionPath} from '../js/summary-decision-core.mjs';
const topics=data.colleges.flatMap(c=>c.topics),sections=topics.flatMap(t=>t.sections),section=id=>sections.find(s=>s.id===id),tree=id=>topics.flatMap(t=>t.decisionTrees||[]).find(t=>t.id===id),end=(id,choices)=>decisionPath(tree(id),choices).at(-1).node.id;
test('review routes cover corrected statutory edge cases',()=>{
 assert.equal(end('deelneming',['Ja']),'fbi-no-exemption');
 assert.equal(end('vordering',['Ja','Nee','Ja']),'recapture');
 assert.equal(end('fe-ontvoegen',['Nee','Verder','Nee','Ja','Verder','Verder']),'after');
 assert.equal(end('hybride-ontvanger',['Ja','Ja','Nee','Volledig gedekt']),'dual-full');
 assert.match(tree('innovatie').nodes.find(n=>n.id==='small').text,/kosten ter verwerving van die voordelen/);
 assert.doesNotMatch(tree('innovatie').nodes.find(n=>n.id==='small').text,/voordelen plus voortbrengingskosten/);
});
test('required source cases and article material are present',()=>{
 assert.match(section('c12-winst-vv').bodyHtml,/1\.170\.000/);assert.match(section('c12-winst-aftrek').bodyHtml,/toekomstige tantièmes/);
 assert.match(section('c45-dvs-basis').bodyHtml,/bonusaandelen/);assert.match(section('c8-tp-rekenen').bodyHtml,/88,5/);
 assert.match(section('c9-ht-convenanten').bodyHtml,/aansluitovereenkomst/);assert.match(section('c9-eth-juridisch').bodyHtml,/pleitbaar standpunt/);
});
test('learning goals are separate and introductory sources stay compact',()=>{
 assert.ok(sections.every(s=>s.learningGoal&&s.learningGoal!==s.examTip));
 assert.equal(new Set(sections.map(s=>s.learningGoal)).size,107);
 assert.ok(sections.every(s=>!/uitleggen en toepassen/i.test(s.learningGoal)));
 assert.ok(topics.every(topic=>topic.compactRecall?.length>=2&&topic.compactRecall.length<=3));
 assert.ok(data.colleges.every(college=>college.integratingCase?.sections.length>=4));
 assert.ok(section('c12-bp-stelsel').examAnswer.sourceRefs.length<15);
 assert.ok(section('c12-bp-stelsel').examAnswer.sourceRefs.some(r=>r.locator?.startsWith('Globale wetsopbouw')));
});

test('stelselopening follows the source route and answers the concrete case with applicable members',()=>{
 const current=section('c12-bp-stelsel'),plain=current.bodyHtml.replace(/<[^>]+>/g,' ');
 assert.ok(plain.indexOf('Wie?')<plain.indexOf('Waarover?'));
 assert.match(current.examAnswer.steps[0].text,/art\. 2 lid 1 onderdeel a/i);
 assert.match(current.examAnswer.steps[1].text,/art\. 7 lid 3.*aftrekbare giften.*art\. 7 lid 2.*verrekenbare verliezen.*art\. 7 lid 1/i);
 assert.match(current.examAnswer.steps[3].text,/art\. 15 lid 1/i);
 assert.match(current.examAnswer.worked.text,/particuliere aandeelhouder.*geen fiscale eenheid/i);
 assert.match(current.examAnswer.worked.text,/Wet IB.*ontbreekt/i);
 assert.ok(current.examAnswer.sourceRefs.length<15);
});
test('reviewed teaching order keeps qualification and methods before applications',()=>{
 const dvs=topics.find(topic=>topic.id==='c45-dvs').sections.map(item=>item.id);
 assert.ok(dvs.indexOf('c45-dvs-toetsen')<dvs.indexOf('c45-dvs-kosten'));
 const analysis=section('c8-tp-analyse').bodyHtml,methods=section('c8-tp-methoden').bodyHtml;
 assert.doesNotMatch(analysis,/Transactie uit oefencasus 6/);
 assert.match(methods,/Comparable Uncontrolled Price[\s\S]*Resale price[\s\S]*Cost-plus[\s\S]*TNMM[\s\S]*Profit split[\s\S]*Transactie uit oefencasus 6/);
 assert.match(section('c8-tp-mismatch').bodyHtml,/Art\. 8ba[\s\S]*Art\. 8bb[\s\S]*Art\. 8bc[\s\S]*Art\. 8bd/);
 assert.match(section('c67-verlies-herverdeling').bodyHtml,/Eerste aangeboden ruimte[\s\S]*Tweede aanbod[\s\S]*Definitief benut/);
});
