import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../js/summary-data.mjs';
import {bundledSectionSources} from '../js/summary-sources.mjs';
test('Een bronnenbundel behoudt alle documenten, pagina\'s en vindplaatsen zonder dubbele documenten',()=>{
 for(const college of data.colleges)for(const topic of college.topics){
  const before=JSON.stringify(topic.sections),bundle=bundledSectionSources(topic.sections);
  assert.equal(new Set(bundle.map(ref=>ref.sourceId)).size,bundle.length);
  for(const section of topic.sections){
   const figures=[section.figure,...section.additionalFigures||[]].filter(Boolean);
   for(const ref of [...section.sourceRefs,...section.foundation.sourceRefs,...section.examAnswer.sourceRefs,...figures.flatMap(figure=>[figure,...figure.interactive.sourceRefs])]){
    const merged=bundle.find(item=>item.sourceId===ref.sourceId);assert.ok(merged);
    for(const page of ref.pdfPages)assert.ok(merged.pdfPages.includes(page));
    if(ref.locator)assert.ok(merged.locator.includes(ref.locator));
   }
  }
  assert.equal(JSON.stringify(topic.sections),before);
 }
});
