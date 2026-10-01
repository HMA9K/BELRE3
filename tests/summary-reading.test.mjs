import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../js/summary-data.mjs';
import {readingOutline,readingLocation} from '../js/summary-reading.mjs';

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
        const example=topic.sections[i].readingGuide.paragraphs[j].tone==='example';
        if(example)assert.equal(paragraph.number,null);else assert.equal(paragraph.number,section.number+'.'+(++n));
        assert.equal(paragraph.parentNumber,section.number+(n?'.'+n:''));
        assert.equal(paragraph.title,topic.sections[i].readingGuide.paragraphs[j].heading);
        assert.ok(!ids.has(paragraph.id));ids.add(paragraph.id);
      }
      sections++;
    }
  }
  assert.equal(sections,107);assert.ok(ids.size>250);
});
