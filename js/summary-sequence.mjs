export const completionStep='afronding';

export function readingSteps(colleges){
  return colleges.flatMap(college=>college.topics.flatMap(topic=>[
    ...topic.sections.map(section=>({collegeId:college.id,topicId:topic.id,sectionId:section.id,title:section.title.replace(/^\d+\.\s*/,''),college:college.label,topic:topic.title})),
    {collegeId:college.id,topicId:topic.id,sectionId:completionStep,title:'Afronding: '+topic.title,college:college.label,topic:topic.title}
  ]));
}

export function readingStepUrl(step){
  return '#pagina/sam/'+step.topicId+(step.sectionId===completionStep?'/afronding':'/paragraaf/'+step.sectionId);
}

export function readingStepPosition(colleges,topicId,sectionId){
  const steps=readingSteps(colleges);
  let index=steps.findIndex(step=>step.topicId===topicId&&step.sectionId===sectionId);
  if(index<0)index=steps.findIndex(step=>step.topicId===topicId);
  if(index<0)index=0;
  return {current:steps[index],previous:steps[index-1]||null,next:steps[index+1]||null,index,total:steps.length};
}

export function readingStepFromRoute(hash,topic){
  const path=hash.split('/');
  if(path[3]==='afronding'||path[3]==='beslisboom')return completionStep;
  if(path[3]==='paragraaf'&&topic.sections.some(section=>section.id===path[4]))return path[4];
  return topic.sections[0].id;
}
