import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {summaryTopics} from '../js/course-links.mjs';
import {quoteRanges,mentionsVpbArticle} from '../js/summary-core.mjs';
import {focusRanges,articleReferences,articleNumbers,lawMembers,requestedMembers} from '../js/summary-law-core.mjs';
import {validateDecisionTree,decisionText} from '../js/summary-decision-core.mjs';
import {validateInteractiveFigure} from '../js/summary-figure.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const sources=read('oefenen/content/sources.json'),corpus=read('assistant/sources/pages.json');
const map=read('oefenen/content/course-map.json'),exams=read('oefenen/content/exams.json');
const lawId='pdf-339e313c8d9ef642',programId='pdf-d9a35cf6fcd385b1';
const excluded=new Set(['pdf-40d56b5d959ac9a9']); // Unofficial methods handout with a corrupted formula.
const prescribedArticles=new Set(['pdf-5f352a2e817b9e32','pdf-91a384d8deb5a187','pdf-a44edb9235045f17','pdf-7a82bd6214802347']);
const allowed=id=>sources[id]&&(!sources[id].title.startsWith('Artikelen/')||prescribedArticles.has(id))&&!excluded.has(id);
const parts=['c12-c3','c45-c67','c8-c9'].map(name=>read('content-authoring/summary/'+name+'.json'));
const readingGuide=read('content-authoring/summary/reading-guide.json');
const examAnswers=read('content-authoring/summary/exam-answers.json').sections;
const workedAnswers=read('content-authoring/summary/worked-answers.json').sections;
const examPractice=read('content-authoring/summary/exam-practice.json');
const legalGrounding=read('content-authoring/summary/legal-grounding.json');
const legalHighlights=read('content-authoring/summary/legal-highlights.json');
const teaching=read('content-authoring/summary/teaching-explanations.json');
const curriculum=read('content-authoring/summary/curriculum-coverage.json');
const decisionTrees=read('content-authoring/summary/decision-trees.json');
const decisionExamEvidence=read('content-authoring/summary/decision-exam-evidence.json');
const interactiveFigures={...read('content-authoring/summary/interactive-figures.json'),...read('content-authoring/summary/interactive-diagrams.json')};
const colleges=parts.flatMap(p=>p.colleges),audit=parts.flatMap(p=>p.audit),ids=new Set();
const escapeHtml=text=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const plainHtml=html=>html.replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|#39);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[entity]));
for(const college of colleges){
  college.recallGuide=teaching.colleges[college.id];
  college.integratingCase=teaching.integratingCases[college.id];
  college.recallHeadings=teaching.recallHeadings[college.id];
  if(!college.recallGuide?.length)throw Error('Collegeleerroute ontbreekt: '+college.id);
  if(!college.integratingCase?.title||college.integratingCase.sections?.length<4)throw Error('Integrerende casusroute ontbreekt: '+college.id);
  if(college.recallHeadings?.length!==college.recallGuide.length)throw Error('Collegeleesstructuur ontbreekt: '+college.id);
  for(const topic of college.topics){
    topic.lessonIntro=teaching.topics[topic.id];
    topic.compactRecall=teaching.compactRecall[topic.id];
    if(!topic.lessonIntro?.length)throw Error('Inhoudelijke onderwerpintro ontbreekt: '+topic.id);
    if(topic.compactRecall?.length<2||topic.compactRecall.length>3)throw Error('Compact herhaaloverzicht ontbreekt: '+topic.id);
    for(const section of topic.sections){
      const lesson=teaching.sections[section.id];
      if(!lesson||!Array.isArray(lesson.blocks))throw Error('Leeruitleg ontbreekt: '+section.id);
      for(const block of lesson.blocks){
        if(!block.heading||!block.text.trim()||block.emphasis.some(phrase=>!block.text.toLowerCase().includes(phrase.toLowerCase())))throw Error('Leerparagraaf onvolledig: '+section.id);
      }
      const prose=lesson.blocks.map(block=>'<p>'+escapeHtml(block.text)+'</p>').join('');
      section.bodyHtml=prose+(lesson.replaceBody?'':section.bodyHtml);
      readingGuide[section.id]={paragraphs:[...lesson.blocks.map(({heading,tone,emphasis})=>({heading,tone,emphasis})),...(lesson.replaceBody?[]:readingGuide[section.id].paragraphs)]};
      section.sourceRefs.push(...lesson.sourceRefs);
      section.teaching={paragraphs:lesson.blocks.length,replacesChecklist:lesson.replaceBody};
    }
    const topicSectionIds=new Set(topic.sections.map(section=>section.id));
    if(topic.compactRecall.some(row=>row.length!==3||!topicSectionIds.has(row[2])))throw Error('Ongeldige compacte herhaallink: '+topic.id);
  }
  const collegeSectionIds=new Set(college.topics.flatMap(topic=>topic.sections.map(section=>section.id)));
  if(college.integratingCase.sections.some(sectionId=>!collegeSectionIds.has(sectionId)))throw Error('Ongeldige integrerende casuslink: '+college.id);
}
const newRecallPoints=read('content-authoring/summary/recall-extension.json');
for(const college of colleges)college.remember.push(...(newRecallPoints[college.id]||[]));
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
function statutoryRefs(text){
  return articleReferences(text).filter(ref=>ref.law==='Vpb').flatMap(ref=>articleNumbers(ref,law)).filter(number=>law[number]).map(number=>({sourceId:law[number].sourceId,pdfPages:law[number].pdfPages,locator:'Art. '+number+' Wet Vpb'}));
}
const uniqueRefs=refs=>[...new Map(refs.map(ref=>[ref.sourceId+':'+ref.pdfPages.join(','),ref])).values()];
let statutoryMentions=0,caseCitations=0;const externalLawRefs=new Set(),knownSourceGaps=[];
function checkStatutoryMentions(text,label){
  for(const ref of articleReferences(text)){
    if(ref.law!=='Vpb'){externalLawRefs.add(ref.law+': '+ref.label);continue;}
    for(const number of articleNumbers(ref,law)){
      if(!law[number]){if(number==='35'){knownSourceGaps.push({label,article:number});continue;}throw Error('Artikel ontbreekt in wetboek: '+label+' / '+ref.label);}
      statutoryMentions++;
      const members=lawMembers(law[number].text).map(member=>member.member);
      if(requestedMembers(ref.part).some(member=>!members.includes(member)))throw Error('Wetslid ontbreekt in wetboek: '+label+' / '+ref.label);
    }
  }
}
let sections=0,quotes=0,answerSteps=0,workedExamples=0,recallPoints=0,examQuestions=0,examTopicGuides=0;const usedArticles=new Set(),usedSources=new Set([programId]);
for(const college of colleges){
  if(ids.has(college.id)||!college.objectives?.length||!college.remember?.length)throw Error('Onvolledig college: '+college.id);ids.add(college.id);
  for(const paragraph of college.recallGuide)checkStatutoryMentions(paragraph,college.id+' leerroute');
  for(const topic of college.topics){
    if(ids.has(topic.id)||!topic.sections.length)throw Error('Dubbel of leeg onderwerp: '+topic.id);ids.add(topic.id);
    for(const paragraph of topic.lessonIntro)checkStatutoryMentions(paragraph,topic.id+' onderwerpintro');
    const topicPractice=examPractice.topics[topic.id];
    if(!topicPractice?.intro?.trim())throw Error('Tentamenvorm ontbreekt bij onderwerp: '+topic.id);
    topic.examPractice=topicPractice;examTopicGuides++;
    for(const section of topic.sections){
      if(ids.has(section.id)||!section.bodyHtml||!section.examTip)throw Error('Onvolledige sectie: '+section.id);ids.add(section.id);sections++;
      if(/<(?:script|style|iframe|img|object)|\son\w+\s*=|javascript:|\sstyle\s*=/i.test(section.bodyHtml))throw Error('Onveilige opmaak: '+section.id);
      const paragraphs=[...section.bodyHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match=>plainHtml(match[1]));
      const guide=readingGuide[section.id];
      if(!guide||guide.paragraphs.length!==paragraphs.length)throw Error('Leesstructuur onvolledig: '+section.id);
      for(const [i,block] of guide.paragraphs.entries()){
        if(!block.heading||!['explanation','condition','exception','example'].includes(block.tone))throw Error('Ongeldige leesstructuur: '+section.id);
        for(const phrase of block.emphasis)if(!phrase||!paragraphs[i].toLocaleLowerCase('nl').includes(phrase.toLocaleLowerCase('nl')))throw Error('Kernbegrip ontbreekt in uitleg: '+section.id+' / '+phrase);
      }
      section.readingGuide=guide;
      section.learningGoal=teaching.sections[section.id].learningGoal;
      if(!section.learningGoal?.trim())throw Error('Concreet leerdoel ontbreekt: '+section.id);
      const answer=examAnswers[section.id];
      if(!answer||!Array.isArray(answer.steps)||answer.steps.length<4||answer.steps.length>6)throw Error('Tentamenroute onvolledig: '+section.id);
      if(new Set(answer.steps.map(step=>step.title)).size!==answer.steps.length||answer.steps.some(step=>!step.title||!step.text))throw Error('Tentamenstap onvolledig of dubbel: '+section.id);
      const worked=workedAnswers[section.id];
      if(!worked?.title?.trim()||!worked?.text?.trim()||worked.points?.some(point=>!point.label?.trim()||!point.text?.trim()))throw Error('Voorbeeldantwoord onvolledig: '+section.id);
      const practice=examPractice.sections[section.id];
      if(!practice?.description?.trim()||!practice?.question?.trim())throw Error('Voorbeeldvraag of tentamenvorm ontbreekt: '+section.id);
      section.examPractice=practice;examQuestions++;
      const foundation=legalGrounding.sections[section.id];
      if(!foundation?.text?.trim()||!['wet','wet-en-rechtspraak','wet-en-college','college'].includes(foundation.kind))throw Error('Grondslag ontbreekt: '+section.id);
      const foundationLaws=statutoryRefs(foundation.text);
      if(foundation.kind.startsWith('wet')&&!foundationLaws.length)throw Error('Wettelijke grondslag zonder wetsverwijzing: '+section.id);
      const legalBlocks=[['grondslag',foundation.text],['uitleg',section.bodyHtml.replace(/<[^>]*>/g,' ')],['tentamentip',section.examTip],['vraagvorm',practice.description],['voorbeeldvraag',practice.question],...answer.steps.map(step=>[step.title,step.text]),['voorbeeldantwoord',worked.text],...(worked.points||[]).map(point=>[point.label,point.text])];
      const evidence=section.sourceRefs.flatMap(ref=>corpus.pages.filter(page=>page.sourceId===ref.sourceId&&ref.pdfPages.includes(page.page))).map(page=>page.text).join(' ').replace(/\s+/g,' ');
      for(const citation of new Set(legalBlocks.map(([,text])=>text).join(' ').match(/BNB\s+\d{4}\/\d+|HR\s+\d{1,2}\s+[a-z]+\s+\d{4}/g)||[])){
        if(!evidence.includes(citation))throw Error('Arrestverwijzing ontbreekt op bronpagina: '+section.id+' / '+citation);
        caseCitations++;
      }
      section.foundation={...foundation,sourceRefs:uniqueRefs([...foundationLaws,section.sourceRefs[0]])};
      checkRefs(section.foundation.sourceRefs,section.id+' grondslag');
      section.foundation.sourceRefs.forEach(ref=>usedSources.add(ref.sourceId));
      for(const [label,text] of legalBlocks)checkStatutoryMentions(text,section.id+' '+label);
      const answerRefs=[...section.sourceRefs];
      answerRefs.push(...section.foundation.sourceRefs);
      for(const block of [...answer.steps,worked,...(worked.points||[]),{text:practice.description+' '+practice.question}])answerRefs.push(...statutoryRefs(block.text));
      let compactAnswerRefs=uniqueRefs(answerRefs);
      if(section.id==='c12-bp-stelsel'){
        const specific=compactAnswerRefs.filter(ref=>ref.sourceId!==lawId||/Art\. (?:1|2|7|15) Wet Vpb/.test(ref.locator||''));
        const globalPages=[...new Set(compactAnswerRefs.filter(ref=>ref.sourceId===lawId).flatMap(ref=>ref.pdfPages))].sort((a,b)=>a-b);
        compactAnswerRefs=uniqueRefs([...specific,{sourceId:lawId,pdfPages:[1],locator:'Globale wetsopbouw Wet Vpb (volledige wet blijft beschikbaar)'}]);
      }
      section.examAnswer={...answer,worked,sourceRefs:compactAnswerRefs};
      checkRefs(section.examAnswer.sourceRefs,section.id+' tentamenroute');
      section.examAnswer.sourceRefs.forEach(ref=>usedSources.add(ref.sourceId));answerSteps+=answer.steps.length;workedExamples++;
      checkRefs(section.sourceRefs,section.id);section.sourceRefs.forEach(r=>usedSources.add(r.sourceId));
      if(section.figure){
        checkRefs([section.figure],section.id+' figure');usedSources.add(section.figure.sourceId);
        if(!fs.existsSync(path.join(root,section.figure.image.replace(/^\//,''))))throw Error('Figuur ontbreekt: '+section.id);
        const interactive=interactiveFigures[section.id];
        if(interactive){
          validateInteractiveFigure(interactive);
          const text=interactive.choices.flatMap(choice=>[choice.title,choice.text,...choice.facts.map(fact=>fact.text)]).join(' ');
          checkStatutoryMentions(text,section.id+' interactief schema');
          interactive.sourceRefs=uniqueRefs([...interactive.sourceRefs,...statutoryRefs(text)]);
          checkRefs(interactive.sourceRefs,section.id+' interactief schema');interactive.sourceRefs.forEach(ref=>usedSources.add(ref.sourceId));section.figure.interactive=interactive;
        }
      }
      section.articles??=[];
      for(const ref of section.articles){
        const article=law[ref.article];if(!article||!ref.quotes?.length||!ref.why)throw Error('Onvolledige wetsverwijzing: '+section.id+' '+ref.article);
        try{focusRanges(article.text,ref);}catch(error){throw Error(section.id+' / art. '+ref.article+': '+error.message);}
        quotes+=ref.quotes.length;usedArticles.add(ref.article);usedSources.add(lawId);
      }
    }
  }
  const collegeSections=new Map(college.topics.flatMap(topic=>topic.sections.map(section=>[section.id,{topic,section}]))),covered=new Set();
  if(new Set(college.remember.map(point=>point.title)).size!==college.remember.length)throw Error('Dubbel onthoudpunt: '+college.id);
  for(const [index,point] of college.remember.entries()){
    if(!point.title?.trim()||!point.rule?.trim()||!point.apply?.trim()||!point.sectionIds?.length)throw Error('Onthoudpunt onvolledig: '+college.id);
    if(point.sectionIds.some(id=>!collegeSections.has(id)))throw Error('Onthoudpunt verwijst buiten college: '+point.title);
    checkStatutoryMentions(point.rule+' '+point.apply,point.title);
    for(const ref of articleReferences(point.rule+' '+point.apply).filter(ref=>ref.law==='Vpb'))for(const number of articleNumbers(ref,law)){
      if(!law[number])throw Error('Wetstekst ontbreekt bij onthoudpunt: '+point.title+' / '+number);
      const members=lawMembers(law[number].text).map(member=>member.member);
      if(requestedMembers(ref.part).some(member=>!members.includes(member)))throw Error('Lid ontbreekt bij onthoudpunt: '+point.title+' / '+ref.label);
    }
    point.id=college.id+'-recall-'+index;
    point.sections=point.sectionIds.map(id=>{covered.add(id);const {topic,section}=collegeSections.get(id);return {id,topicId:topic.id,title:section.title};});
    point.sourceRefs=uniqueRefs([...point.sectionIds.flatMap(id=>collegeSections.get(id).section.sourceRefs),...statutoryRefs(point.rule+' '+point.apply)]);
    point.articles=point.sectionIds.flatMap(id=>collegeSections.get(id).section.articles);
    checkRefs(point.sourceRefs,point.id);point.sourceRefs.forEach(ref=>usedSources.add(ref.sourceId));recallPoints++;
  }
  if(covered.size!==collegeSections.size)throw Error('Onthoudblokken dekken niet alle uitlegonderdelen: '+college.id);
}
if(Object.keys(examAnswers).some(id=>!ids.has(id)))throw Error('Onbekend onderdeel in tentamenroutes');
if(Object.keys(workedAnswers).some(id=>!ids.has(id)))throw Error('Onbekend onderdeel in voorbeeldantwoorden');
if(Object.keys(examPractice.topics).some(id=>!colleges.some(college=>college.topics.some(topic=>topic.id===id))))throw Error('Onbekend onderwerp in tentamenvormen');
if(Object.keys(examPractice.sections).some(id=>!colleges.some(college=>college.topics.some(topic=>topic.sections.some(section=>section.id===id)))))throw Error('Onbekend onderdeel in voorbeeldvragen');
if(Object.keys(legalGrounding.sections).some(id=>!colleges.some(college=>college.topics.some(topic=>topic.sections.some(section=>section.id===id)))))throw Error('Onbekend onderdeel in grondslagen');
if(decisionTrees.lawVersion!=='24 mei 2026')throw Error('Beslisbomen gebruiken een andere wetsversie');
const sectionIndex=new Map(colleges.flatMap(college=>college.topics.flatMap(topic=>topic.sections.map(section=>[section.id,{topic,section}]))));
const treeIds=new Set();
if(Object.keys(decisionExamEvidence.trees).length!==decisionTrees.trees.length||Object.keys(decisionExamEvidence.trees).some(id=>!decisionTrees.trees.some(tree=>tree.id===id)))throw Error('Tentamencontrole mist een beslisboom of verwijst naar een onbekende boom');
for(const tree of decisionTrees.trees){
  validateDecisionTree(tree);
  if(treeIds.has(tree.id))throw Error('Dubbele beslisboom: '+tree.id);treeIds.add(tree.id);
  const topic=colleges.flatMap(college=>college.topics).find(topic=>topic.id===tree.topicId);
  if(!topic||tree.sectionIds.some(id=>!sectionIndex.has(id))||!tree.sectionIds.some(id=>sectionIndex.get(id).topic.id===topic.id))throw Error('Beslisboom verwijst buiten leerstof: '+tree.id);
  checkStatutoryMentions(decisionText(tree),tree.id+' beslisboom');
  tree.sections=tree.sectionIds.map(id=>{const {topic,section}=sectionIndex.get(id);return {id,title:section.title,topicId:topic.id};});
  tree.articles=tree.sectionIds.flatMap(id=>sectionIndex.get(id).section.articles);
  tree.examEvidence=decisionExamEvidence.trees[tree.id].map(example=>{
    const exam=exams.find(exam=>exam.id===example.examId),question=exam?.questions.find(question=>question.id===example.questionId);
    const reference=exam?.pdfReferences.find(reference=>reference.sourceId===example.sourceId&&['questions','model_solution'].includes(reference.role));
    const original=corpus.pages.find(page=>page.sourceId===example.sourceId&&page.page===example.pdfPage)?.text.replace(/\s+/g,' ');
    if(!exam||exam.supplemental||!question||!reference||!example.scope?.trim()||!example.quote?.trim()||example.quote.split(/\s+/).length>18||!original?.includes(example.quote))throw Error('Tentamentag mist oorspronkelijk bronbewijs: '+tree.id);
    return {examId:exam.id,questionId:question.id,date:exam.date,sourceId:example.sourceId,pdfPage:example.pdfPage,url:sources[example.sourceId].url,scope:example.scope};
  });
  tree.sourceRefs=uniqueRefs([...tree.sectionIds.flatMap(id=>sectionIndex.get(id).section.sourceRefs),...statutoryRefs(decisionText(tree)),...tree.examEvidence.map(example=>({sourceId:example.sourceId,pdfPages:[example.pdfPage]}))]);
  checkRefs(tree.sourceRefs,tree.id);tree.sourceRefs.forEach(ref=>usedSources.add(ref.sourceId));
  (topic.decisionTrees??=[]).push(tree);
}
for(const tree of decisionTrees.trees)for(const node of tree.nodes){
  node.nextTrees=(node.nextTreeIds||[]).map(id=>{
    const target=decisionTrees.trees.find(tree=>tree.id===id);
    if(!target)throw Error('Vervolgboom ontbreekt: '+tree.id+' / '+id);
    return {id:target.id,title:target.title,topicId:target.topicId};
  });
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
for(const id of Object.keys(interactiveFigures))if(!colleges.flatMap(college=>college.topics.flatMap(topic=>topic.sections)).some(section=>section.id===id&&section.figure?.interactive))throw Error('Interactief schema zonder sectie: '+id);
for(const row of coverage)for(const example of row.examples)for(const ref of example.sourceRefs)sourceList[ref.sourceId]=sources[ref.sourceId];
for(const row of Object.values(lawFrequency))for(const example of row.examples)sourceList[example.sourceId]=sources[example.sourceId];
for(const row of curriculum.rows){if(!colleges.some(college=>college.id===row.collegeId)||row.topicIds.some(id=>!ids.has(id)))throw Error('Stofmatrix verwijst naar onbekende uitleg: '+row.collegeId);checkRefs(row.sourceRefs,row.collegeId+' stofmatrix');for(const ref of row.sourceRefs)sourceList[ref.sourceId]=sources[ref.sourceId];}
for(const id of prescribedArticles)if(!usedSources.has(id))throw Error('Voorgeschreven artikel ontbreekt in leeruitleg: '+id);
if(legalHighlights.lawVersion!=='24 mei 2026'||legalHighlights.sourceId!==lawId)throw Error('Kernarceringen verwijzen naar een andere wetkopie.');
const highlightIds=new Set();
for(const ref of legalHighlights.selections){
  const id=ref.article+' '+ref.part;
  if(highlightIds.has(id)||!law[ref.article]||!ref.part||!ref.quotes?.length||ref.quotes.some(q=>q.split(/\s+/).length>18))throw Error('Onvolledige of dubbele kernarcering: '+id);
  highlightIds.add(id);focusRanges(law[ref.article].text,ref);
}
const generated={version:2,reviewDate:legalGrounding.reviewDate,lawVersion:'24 mei 2026',colleges,sources:sourceList,curriculum,coverage,lawFrequency,legalHighlights:legalHighlights.selections,examCount:map.examIds.length};
fs.writeFileSync(path.join(root,'js/summary-data.mjs'),'// Generated from reviewed course sources; edit content-authoring/summary instead.\nexport default '+JSON.stringify(generated)+';\n');
// Inline references also need provisions that have no separate source card.
fs.writeFileSync(path.join(root,'js/summary-law.json'),JSON.stringify(law)+'\n');
const report={version:2,basis:'Aangeleverde Wet Vpb, officiële collegeslides, onderwijsprogramma, oorspronkelijke tentamens en uitwerkingen, oefenbundels en de vier in het onderwijsprogramma voorgeschreven artikelen. Onofficiële aantekeningen zijn niet gebruikt.',colleges:colleges.length,topics:coverage,examCount:map.examIds.length,questionGroups:map.groups.filter(g=>examSet.has(g.examId)).length,sections,answerSteps,workedExamples,recallPoints,recallSections:sections,examQuestions,examTopicGuides,articles:usedArticles.size,quotes,audit,
 limitations:['De voorgeschreven leerboekparagrafen zijn niet als bronbestand aanwezig; volledige dekking tegenover dat leerboek is niet vastgesteld.','De aangeleverde Wet Vpb eindigt bij artikel 29i; de tekst van artikel 35 ontbreekt.','De vier voorgeschreven artikelen zijn verwerkt als bron van methode-uitleg en auteursstandpunten. Hun historische beleid, tarieven en beroepsregels worden niet als gecontroleerde actuele regels gepresenteerd.','Tentamenfrequenties zijn tellingen van historische bronopgaven, geen voorspelling. Innovatiebox blijft leerstof ondanks nul gemapte historische opgaven.','Historische antwoordmodellen kunnen verouderde artikelnummers en rekenfouten bevatten; actuele uitleg volgt het aangeleverde wetboek van 24 mei 2026.']};
report.teaching={sections,paragraphs:Object.values(teaching.sections).reduce((count,lesson)=>count+lesson.blocks.length,0),topicIntroductions:Object.keys(teaching.topics).length,prescribedArticles:[...prescribedArticles],curriculum};
report.decisionTrees={trees:treeIds.size,nodes:decisionTrees.trees.reduce((count,tree)=>count+tree.nodes.length,0),topics:new Set(decisionTrees.trees.map(tree=>tree.topicId)).size,lawVersion:decisionTrees.lawVersion};
report.decisionTrees.examTags={reviewed:treeIds.size,tagged:decisionTrees.trees.filter(tree=>tree.examEvidence.length).length,exams:exams.filter(exam=>!exam.supplemental).length,reviewDate:decisionExamEvidence.reviewDate,basis:decisionExamEvidence.basis,meaning:decisionExamEvidence.tagMeaning};
report.legalGrounding={reviewDate:legalGrounding.reviewDate,sections,statutoryMentions,caseCitations,knownSourceGaps,externalLawRefs:[...externalLawRefs],kinds:colleges.flatMap(c=>c.topics.flatMap(t=>t.sections)).reduce((counts,s)=>{counts[s.foundation.kind]=(counts[s.foundation.kind]||0)+1;return counts;},{}),checks:['Iedere sectie heeft een zichtbare wettelijke, jurisprudentiële of collegegrondslag.','Vpb-artikelnummers en genoemde leden zijn gecontroleerd in uitleg, grondslag, vragen, antwoorden en onthoudpunten.','BNB-verwijzingen bij leningen zijn teruggevonden op de genoemde oorspronkelijke bronpagina’s.'],limits:['Een bestaand artikelnummer en wetslid bewijst niet op zichzelf de juistheid van de juridische toepassing.','Volledige arresten, Wet IB-, AWR-, BW-, BVDB-, VWEU- en Besluit FE-teksten zijn niet als afzonderlijke bronstukken aangeleverd; verwijzingen daarheen blijven gekoppeld aan de slides of oorspronkelijke uitwerking.']};
report.legalGrounding.additionalHighlights={selections:highlightIds.size,quotes:legalHighlights.selections.reduce((n,ref)=>n+ref.quotes.length,0),lawVersion:legalHighlights.lawVersion};
fs.writeFileSync(path.join(root,'docs/summary-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summaryColleges:colleges.length,sections,answerSteps,workedExamples,recallPoints,examQuestions,examTopicGuides,articles:usedArticles.size,verifiedQuotes:quotes,examTopics:coverage.length}));
