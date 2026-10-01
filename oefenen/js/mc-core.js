(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BelreMc=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const categories=['syllabus','tentamen','kort'],levels=['basis','toepassing','tentamenniveau'];
  function colleges(bank){
    const groups=new Map();
    for(const topic of bank.topicOrder||[]){
      const id=String(topic.college).trim().replace(/\D+/g,'-');
      if(!groups.has(id))groups.set(id,{id,label:'Hoorcollege '+topic.college,college:topic.college,topics:[]});
      groups.get(id).topics.push(topic);
    }
    return [...groups.values()];
  }
  function select(bank,filters){
    const selectedColleges=filterValues(filters.college),selectedCategories=filterValues(filters.category),selectedLevels=filterValues(filters.difficulty),selectedTopics=filterValues(filters.topic);
    const collegeTopics=new Set(colleges(bank).filter(group=>selectedColleges.includes(group.id)).flatMap(group=>group.topics.map(topic=>topic.id)));
    return bank.questions.filter(q=>(!selectedColleges.length||collegeTopics.has(q.topicId))&&(!selectedCategories.length||selectedCategories.includes(q.category))&&(!selectedLevels.length||selectedLevels.includes(q.difficulty))&&(!selectedTopics.length||selectedTopics.includes(q.topicId)));
  }
  function filterValues(value){return [...new Set((Array.isArray(value)?value:typeof value==='string'?[value]:[]).filter(item=>typeof item==='string'&&item))];}
  function availableTopics(bank,filters){const selected=filterValues(filters.college);return colleges(bank).filter(group=>!selected.length||selected.includes(group.id)).flatMap(group=>group.topics);}
  function createRun(bank,filters,id,options={}){
    if(!/^[a-zA-Z0-9.-]+$/.test(id))throw new Error('Ongeldig poging-ID');
    if(['category','difficulty','college','topic'].some(key=>filters[key]!=null&&typeof filters[key]!=='string'&&(!Array.isArray(filters[key])||filters[key].some(value=>typeof value!=='string')))||filterValues(filters.category).some(value=>!categories.includes(value))||filterValues(filters.difficulty).some(value=>!levels.includes(value)))throw new Error('Ongeldig filter');
    let ids=select(bank,filters).map(q=>q.id);
    if(options.ids){const allowed=new Set(ids);ids=[...new Set(options.ids)].filter(id=>allowed.has(id));}
    if(options.mode==='test'){
      for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
      const count=Number(options.count);if(Number.isInteger(count)&&count>0)ids=ids.slice(0,count);
    }
    if(!ids.length)throw new Error('Geen vragen binnen deze selectie.');
    return {id,revision:bank.contentRevision,mode:options.mode==='test'?'test':'practice',filters:Object.fromEntries(Object.entries(filters).map(([key,value])=>[key,Array.isArray(value)?[...value]:value])),ids,index:0,answers:{},marked:{},status:'active',startedAt:Date.now()};
  }
  function check(run,question){
    const answer=run.answers[question.id];
    if(run.status!=='active'||!run.ids.includes(question.id)||!answer||!question.options.some(o=>o.id===answer.optionId))throw new Error('Kies eerst één antwoord.');
    const correct=answer.optionId===question.correctOptionId;
    if(!answer.first)answer.first={correct,optionId:answer.optionId};
    answer.checked=true;answer.correct=correct;return correct;
  }
  function canResume(bank,run){
    const ids=run.revision===bank.contentRevision?bank.questions.map(q=>q.id):
      bank.previousRevisions?.find(r=>r.revision===run.revision)?.questionIds;
    if(!ids)return false;
    const allowed=new Set(ids),available=new Set([...bank.questions,...(bank.retiredQuestions||[])].map(q=>q.id));
    return run.ids.every(id=>allowed.has(id)&&available.has(id));
  }
  function validateStore(state){
    if(!state||state.version!==1||!Array.isArray(state.runs))return false;
    const ids=new Set();
    return state.runs.every(r=>{
      if(!r||typeof r.id!=='string'||!/^[a-zA-Z0-9.-]+$/.test(r.id)||ids.has(r.id)||!Array.isArray(r.ids)||!r.ids.length||new Set(r.ids).size!==r.ids.length||!r.ids.every(i=>typeof i==='string')||!Number.isInteger(r.index)||r.index<0||r.index>=r.ids.length||!['active','completed'].includes(r.status)||!r.answers||Array.isArray(r.answers)||typeof r.answers!=='object'||!r.marked||typeof r.marked!=='object')return false;
      ids.add(r.id);
      return Object.entries(r.answers).every(([id,a])=>r.ids.includes(id)&&a&&typeof a.optionId==='string'&&(a.ownText===undefined||typeof a.ownText==='string')&&(!a.selfReview||['good','partial','again'].includes(a.selfReview))&&(!a.first||(typeof a.first.correct==='boolean'&&typeof a.first.optionId==='string')));
    });
  }
  return Object.freeze({colleges,filterValues,availableTopics,select,createRun,check,canResume,validateStore});
});
