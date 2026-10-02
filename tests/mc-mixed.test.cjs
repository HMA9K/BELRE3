const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../oefenen/js/mc-core.js');
const bank={contentRevision:'fixture',topicOrder:[{id:'a',college:'3'}],questions:[
  {id:'normal',topicId:'a',category:'syllabus',difficulty:'basis'},
  {id:'short-copy',topicId:'a',category:'kort',difficulty:'basis'},
  {id:'short-unique',topicId:'a',category:'kort',difficulty:'basis'},
  {id:'exam',topicId:'a',category:'tentamen',difficulty:'toepassing'}
]};
test('gemengde reeksen bevatten uitsluitend niet-korte vragen en respecteren filters',()=>{
  assert.deepEqual(Core.selectMixed(bank,{}).map(q=>q.id),['normal','exam']);
  assert.deepEqual(Core.createRun(bank,{},'mixed',{mode:'test'}).ids.sort(),['exam','normal']);
  assert.deepEqual(Core.createRun(bank,{category:['syllabus','kort']},'filtered',{mode:'test'}).ids,['normal']);
  assert.equal(Core.selectMixed(bank,{difficulty:'basis'}).length,1);
  assert.equal(Core.selectMixed(bank,{category:'kort'}).length,0);
  assert.throws(()=>Core.createRun(bank,{category:'kort'},'empty',{mode:'test'}),/Geen vragen/);
  assert.deepEqual(Core.createRun(bank,{},'explicit',{mode:'test',ids:['short-copy','exam']}).ids,['exam']);
});
test('gerichte korte reeksen en bestaande gemengde reeksen blijven beschikbaar',()=>{
  assert.deepEqual(Core.createRun(bank,{category:'kort'},'short').ids,['short-copy','short-unique']);
  const saved={revision:'fixture',ids:['normal','short-copy']};
  assert.ok(Core.canResume(bank,saved));
  assert.deepEqual(saved.ids,['normal','short-copy']);
});
