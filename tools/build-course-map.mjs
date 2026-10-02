import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {groupTopics} from '../content-authoring/exam-topic-groups.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'oefenen/content/'+name+'.json'),'utf8'));
const exams=read('exams'),bank=read('mc'),groups=[],used=new Set();
const allTopics=[...bank.topicOrder,...(bank.archivedTopics||[])].sort((a,b)=>a.order-b.order);
for(const exam of exams){
  for(const [groupId,questions] of Map.groupBy(exam.questions,q=>q.groupId)){
    const number=Number(groupId.split('-s')[1]),key=exam.id.slice(7)+':'+number,orders=groupTopics[exam.id.slice(7)]?.[number];
    if(!orders?.length)throw Error('Onderwerpindeling ontbreekt: '+groupId);
    used.add(key);
    const topicIds=orders.map(order=>{const topic=allTopics.find(t=>t.order===order);if(!topic)throw Error('Onbekend onderwerp');return topic.id;});
    groups.push({id:groupId,examId:exam.id,number,topicIds,questionIds:questions.map(q=>q.id),sourceRefs:questions.map(q=>q.sourceRef)});
  }
}
for(const [date,rows] of Object.entries(groupTopics))for(const number of Object.keys(rows))if(!used.has(date+':'+number))throw Error('Bronopgave ontbreekt: '+date+':'+number);
const examIds=exams.filter(e=>!e.supplemental).map(e=>e.id),allowed=new Set(examIds);
const topics=allTopics.map(t=>({...t,groupIds:groups.filter(g=>g.topicIds.includes(t.id)).map(g=>g.id),examIds:[...new Set(groups.filter(g=>allowed.has(g.examId)&&g.topicIds.includes(t.id)).map(g=>g.examId))].sort().reverse()}));
const output={version:1,basis:'Onderwerp in oorspronkelijke opgave; volledige opgaven blijven bijeen. Tax 2 telt niet mee in de frequentie.',examIds,topics,groups};
fs.writeFileSync(path.join(root,'oefenen/content/course-map.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({exams:examIds.length,groups:groups.length,questions:groups.reduce((n,g)=>n+g.questionIds.length,0)}));
