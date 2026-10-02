import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../js/summary-data.mjs';
import {validateInteractiveFigure,summaryFigureHtml} from '../js/summary-figure.mjs';
import {figureCrop,validateFigureCrop} from '../js/summary-figure-layout.mjs';
const reviewed={...JSON.parse(fs.readFileSync(new URL('../content-authoring/summary/interactive-figures.json',import.meta.url))),...JSON.parse(fs.readFileSync(new URL('../content-authoring/summary/interactive-diagrams.json',import.meta.url)))};
const additions=JSON.parse(fs.readFileSync(new URL('../content-authoring/summary/college-schemas.json',import.meta.url)));
for(const [id,figures] of Object.entries(additions))for(const [index,figure] of figures.entries())reviewed[id+((index+(id==='c9-ht-tcf'?1:0))?'--'+(index+(id==='c9-ht-tcf'?1:0)):'')]=figure.interactive;
const sections=data.colleges.flatMap(college=>college.topics.flatMap(topic=>topic.sections));
const figures=sections.flatMap(section=>[section.figure,...(section.additionalFigures||[])].filter(Boolean).map((figure,index)=>({...section,id:section.id+(index?'--'+index:''),figure,additionalFigures:undefined})));
const section=sections.find(section=>section.id==='c8-tp-methoden');

test('All 49 interactive schemas retain source pages and the original seven explanations',()=>{
  assert.deepEqual(section.figure.interactive,reviewed[section.id]);
  assert.equal(sections.filter(section=>section.figure).length,35);
  assert.equal(figures.length,49);
  const schema=section.figure.interactive;
  validateInteractiveFigure(schema);
  assert.deepEqual(schema.sourceRefs[0].pdfPages,[4,5,6,7,8]);
  assert.match(data.sources[schema.sourceRefs[0].sourceId].title,/College 8/);
  const captionRef=(ref,label)=>'<a href="'+data.sources[ref.sourceId].url+'">'+label+'</a>';
  for(const figureSection of figures){
    assert.deepEqual({...figureSection.figure.interactive,sourceRefs:reviewed[figureSection.id].sourceRefs},reviewed[figureSection.id]);
    for(const declared of reviewed[figureSection.id].sourceRefs)assert.ok(figureSection.figure.interactive.sourceRefs.some(ref=>ref.sourceId===declared.sourceId&&declared.pdfPages.every(page=>ref.pdfPages.includes(page))));
    validateInteractiveFigure(figureSection.figure.interactive);
    const html=summaryFigureHtml(figureSection,captionRef);
    assert.ok(html.includes(figureSection.figure.image));
    assert.equal((html.match(/<figcaption\b/g)||[]).length,1);
  }
});

test('Every annotated component has a bounded click area, sourced explanation and preserved original slide',()=>{
  for(const entry of figures.filter(section=>section.figure?.interactive?.kind==='annotated-diagram')){
    const model=entry.figure.interactive;
    assert.equal(model.zones.length,model.choices.length);
    const html=summaryFigureHtml(entry,()=>'<a>Collegeslide</a>');
    assert.match(html,/compact-schema-layout/);
    assert.match(html,/diagram-frame/);
    validateFigureCrop(entry);
    const [x,y,w,h]=figureCrop(entry);
    const visible=model.zones.filter(({rect:[zx,zy,zw,zh]})=>zx+zw/2>x&&zx+zw/2<x+w&&zy+zh/2>y&&zy+zh/2<y+h);
    assert.equal((html.match(/data-diagram-zone=/g)||[]).length,visible.length);
    assert.ok(visible.length>0);
    for(const choice of model.choices)assert.ok(html.includes('data-tp-choice="'+choice.id+'"'));
    assert.ok(model.sourceRefs[0].pdfPages.includes(entry.figure.pdfPages[0]));
    const broken=structuredClone(model);broken.zones[0].rect=[95,10,10,10];
    assert.throws(()=>validateInteractiveFigure(broken),/buiten de tekening/);
    const orphan=structuredClone(model);orphan.choices.pop();
    assert.throws(()=>validateInteractiveFigure(orphan),/mist een klikbaar onderdeel/);
  }
  const financing=sections.find(section=>section.id==='c3-lening-route').figure.interactive;
  assert.match(financing.choices.find(choice=>choice.id==='rente').text,/in beginsel/);
  assert.match(financing.choices.find(choice=>choice.id==='dividend').text,/kan.*deelnemingsvrijstelling/);
  assert.ok(financing.choices.find(choice=>choice.id==='rente').facts.some(fact=>fact.text.includes('15b')));
});

test('CUP identifies both own third-party comparisons; resale and cost-plus retain different denominators',()=>{
  const choices=section.figure.interactive.choices;
  const get=id=>choices.find(choice=>choice.id===id);
  const internal=get('interne-cup'),external=get('externe-cup');
  assert.ok(internal.edges.includes('interne-inkoop')&&internal.edges.includes('interne-verkoop'));
  assert.ok(!internal.edges.includes('derdenverkoop'));
  assert.ok(external.edges.includes('derdenverkoop'));
  assert.ok(!external.edges.includes('interne-inkoop')&&!external.edges.includes('interne-verkoop'));
  assert.match(internal.facts.find(fact=>fact.label==='Inkoopzijde').text,/diezelfde winkel/);
  assert.match(get('cost-plus').formula,/kosten × \(1 \+ opslagpercentage\)/);
  assert.match(get('resale-price').formula,/verkoopprijs aan derden × \(1 − brutomargepercentage\)/);
  const broken=structuredClone(section.figure.interactive);
  broken.choices.find(choice=>choice.id==='externe-cup').edges.push('onbekende-transactie');
  assert.throws(()=>validateInteractiveFigure(broken),/onbekende partij of pijl/);
});
