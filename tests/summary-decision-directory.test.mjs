import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../js/summary-data.mjs';
import {decisionDirectory,decisionDirectoryHtml,decisionRoute} from '../js/summary-decision-directory.mjs';

test('The directory lists every tree once, with its original explanation and a link to the correct topic',()=>{
  const groups=decisionDirectory(data.colleges),entries=groups.flatMap(group=>group.trees);
  const original=data.colleges.flatMap(college=>college.topics.flatMap(topic=>(topic.decisionTrees||[]).map(tree=>({topic,tree}))));
  assert.equal(entries.length,25);assert.equal(new Set(entries.map(entry=>entry.id)).size,25);
  for(const {topic,tree} of original){
    const entry=entries.find(item=>item.id===tree.id);assert.ok(entry,tree.id);
    assert.equal(entry.title,tree.title);assert.equal(entry.intro,tree.intro);assert.equal(entry.topic,topic.title);
    assert.deepEqual(decisionRoute(entry.href),{topicId:topic.id,treeId:tree.id});
  }
  const html=decisionDirectoryHtml(data.colleges);
  assert.equal((html.match(/class="decision-directory-card"/g)||[]).length,25);
  assert.equal((html.match(/class="decision-directory-open"/g)||[]).length,25);
  assert.ok(groups.every(group=>group.trees.length));
  assert.equal(decisionRoute('#pagina/beslisbomen'),null);
  assert.equal(decisionRoute('#pagina/sam/c3-lening'),null);
  assert.equal(decisionRoute('#pagina/sam/c3-lening/beslisboom/lening/extra'),null);
});
