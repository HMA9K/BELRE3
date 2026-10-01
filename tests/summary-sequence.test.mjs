import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../js/summary-data.mjs';
import {completionStep,readingSteps,readingStepUrl,readingStepPosition,readingStepFromRoute} from '../js/summary-sequence.mjs';

test('The continuous reading route reaches every sourced section exactly once and closes every topic',()=>{
  const steps=readingSteps(data.colleges),sections=data.colleges.flatMap(college=>college.topics.flatMap(topic=>topic.sections));
  assert.deepEqual(steps.filter(step=>step.sectionId!==completionStep).map(step=>step.sectionId),sections.map(section=>section.id));
  assert.equal(new Set(steps.map(readingStepUrl)).size,steps.length);
  assert.equal(steps.filter(step=>step.sectionId===completionStep).length,data.colleges.flatMap(college=>college.topics).length);
  for(const [index,step] of steps.entries()){
    const position=readingStepPosition(data.colleges,step.topicId,step.sectionId);
    assert.deepEqual(position.previous,steps[index-1]||null);
    assert.deepEqual(position.next,steps[index+1]||null);
    const topic=data.colleges.flatMap(college=>college.topics).find(topic=>topic.id===step.topicId);
    assert.equal(readingStepFromRoute(readingStepUrl(step),topic),step.sectionId);
    if(step.sectionId===completionStep)assert.equal(steps[index-1].sectionId,topic.sections.at(-1).id);
  }
});

test('Legacy topic links, invalid section links and decision routes retain a usable destination',()=>{
  const topic=data.colleges[0].topics[0];
  assert.equal(readingStepFromRoute('#pagina/sam/'+topic.id,topic),topic.sections[0].id);
  assert.equal(readingStepFromRoute('#pagina/sam/'+topic.id+'/paragraaf/unknown',topic),topic.sections[0].id);
  assert.equal(readingStepFromRoute('#pagina/sam/'+topic.id+'/beslisboom/tree',topic),completionStep);
  assert.equal(readingStepPosition(data.colleges,topic.id,'unknown').current.sectionId,topic.sections[0].id);
});
