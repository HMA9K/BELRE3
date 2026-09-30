(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BelreMc=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const categories=['syllabus','tentamen','kort'],levels=['basis','toepassing','tentamenniveau'];
  function select(bank,filters){
    return bank.questions.filter(q=>(!filters.category||q.category===filters.category)&&(!filters.difficulty||q.difficulty===filters.difficulty)&&(!filters.topic||q.topicId===filters.topic));
  }
  function createRun(bank,filters,id){
    if(!/^[a-zA-Z0-9.-]+$/.test(id))throw new Error('Ongeldig poging-ID');
    if((filters.category&&!categories.includes(filters.category))||(filters.difficulty&&!levels.includes(filters.difficulty)))throw new Error('Ongeldig filter');
    const ids=select(bank,filters).map(q=>q.id);if(!ids.length)throw new Error('Geen vragen binnen deze selectie.');
    return {id,revision:bank.contentRevision,filters:{...filters},ids,index:0,answers:{},marked:{},status:'active',startedAt:Date.now()};
  }
  function check(run,question){
    const answer=run.answers[question.id];
    if(run.status!=='active'||!run.ids.includes(question.id)||!answer||!question.options.some(o=>o.id===answer.optionId))throw new Error('Kies eerst één antwoord.');
    const correct=answer.optionId===question.correctOptionId;
    if(!answer.first)answer.first={correct,optionId:answer.optionId};
    answer.checked=true;answer.correct=correct;return correct;
  }
  function validateStore(state){
    if(!state||state.version!==1||!Array.isArray(state.runs))return false;
    const ids=new Set();
    return state.runs.every(r=>{
      if(!r||typeof r.id!=='string'||!/^[a-zA-Z0-9.-]+$/.test(r.id)||ids.has(r.id)||!Array.isArray(r.ids)||!r.ids.length||new Set(r.ids).size!==r.ids.length||!r.ids.every(i=>typeof i==='string')||!Number.isInteger(r.index)||r.index<0||r.index>=r.ids.length||!['active','completed'].includes(r.status)||!r.answers||Array.isArray(r.answers)||typeof r.answers!=='object'||!r.marked||typeof r.marked!=='object')return false;
      ids.add(r.id);
      return Object.entries(r.answers).every(([id,a])=>r.ids.includes(id)&&a&&typeof a.optionId==='string'&&(!a.first||(typeof a.first.correct==='boolean'&&typeof a.first.optionId==='string')));
    });
  }
  return Object.freeze({select,createRun,check,validateStore});
});
