import {summaryTopics,summaryUrl} from '../../js/course-links.mjs';

// Use the source question's curriculum mapping, including mixed practice runs.
export function examStudyLinks(context,map){
  if(!context?.question||!map)return [];
  const question=context.question,id=question.sourceQuestionId||question.id;
  const examId=question.sourceExamId||context.exam.id;
  const ids=new Set(map.groups.filter(group=>group.examId===examId&&group.questionIds.includes(id)).flatMap(group=>group.topicIds));
  const links=new Map();
  for(const topic of map.topics){
    if(!ids.has(topic.id)||!summaryTopics[topic.id])continue;
    const href=summaryUrl(topic.id);
    if(!links.has(href))links.set(href,{title:topic.title,href});
  }
  return [...links.values()];
}
