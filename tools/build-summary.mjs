import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {summaryTopics} from '../js/course-links.mjs';
import {quoteRanges,mentionsVpbArticle} from '../js/summary-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const sources=read('oefenen/content/sources.json'),corpus=read('assistant/sources/pages.json');
const map=read('oefenen/content/course-map.json'),exams=read('oefenen/content/exams.json');
const lawId='pdf-339e313c8d9ef642',programId='pdf-d9a35cf6fcd385b1';
const excluded=new Set(['pdf-40d56b5d959ac9a9']); // Unofficial methods handout with a corrupted formula.
const allowed=id=>sources[id]&&!sources[id].title.startsWith('Artikelen/')&&!excluded.has(id);
const parts=['c12-c3','c45-c67','c8-c9'].map(name=>read('content-authoring/summary/'+name+'.json'));
const colleges=parts.flatMap(p=>p.colleges),audit=parts.flatMap(p=>p.audit),ids=new Set();
const chunks=[];let offset=0;
for(const page of corpus.pages.filter(p=>p.sourceId===lawId)){
  const text=page.text.split('Alle (auteurs-)rechten')[0]
    .replace(/^Wet op de vennootschapsbelasting 1969\s*$/gm,'')
    .replace(/^(?:Hoofdstuk|Afdeling)\s+[^\n]*$/gm,'')
    .replace(/^Geldend vanaf[^\n]*$/gm,'')
    .replace(/^(?:Aanhangige wetsvoorstellen|Aanhangig wetsvoorstel|Kamerstuknummer:)[^\n]*$/gm,'').trim()+'\n\n';
  chunks.push({page:page.page,start:offset,end:offset+text.length,text});offset+=text.length;
}
const book=chunks.map(c=>c.text).join(''),starts=[...book.matchAll(/^Artikel[ \t]+(\d+[a-z]*)(?:[ \t]+\[[^\]]*\])?[ \t]*\n/gm)],law={};
for(let i=0;i<starts.length;i++){
  const current=starts[i],end=starts[i+1]?.index??book.length;
  if(law[current[1]])throw Error('Dubbele artikelkop in wetboek: '+current[1]);
  let text=book.slice(current.index+current[0].length,end).replace(/^\s*Geldend vanaf[^\n]*\n/,'').replace(/\nWet op de vennootschapsbelasting 1969\s*$/,'').trim();
  law[current[1]]={article:current[1],title:current[0].trim(),text,sourceId:lawId,pdfPages:chunks.filter(c=>c.end>current.index&&c.start<end).map(c=>c.page)};
}
function checkRefs(refs,label){
  if(!Array.isArray(refs)||!refs.length)throw Error('Bronnen ontbreken: '+label);
  for(const ref of refs)if(!allowed(ref.sourceId)||!ref.pdfPages?.length||ref.pdfPages.some(p=>!Number.isInteger(p)||p<1||p>sources[ref.sourceId].pages))throw Error('Bron buiten afbakening of ongeldige pagina: '+label+' '+JSON.stringify(ref));
}
let sections=0,quotes=0;const usedArticles=new Set(),usedSources=new Set([programId]);
for(const college of colleges){
  if(ids.has(college.id)||!college.objectives?.length||!college.remember?.length)throw Error('Onvolledig college: '+college.id);ids.add(college.id);
  for(const topic of college.topics){
    if(ids.has(topic.id)||!topic.sections.length)throw Error('Dubbel of leeg onderwerp: '+topic.id);ids.add(topic.id);
    for(const section of topic.sections){
      if(ids.has(section.id)||!section.bodyHtml||!section.examTip)throw Error('Onvolledige sectie: '+section.id);ids.add(section.id);sections++;
      if(/<(?:script|style|iframe|img|object)|\son\w+\s*=|javascript:|\sstyle\s*=/i.test(section.bodyHtml))throw Error('Onveilige opmaak: '+section.id);
      checkRefs(section.sourceRefs,section.id);section.sourceRefs.forEach(r=>usedSources.add(r.sourceId));
      section.articles??=[];
      for(const ref of section.articles){
        const article=law[ref.article];if(!article||!ref.quotes?.length||!ref.why)throw Error('Onvolledige wetsverwijzing: '+section.id+' '+ref.article);
        try{quoteRanges(article.text,ref.quotes);}catch(error){throw Error(section.id+' / art. '+ref.article+': '+error.message);}
        quotes+=ref.quotes.length;usedArticles.add(ref.article);usedSources.add(lawId);
      }
    }
  }
}
for(const entry of audit)checkRefs(entry.sourceRefs,entry.topicId);
for(const id of new Set(Object.values(summaryTopics)))if(!ids.has(id))throw Error('Geen samenvatting voor tentamenonderwerp: '+id);
const examSet=new Set(map.examIds),examById=new Map(exams.map(e=>[e.id,e]));
const coverage=map.topics.map(topic=>({id:topic.id,title:topic.title,summaryTopic:summaryTopics[topic.id],examIds:topic.examIds,
  examples:map.groups.filter(g=>examSet.has(g.examId)&&g.topicIds.includes(topic.id)).sort((a,b)=>b.examId.localeCompare(a.examId)).slice(0,3).map(g=>({examId:g.examId,date:examById.get(g.examId).date,group:g.number,sourceRefs:[...new Map(g.sourceRefs.map(r=>[r.sourceId+':'+r.pdfPages.join(','),r])).values()]}))}));
