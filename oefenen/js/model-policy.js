(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BelreModelPolicy=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function canCompare(q){return !!q&&q.type==='open'&&q.modelStatus==='ready'&&q.manualModelComparisonAllowed===true&&q.automaticScoringAllowed===false&&
    (q.modelReviewVerdict!=='conditional_on_explicit_assumption'||(Array.isArray(q.practiceAssumptions2026)&&q.practiceAssumptions2026.length>0&&q.practiceAssumptions2026.every(function(s){return typeof s==='string'&&s.trim();})));}
  function score(q,value){return canCompare(q)&&typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=q.points?value:null;}
  return Object.freeze({canCompare,score});
});
