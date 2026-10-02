import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../js/summary-data.mjs';
import {readingOutline,readingLocation,readingNavigationTarget} from '../js/summary-reading.mjs';

test('Reading location ignores collapsed content and changes when the next visible heading reaches the reading line',()=>{
  const headings=[{id:'topic',top:-100,visible:true},{id:'closed',top:0,visible:false},{id:'section',top:170,visible:true},{id:'paragraph',top:450,visible:true}];
  assert.equal(readingLocation(headings,145).id,'topic');
  assert.equal(readingLocation(headings,170).id,'section');
  assert.equal(readingLocation(headings,450).id,'paragraph');
  assert.equal(readingLocation(headings,900).id,'paragraph');
  assert.equal(readingLocation(headings,-150).id,'topic');
  assert.equal(readingLocation([],145),null);
});

test('Every lesson has stable topic, subtopic and paragraph numbering with unique reading anchors',()=>{
  const ids=new Set();let sections=0;
  for(const college of data.colleges)for(const topic of college.topics){
    const outline=readingOutline(college,topic);
    assert.equal(outline.number,college.topics.indexOf(topic)+1);
    assert.equal(outline.sections.length,topic.sections.length);
    for(const [i,section] of outline.sections.entries()){
      assert.equal(section.id,topic.sections[i].id);assert.equal(section.number,outline.number+'.'+(i+1));
      assert.ok(!/^\d+\.\s/.test(section.title));
      assert.equal(section.paragraphs.length,topic.sections[i].readingGuide.paragraphs.length);
      let n=0;
      for(const [j,paragraph] of section.paragraphs.entries()){
        if(paragraph.note)assert.equal(paragraph.number,null);else assert.equal(paragraph.number,section.number+'.'+(++n));
        const parent=section.paragraphs.find(item=>item.id===paragraph.parentId);
        assert.ok(parent&&!parent.note);assert.equal(paragraph.parentNumber,parent.number);
        assert.equal(paragraph.title,topic.sections[i].readingGuide.paragraphs[j].heading.replace(/^\d+[.)]\s*/, '').trim());
        assert.ok(!ids.has(paragraph.id));ids.add(paragraph.id);
      }
      sections++;
    }
  }
  assert.equal(sections,107);assert.ok(ids.size>250);
});

test('Navigation keeps the lesson section current while reading paragraphs, notes and learning stages',()=>{
  let numbered=0,examples=0;
  for(const college of data.colleges)for(const topic of college.topics){
    const outline=readingOutline(college,topic);
    for(const section of outline.sections){
      assert.equal(readingNavigationTarget(outline,'section-'+section.id,section.id),'section-'+section.id);
      assert.equal(readingNavigationTarget(outline,'stage-'+section.id,section.id),'section-'+section.id);
      assert.equal(readingNavigationTarget(outline,'learning-'+section.id+'-practice',section.id),'section-'+section.id);
      for(const paragraph of section.paragraphs){
        const expected='section-'+section.id;
        assert.equal(readingNavigationTarget(outline,paragraph.id,section.id),expected);
        if(paragraph.note)examples++;else numbered++;
      }
    }
    assert.equal(readingNavigationTarget(outline,'summary-topic-title'),'summary-topic-title');
  }
  assert.ok(numbered>200);assert.ok(examples>50);
});

test('Essential criteria stay in main text and examples link to the rule they illustrate',()=>{
  const find=id=>{
    for(const college of data.colleges)for(const topic of college.topics){
      const section=readingOutline(college,topic).sections.find(item=>item.id===id);if(section)return section;
    }
  };
  const stichting=find('c12-bp-stichting');
  assert.equal(stichting.paragraphs[3].title,'Onderneming: beoordeel de activiteiten');
  assert.equal(stichting.paragraphs[4].note,false);
  assert.equal(stichting.paragraphs[1].parentId,'reading-c12-bp-stichting-6');
  assert.equal(stichting.paragraphs[2].parentId,'reading-c12-bp-stichting-6');
  assert.equal(find('c3-lening-deelnemerschap').paragraphs[2].note,false);
  assert.equal(find('c8-tp-methoden').paragraphs[1].note,false);
  assert.equal(find('c8-tp-mismatch').paragraphs[2].note,false);
  const calculation=find('c12-verlies-rekenen');
  assert.equal(calculation.paragraphs[0].note,false);assert.ok(calculation.paragraphs[0].number);
  assert.equal(calculation.paragraphs[1].note,false);assert.ok(calculation.paragraphs[1].number);
  assert.equal(calculation.paragraphs[2].note,true);
});

test('Every decision tree has a unique navigation target and preserves its title and local numbering',()=>{
  const ids=new Set();
  for(const college of data.colleges)for(const topic of college.topics){
    const outline=readingOutline(college,topic),trees=topic.decisionTrees||[];
    assert.equal(outline.trees.length,trees.length);
    for(const [i,tree] of outline.trees.entries()){
      assert.equal(tree.id,'decision-'+trees[i].id);
      assert.equal(tree.title,trees[i].title);assert.equal(tree.number,i+1);
      assert.equal(readingNavigationTarget(outline,tree.id),tree.id);
      assert.ok(!ids.has(tree.id));ids.add(tree.id);
    }
  }
  assert.equal(ids.size,32);
});
