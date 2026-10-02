import {studyStatus} from '../../js/study-progress.mjs';

export const mcStorageKey='belre3-mc-v1',examStorageKey='belre3-full-exams-v1';
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const questionKey=(exam,id)=>exam+' / '+id;

// Read either existing exam format without migrating, sanitizing or writing it.
export function readQuestionProgress(storage,{mcCore,examEngine}){
  let runs=[],attempts=[],mcOK=true,examOK=true;
  try{
    const raw=storage.getItem(mcStorageKey);
    if(raw!==null){const store=JSON.parse(raw);if(!mcCore.validateStore(store))throw new Error();runs=store.runs;}
  }catch{mcOK=false;}
  try{
    const raw=storage.getItem(examStorageKey);
    if(raw!==null){
      const store=JSON.parse(raw),seen=new Set();
      if(!record(store)||![1,2].includes(store.version)||!Array.isArray(store.attempts))throw new Error();
      attempts=store.attempts.map(item=>{
        let attempt=item;
        if(store.version===2){
          if(!record(item)||typeof item.id!=='string'||!/^[\w.-]+$/.test(item.id)||typeof item.key!=='string'||!item.key.startsWith(examStorageKey+':attempt:'+item.id+':'))throw new Error();
          attempt=JSON.parse(storage.getItem(item.key));
          if(attempt?.id!==item.id)throw new Error();
        }
        if(!record(attempt)||typeof attempt.id!=='string'||seen.has(attempt.id)||!['active','completed'].includes(attempt.status)||!record(attempt.answers)||!examEngine.validateExam(attempt.exam).valid)throw new Error();
        seen.add(attempt.id);return attempt;
      });
    }
  }catch{examOK=false;attempts=[];}
  return {runs,attempts,mcOK,examOK};
}

export function courseProgress(bank,exams,map,{runs=[],attempts=[],study},answeredCount){
  const activeMC=new Map(bank.questions.map(q=>[q.id,q]));
  const sourceQuestions=new Map(exams.flatMap(exam=>exam.questions.map(q=>[questionKey(exam.id,q.id),{q,exam}])));
  const mcAnswered=new Set(),examAnswered=new Set();
  for(const run of runs){
    for(const id of run.ids||[]){
      const q=activeMC.get(id),answer=run.answers?.[id];
      if(q&&answer&&q.options.some(option=>option.id===answer.optionId||option.id===answer.first?.optionId))mcAnswered.add(id);
    }
  }
  for(const attempt of attempts){
    for(const q of attempt.exam.questions){
      const key=questionKey(q.sourceExamId||attempt.exam.id,q.sourceQuestionId||q.id);
      if(sourceQuestions.has(key)&&answeredCount({exam:{questions:[q]},answers:attempt.answers})>0)examAnswered.add(key);
    }
  }
  const counter=(ids,answered)=>({available:ids.size,answered:[...ids].filter(id=>answered.has(id)).length});
  const rows=[...bank.topicOrder,...(bank.archivedTopics||[])].sort((a,b)=>a.order-b.order).map(topic=>{
    const mcIds=new Set(bank.questions.filter(q=>q.topicId===topic.id).map(q=>q.id));
    const examIds=new Set(map.groups.filter(g=>g.topicIds.includes(topic.id)).flatMap(g=>g.questionIds.map(id=>questionKey(g.examId,id))).filter(id=>sourceQuestions.has(id)));
    return {...topic,mcIds,examIds,mc:counter(mcIds,mcAnswered),exam:counter(examIds,examAnswered),study:studyStatus(study,topic.id)};
  });
  const totals=topics=>{
    const mcIds=new Set(topics.flatMap(t=>[...t.mcIds])),examIds=new Set(topics.flatMap(t=>[...t.examIds]));
    return {mc:counter(mcIds,mcAnswered),exam:counter(examIds,examAnswered),study:{completed:topics.filter(t=>t.study.studied).length,total:topics.length}};
  };
  const colleges=[...new Set(rows.map(t=>t.college))].map(id=>{
    const topics=rows.filter(t=>t.college===id);return {id,topics,...totals(topics)};
  });
  const supplementary=new Set(map.groups.flatMap(g=>g.questionIds.map(id=>questionKey(g.examId,id))).filter(id=>sourceQuestions.get(id)?.exam.supplemental));
  return {colleges,...totals(rows),supplementary:supplementary.size};
}