// Keep only article mentions explicitly attributed to Vpb in original answer PDFs.
const lawFrequency={};
for(const number of usedArticles){
  const matches=[];
  for(const exam of exams.filter(e=>!e.supplemental))for(const reference of exam.pdfReferences.filter(r=>r.role==='model_solution')){
    const pages=corpus.pages.filter(p=>p.sourceId===reference.sourceId&&mentionsVpbArticle(p.text,number));
    if(pages.length)matches.push({examId:exam.id,date:exam.date,sourceId:reference.sourceId,pdfPages:pages.map(p=>p.page)});
  }
  lawFrequency[number]={count:new Set(matches.map(m=>m.examId)).size,total:map.examIds.length,examples:matches.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3)};
}
const sourceList=Object.fromEntries([...usedSources].map(id=>[id,sources[id]]));
for(const row of coverage)for(const example of row.examples)for(const ref of example.sourceRefs)sourceList[ref.sourceId]=sources[ref.sourceId];
for(const row of Object.values(lawFrequency))for(const example of row.examples)sourceList[example.sourceId]=sources[example.sourceId];
const generated={version:1,reviewDate:'2026-09-30',lawVersion:'24 mei 2026',colleges,sources:sourceList,coverage,lawFrequency,examCount:map.examIds.length};
fs.writeFileSync(path.join(root,'js/summary-data.mjs'),'// Generated from reviewed course sources; edit content-authoring/summary instead.\nexport default '+JSON.stringify(generated)+';\n');
fs.writeFileSync(path.join(root,'js/summary-law.json'),JSON.stringify(Object.fromEntries([...usedArticles].map(id=>[id,law[id]])))+'\n');
const report={version:1,basis:'Uitsluitend aangeleverde Wet Vpb, officiële collegeslides, onderwijsprogramma, originele tentamens en uitwerkingen, oefenbundels en uitwerkingen. Losse artikelen en onofficiële aantekeningen zijn niet gebruikt.',colleges:colleges.length,topics:coverage,examCount:map.examIds.length,questionGroups:map.groups.filter(g=>examSet.has(g.examId)).length,sections,articles:usedArticles.size,quotes,audit,
 limitations:['Voorgeschreven leerboekparagrafen en afzonderlijke syllabi zijn niet als bronbestand aanwezig.','De aangeleverde Wet Vpb eindigt bij artikel 29i; de tekst van artikel 35 ontbreekt.','Artikelen uit de map Artikelen vallen buiten de opgegeven bronafbakening. College 9 is daarom gecontroleerd tegen slides, onderwijsprogramma en oefen-/tentamenuitwerkingen.','Tentamenfrequenties zijn tellingen van historische bronopgaven, geen voorspelling. Innovatiebox blijft leerstof ondanks nul gemapte historische opgaven.','Historische antwoordmodellen kunnen verouderde artikelnummers en rekenfouten bevatten; actuele uitleg volgt het aangeleverde wetboek van 24 mei 2026.']};
fs.writeFileSync(path.join(root,'docs/summary-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summaryColleges:colleges.length,sections,articles:usedArticles.size,verifiedQuotes:quotes,examTopics:coverage.length}));
