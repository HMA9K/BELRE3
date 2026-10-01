(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.CafaOpgavePractice=factory(root.BELRE3_COURSE_MAP,root.BELRE3_MC);
})(typeof window!=='undefined'?window:this,function(map,bank){
  'use strict';
  const choices=bank.topicOrder.map(t=>({number:t.order,title:t.title,group:'Hoorcollege '+t.college,topicIds:[t.id]}));
  const colleges=new Map();
  for(const t of bank.topicOrder){if(!colleges.has(t.college))colleges.set(t.college,[]);colleges.get(t.college).push(t.id);}
  for(const [college,topicIds] of colleges)choices.push({number:100+choices.length,title:'Hoorcollege '+college,group:'Alle onderwerpen van een hoorcollege',topicIds});
  const collegeChoices=Array.from(colleges,([id,topicIds])=>({id,title:'Hoorcollege '+id,topics:choices.filter(c=>c.number<100&&c.topicIds.some(t=>topicIds.includes(t))),wholeCollege:choices.find(c=>c.number>=100&&c.topicIds.some(t=>topicIds.includes(t)))}));
  const choice=n=>choices.find(c=>c.number===n);
  function groups(exam,n){const c=choice(n);return c?map.groups.filter(g=>g.examId===exam.id&&g.topicIds.some(t=>c.topicIds.includes(t))):[];}
  function selected(exam,n){const ids=new Set(groups(exam,n).flatMap(g=>g.questionIds));return exam.questions.filter(q=>ids.has(q.id));}
  function available(catalog,n){return catalog.filter(exam=>selected(exam,n).length).sort((a,b)=>b.date.localeCompare(a.date));}
  function build(catalog,n,ids){
    const c=choice(n);if(!c)throw Error('Kies een onderwerp of hoorcollege.');
    const exams=available(catalog,n).filter(e=>ids.includes(e.id));if(!exams.length)throw Error('Selecteer minstens één tentamen.');
    const sections=[],questions=[],sourceIntroductions=[];
    for(const exam of exams){
      const qs=selected(exam,n),sectionIds=new Set(qs.map(q=>q.sectionId));
      for(const section of exam.sections.filter(s=>sectionIds.has(s.id)))sections.push({...section,title:'Tentamen '+exam.date.split('-').reverse().join('-')+' · '+section.title,sourceExamId:exam.id,sourceSectionId:section.id,sourceOpgaveNumber:Number(section.groupId.split('-s')[1]),sourceCode:exam.date.replaceAll('-','')});
      for(const q of qs)questions.push({...q,sourceExamId:exam.id,sourceQuestionId:q.id,sourceCode:exam.date.replaceAll('-',''),sourceDate:exam.date});
      sourceIntroductions.push({id:exam.id,code:exam.date.replaceAll('-',''),title:exam.title,date:exam.date,introduction:exam.introduction,introductionHtml:exam.introductionHtml,instructions:exam.instructions});
    }
    return {id:'onderwerp-'+n+'-'+exams.map(e=>e.id.slice(7)).join('-'),title:'BELRE3 · '+c.title,date:exams[0].date,durationMinutes:180,defaultUntimed:true,practiceKind:'opgave',selectionBasis:'topic',opgaveNumber:n,topicTitle:c.title,sourceExamIds:exams.map(e=>e.id),sourceIntroductions,sourceSectionCount:new Set(questions.map(q=>q.groupId)).size,questions,sections,maxScore:questions.reduce((sum,q)=>sum+q.points,0),introduction:'Oefenreeks met volledige bronopgaven over '+c.title+'. De oorspronkelijke casus, vraag en uitwerking blijven bij elkaar.'};
  }
  return Object.freeze({choices,collegeChoices,available,build,topicTitle:n=>choice(n)?.title||'',questionCount:(exam,n)=>selected(exam,n).length,sourceLabel:(exam,n)=>'bronopgaven '+groups(exam,n).map(g=>g.number).join(', '),sourceSectionId:(exam,n)=>selected(exam,n)[0]?.sectionId||null});
});
