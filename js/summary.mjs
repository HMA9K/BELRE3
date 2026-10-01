import data from './summary-data.mjs?v=20261001-diagrams6';
import {matchingSections} from './summary-core.mjs';
import {linkSummaryArticles} from './summary-law-popover.mjs?v=20261001-law2';
import {presentationParts} from './summary-presentation.mjs?v=20261001-flow1';
import {decisionTreesHtml,mountDecisionTrees} from './summary-decision.mjs?v=20261001-clarity3';
import {summaryFigureHtml,mountSummaryFigures} from './summary-figure.mjs?v=20261001-diagrams6';
import {readingOutline,mountReadingNavigation} from './summary-reading.mjs?v=20261001-sidebar1';
import {mountDecisionDirectory,decisionRoute} from './summary-decision-directory.mjs?v=20261001-directory1';
import {summaryStudyParts} from './course-links.mjs?v=20261001-progress1';
import {browserProgressStorage,studyStorageKey,readStudyProgress,setStudied,studyStatus} from './study-progress.mjs';
const escape=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const storageKey='belre3-summary-v2',mounted=new WeakSet();
let saved={};try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}')||{};}catch{}
const state={college:saved.college||'c12',topic:saved.topic||'c12-bp',open:new Set(Array.isArray(saved.open)?saved.open:[]),query:''};
const save=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify({...state,open:[...state.open],query:undefined}));}catch{}};
function sourceLink(ref,label){
  const source=data.sources[ref.sourceId];if(!source)return '';
  const pages=ref.pdfPages||[],text=label||source.title.split('/').at(-1).replace(/\.pdf$/i,'');
  return '<a target="_blank" rel="noopener" href="/oefenen/content/'+escape(source.url)+'#page='+pages[0]+'">'+escape(text)+(pages.length?' · p. '+pages.join(', '):'')+'</a>';
}
const sourceList=refs=>'<ul>'+refs.map(ref=>'<li>'+sourceLink(ref)+(ref.locator?' <span>('+escape(ref.locator)+')</span>':'')+'</li>').join('')+'</ul>';
const proseHtml=(paragraphs,className,headings=[])=>'<div class="'+className+'">'+paragraphs.map((text,index)=>(headings[index]?'<h4>'+escape(headings[index])+'</h4>':'')+'<p>'+escape(text)+'</p>').join('')+'</div>';
function current(){
  const college=data.colleges.find(c=>c.id===state.college)||data.colleges[0];
  const topic=college.topics.find(t=>t.id===state.topic)||college.topics[0];
  state.college=college.id;state.topic=topic.id;return {college,topic};
}
function routeSelection(){
  const id=location.hash.match(/^#pagina\/sam\/([a-z0-9-]+)/)?.[1];if(!id)return;
  const topicId=id==='c67-anti'&&!data.colleges.flatMap(c=>c.topics).some(t=>t.id===id)?'c67-voeg':id;
  const college=data.colleges.find(c=>c.id===topicId||c.topics.some(t=>t.id===topicId));
  if(college){state.college=college.id;state.topic=college.topics.find(t=>t.id===topicId)?.id||college.topics[0].id;}
}
function announce(){
  const hash='#pagina/sam/'+state.topic;if(location.hash!==hash)history.pushState(null,'',hash);
  window.dispatchEvent(new Event('belre:navigation'));save();
}
function workedAnswerHtml(worked){
  return '<div class="summary-worked-answer"><h5>'+escape(worked.title)+'</h5><p>'+escape(worked.text)+'</p>'+
    (worked.points?'<dl>'+worked.points.map(point=>'<dt>'+escape(point.label)+'</dt><dd>'+escape(point.text)+'</dd>').join('')+'</dl>':'')+'</div>';
}
function examQuestionHtml(section){
  return '<p class="summary-exam-shape">'+escape(section.examPractice.description)+'</p><div class="summary-example-question"><h5>Voorbeeldvraag</h5><p>'+escape(section.examPractice.question)+'</p></div>';
}
function foundationHtml(section){
  const foundation=section.foundation,labels={'wet':'wet','wet-en-rechtspraak':'wet en rechtspraak','wet-en-college':'wet en college-uitwerking','college':'collegekader'};
  const grouped=new Map();
  for(const ref of foundation.sourceRefs){const pages=grouped.get(ref.sourceId)||new Set();ref.pdfPages.forEach(page=>pages.add(page));grouped.set(ref.sourceId,pages);}
  return '<aside class="summary-foundation" data-foundation-kind="'+escape(foundation.kind)+'" aria-label="Grondslag"><h4>Grondslag: '+labels[foundation.kind]+'</h4><p>'+escape(foundation.text)+'</p><div class="summary-foundation-sources">'+[...grouped].map(([sourceId,pages])=>{const title=data.sources[sourceId].title,label=title.startsWith('Collegeslides/')?'Collegeslides':title.includes('vennootschapsbelasting')?'Wet Vpb 1969':title.includes('Onderwijs')?'Onderwijsprogramma':'Bronuitwerking';return sourceLink({sourceId,pdfPages:[...pages].sort((a,b)=>a-b)},label);}).join(' · ')+'</div></aside>';
}
function examSolutionHtml(section){
  return '<h5 class="summary-example-method-title">Zo beantwoord je de vraag</h5>'+foundationHtml(section)+'<ol class="summary-answer-steps">'+section.examAnswer.steps.map(step=>'<li><strong>'+escape(step.title)+'</strong> '+escape(step.text)+'</li>').join('')+'</ol>'+workedAnswerHtml(section.examAnswer.worked)+'<p class="summary-answer-check"><strong>Controleer je antwoord:</strong> '+escape(section.examTip)+'</p>';
}
function sectionHtml(section,outline){
  const location=outline.number+' '+outline.title;
  const parts=presentationParts(section,document,outline),application=parts.hasExamples||section.figure;
  const phases=[{id:'understand',label:'Begrijpen',title:'Regels en voorwaarden',html:parts.explanationHtml},{id:'foundation',label:'Onderbouwen',title:'Grondslag van de regels',html:foundationHtml(section)}];
  if(application)phases.push({id:'apply',label:'Toepassen',title:'Uitgewerkte voorbeelden'+(section.figure?' en schema':'') ,html:parts.examplesHtml+(section.figure?summaryFigureHtml(section,sourceLink):'')});
  phases.push({id:'practice',label:'Zelf oefenen',title:'Tentamenvraag en antwoord',html:examQuestionHtml(section)+examSolutionHtml(section),exam:true});
  const phaseId=phase=>'learning-'+section.id+'-'+phase.id;
  const goal='<div class="summary-learning-goal"><strong>Waar werk je naartoe?</strong><p>'+escape(section.examTip)+'</p><nav class="summary-learning-route" aria-label="Leesroute van dit subonderwerp">'+phases.map(phase=>'<button type="button" data-reading-order="'+phaseId(phase)+'">'+phase.label+'</button>').join('')+'</nav></div>';
  const stages=phases.map((phase,index)=>'<'+(phase.exam?'aside':'section')+' class="summary-learning-stage'+(phase.exam?' summary-exam-tip':'')+'" data-learning-phase="'+phase.id+'" aria-labelledby="'+phaseId(phase)+'"><h4 id="'+phaseId(phase)+'" tabindex="-1" data-summary-location="'+escape(outline.number+' · '+phase.label)+'" data-reading-section="'+escape(section.id)+'" class="summary-part-title">'+String.fromCharCode(65+index)+'. '+phase.label+': '+phase.title+'</h4>'+phase.html+'</'+(phase.exam?'aside':'section')+'>').join('');
  return '<details class="summary-section" data-summary-section="'+escape(section.id)+'"'+(state.open.has(section.id)?' open':'')+'><summary id="section-'+escape(section.id)+'" data-summary-location="'+escape(location)+'" data-reading-section="'+escape(section.id)+'"><span class="summary-section-number">'+outline.number+'</span><span><small class="summary-section-label">Subonderwerp</small>'+escape(outline.title)+'</span></summary><div class="summary-section-body">'+goal+stages+
    '<h4 class="summary-part-title">'+String.fromCharCode(65+phases.length)+'. '+(section.articles.length?'Welke bepaling gebruik je waarvoor?':'Studiebronnen')+'</h4>'+(section.articles.length?'<p class="summary-law-guide">Gebruik deze bepalingen om de redenering hierboven te onderbouwen. Elk vak noemt eerst de functie van de bepaling. Klik daarna op het artikel om de relevante wettekst te lezen.</p>':'')+'<div class="summary-law-links">'+section.articles.map(article=>'<div><h5>'+escape(article.why)+'</h5><button type="button" class="summary-article-ref" data-summary-law="'+escape(JSON.stringify({article:article.article,law:'Vpb',part:article.label.match(/(?:lid|leden|onderdeel|onderdelen)\s+.*?(?=\s+Wet|$)/i)?.[0]||'',more:[]}))+'" aria-haspopup="dialog" aria-expanded="false">'+escape(article.label)+'</button></div>').join('')+'</div>'+
    '<details class="summary-sources"><summary>Studiebronnen bij uitleg, tentamenroute en voorbeeldantwoord</summary>'+sourceList(section.examAnswer.sourceRefs)+'</details></div></details>';
}
function coverageHtml(topic,outline){
  return '<details class="summary-coverage"><summary>Zo komt dit onderwerp terug in de tentamens</summary><p class="summary-exam-overview">'+escape(topic.examPractice.intro)+'</p><p class="summary-exam-example-note">Hieronder staan oefenvarianten bij de aangeleverde colleges en brontentamens. Bij elke vraag kun je de uitgewerkte aanpak en het antwoord bekijken.</p>'+topic.sections.map((section,index)=>'<article class="summary-exam-example" data-summary-exam-example="'+escape(section.id)+'"><h4 id="exam-'+escape(section.id)+'" tabindex="-1" data-summary-location="'+escape(outline.sections[index].number+' · Tentamenoefening: '+outline.sections[index].title)+'" data-reading-section="'+escape(section.id)+'">'+escape(outline.sections[index].title)+'</h4>'+examQuestionHtml(section)+'<details class="summary-example-solution"'+(index===0?' open':'')+'><summary>Uitgewerkte aanpak en antwoord</summary>'+examSolutionHtml(section)+'</details><details class="summary-sources"><summary>Studiebronnen bij dit voorbeeld</summary>'+sourceList(section.examAnswer.sourceRefs)+'</details></article>').join('')+'</details>';
}
function curriculumHtml(){return '<section class="summary-curriculum"><h4>Controle tegenover de voorgeschreven stof</h4><p>De afbakening volgt het onderwijsprogramma en de beschikbare bronstukken. Historische tentamenfrequenties bepalen niet welke stof mag worden weggelaten. De onderstaande lacunes blijven open; een onderwerpentelling bewijst geen volledige inhoudelijke dekking.</p>'+data.curriculum.rows.map(row=>'<article><h5>'+escape(row.title)+'</h5><p><strong>Voorgeschreven:</strong> '+escape(row.required)+'</p><p><strong>Verwerkt:</strong> '+escape(row.available)+'</p><p><strong>Nog niet controleerbaar:</strong> '+escape(row.gap)+'</p><div>'+row.topicIds.map(id=>'<button type="button" data-summary-jump="'+id+'">'+escape(data.colleges.flatMap(college=>college.topics).find(topic=>topic.id===id).title)+'</button>').join(' · ')+'</div>'+sourceList(row.sourceRefs)+'</article>').join('')+'</section>';}
function scopeHtml(){return '<details class="summary-scope"><summary>Voorgeschreven stof, broncontrole en open lacunes</summary><p>De leeruitleg gebruikt de aangeleverde Wet Vpb van 24 mei 2026, officiële collegeslides, onderwijsprogramma, oorspronkelijke tentamens en uitwerkingen, oefenbundels en de vier voorgeschreven artikelen. Het onderwijsprogramma verdeelt 65–90 van de 100 punten over toepassing. Je moet daarom naast de regel ook de redenering, berekening en conclusie kunnen geven.</p>'+
  '<p>'+sourceLink({sourceId:'pdf-d9a35cf6fcd385b1',pdfPages:[3,4,5,6,7]},'Onderwijsprogramma: leerdoelen, toetsmatrix en stofafbakening')+'</p>'+
  curriculumHtml()+
  '<div class="summary-table-scroll" tabindex="0"><table><caption>Dekking van de 19 onderwerpen uit de tentamenindeling</caption><thead><tr><th scope="col">Onderwerp</th><th scope="col">BELRE3-brontentamens</th></tr></thead><tbody>'+data.coverage.map(r=>'<tr><td><button type="button" data-summary-jump="'+r.summaryTopic+'">'+escape(r.title)+'</button></td><td>'+r.examIds.length+' van '+data.examCount+'</td></tr>').join('')+'</tbody></table></div>'+
  '<p>De aanvullende Tax 2-opgaven tellen niet mee in deze frequenties. Ook onderwerpen zonder historische opgave, zoals innovatiebox, blijven onderdeel van de stof. Artikel 13 lid 17 en artikel 28c zijn volgens het onderwijsprogramma geen zelfstandig te bestuderen onderdelen.</p>'+
  '<p>De voorgeschreven leerboektekst ontbreekt. Daarom is volledige dekking tegenover dat leerboek nog niet vastgesteld. De aangeleverde wetstekst eindigt bij artikel 29i; artikel 35 ontbreekt. Historische beleidsvoorbeelden uit de voorgeschreven artikelen en historische tentamenpercentages worden niet als gecontroleerde regels voor 2026 gebruikt.</p></details>';}
function recallHtml(college){
  return '<section class="summary-recall" aria-labelledby="summary-recall-title"><h3 id="summary-recall-title">'+escape(college.label)+': wat je moet begrijpen, onthouden en toepassen</h3>'+proseHtml(college.recallGuide,'summary-recall-guide',college.recallHeadings)+'<details class="summary-recall-details"><summary>Herhaal de kernregels met wetsartikelen en toepassingen</summary><p class="summary-recall-intro">Gebruik deze regels als herhaaloverzicht bij de leeruitleg. De links openen de inhoudelijke uitleg, concrete vraag, aanpak en het antwoord.</p><ol class="summary-recall-list">'+college.remember.map(point=>'<li data-summary-recall="'+escape(point.id)+'"><h4>'+escape(point.title)+'</h4><p class="summary-recall-rule"><strong>Kernregel:</strong> '+escape(point.rule)+'</p><p class="summary-recall-apply"><strong>Toepassing:</strong> '+escape(point.apply)+'</p><div class="summary-recall-links" aria-label="Bijbehorende uitleg">'+point.sections.map(section=>'<button type="button" data-summary-jump="'+escape(section.topicId)+'" data-summary-open="'+escape(section.id)+'">'+escape(section.title)+'</button>').join('')+'</div><details class="summary-sources"><summary>Studiebronnen bij dit onthoudpunt</summary>'+sourceList(point.sourceRefs)+'</details></li>').join('')+'</ol></details></section>';
}
function studyHtml(topic){
  const subjects=data.coverage.filter(subject=>summaryStudyParts(subject.id).includes(topic.id));
  if(!subjects.length)return '';
  return '<section class="summary-study" aria-label="Voortgang bij deze leerstof"><div><h4>Je studievoortgang</h4><p>Vink af nadat je dit tekstonderdeel hebt bestudeerd. Alleen openen telt niet mee.</p></div>'+subjects.map(subject=>'<label><input type="checkbox" data-summary-study="'+escape(subject.id)+'" data-study-part="'+escape(topic.id)+'"><span>'+escape(subject.title)+'<small data-study-part-status></small></span></label>').join('')+'<a href="/oefenen/#voortgang/onderwerpen">Bekijk alle voortgang per college</a><p role="status" data-summary-study-status></p></section>';
}
function refreshStudyStatus(app,message=''){
  const reading=readStudyProgress(browserProgressStorage);
  for(const checkbox of app.querySelectorAll('[data-summary-study]')){
    const id=checkbox.dataset.summaryStudy,part=checkbox.dataset.studyPart,status=studyStatus(reading.store,id);
    checkbox.checked=reading.store?.topics?.[id]?.[part]?.studied===true;checkbox.disabled=!reading.ok;
    checkbox.closest('label').querySelector('[data-study-part-status]').textContent=status.total>1?status.completed+' / '+status.total+' tekstonderdelen bestudeerd':checkbox.checked?'Bestudeerd':'Nog niet afgevinkt';
  }
  const note=app.querySelector('[data-summary-study-status]');if(note)note.textContent=message||reading.error||'';
}
function render(app,focus){
  const {college,topic}=current();
  const outline=readingOutline(college,topic);
  app.innerHTML='<div class="summary-tools"><div class="summary-search"><label for="summary-search-input">Zoek in alle colleges</label><input type="search" id="summary-search-input" placeholder="Bijvoorbeeld renteaftrek, liquidatieverlies of art. 15ai" value="'+escape(state.query)+'" autocomplete="off" aria-controls="summary-search-results"></div><p class="summary-version">Bronverwijzingen nagekeken: 1 oktober 2026 · Gebruikte wetstekst: 24 mei 2026</p></div><div class="summary-search-results" id="summary-search-results" hidden></div>'+
    '<nav class="summary-colleges" aria-label="Kies een college">'+data.colleges.map(c=>'<button type="button" data-college="'+c.id+'" aria-pressed="'+(c.id===college.id)+'">'+escape(c.label)+'</button>').join('')+'</nav>'+
    '<p class="summary-kicker">'+escape(college.label)+'</p><h2>'+escape(college.title)+'</h2><p class="summary-intro">'+escape(college.intro)+'</p>'+
    '<section class="summary-objectives" aria-labelledby="summary-objectives-title"><h3 id="summary-objectives-title">Na dit college kun je</h3><ul>'+college.objectives.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul></section>'+
    '<nav class="summary-topics" aria-label="Onderwerpen binnen dit college">'+college.topics.map((t,index)=>'<button type="button" data-topic="'+t.id+'" aria-pressed="'+(t.id===topic.id)+'">'+(index+1)+'. '+escape(t.title)+'</button>').join('')+'</nav>'+
    '<section aria-labelledby="summary-topic-title"><h3 id="summary-topic-title" tabindex="-1" data-summary-location="Onderwerp '+escape(outline.title)+'">'+escape(outline.title)+'</h3></section><div class="summary-reading-pin"><div class="summary-reading-context" data-reading-context hidden><span class="summary-context-college">'+escape(college.label.replace('College','HC').replace(' en ','-'))+'</span><span aria-hidden="true">›</span><span class="summary-context-topic">'+escape(topic.title)+'</span><span aria-hidden="true">›</span><strong data-reading-context-title>'+escape(topic.title)+'</strong></div></div>'+proseHtml(topic.lessonIntro,'summary-topic-intro')+
    '<nav class="summary-reading-order" aria-label="Leesvolgorde"><span>Leesvolgorde</span><a href="#summary-explanations" data-reading-order="summary-explanations">1. Uitleg per subonderwerp</a>'+(topic.decisionTrees?.length?'<a href="#summary-routes" data-reading-order="summary-routes">2. Artikelroutes</a>':'')+'<a href="#summary-exam-coverage" data-reading-order="summary-exam-coverage">'+(topic.decisionTrees?.length?'3':'2')+'. Tentamenoefening</a><a href="#summary-recall-title" data-reading-order="summary-recall-title">'+(topic.decisionTrees?.length?'4':'3')+'. Herhaling</a></nav>'+
    '<div class="summary-section-actions" id="summary-explanations"><span>'+topic.sections.length+' subonderwerpen</span><div><button type="button" data-summary-expand="true">Alles uitklappen</button><button type="button" data-summary-expand="false">Alles inklappen</button></div></div>'+topic.sections.map((section,index)=>sectionHtml(section,outline.sections[index])).join('')+decisionTreesHtml(topic,sourceList)+coverageHtml(topic,outline)+
    recallHtml(college)+
    '<div class="summary-bottom"><a href="/oefenen/#oefenen">Oefenen met MC-vragen</a><a href="/oefenen/#welkom/opgaven">Oefenen met open tentamenvragen</a></div>'+scopeHtml()+studyHtml(topic);
  for(const table of app.querySelectorAll('.summary-section-body table')){
    const scroll=document.createElement('div');scroll.className='summary-table-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','Tabel, horizontaal scrollbaar');table.before(scroll);scroll.append(table);
  }
  const coverage=app.querySelector('.summary-coverage>summary');coverage.id='summary-exam-coverage';coverage.dataset.summaryLocation='Tentamenoefening · '+outline.title;
  const routes=app.querySelector('.summary-decision-trees');if(routes){routes.id='summary-routes';const heading=routes.querySelector('h4');heading.id='summary-routes-title';heading.dataset.summaryLocation='Artikelroutes · '+outline.title;heading.tabIndex=-1;routes.setAttribute('aria-labelledby',heading.id);}
  for(const tree of outline.trees){const heading=app.querySelector('[data-summary-tree="'+tree.id.slice('decision-'.length)+'"]>summary');if(heading){heading.id=tree.id;heading.dataset.summaryLocation='Beslisboom '+tree.number+' · '+tree.title;heading.tabIndex=-1;}}
  const recall=app.querySelector('#summary-recall-title');recall.dataset.summaryLocation='Herhaling · '+college.label;recall.tabIndex=-1;
  refreshStudyStatus(app);linkSummaryArticles(app);mountDecisionTrees(app,topic.decisionTrees||[],linkSummaryArticles);mountSummaryFigures(app,topic.sections,linkSummaryArticles);mountReadingNavigation(app,college,topic);searchResults(app);if(focus)app.querySelector(focus)?.focus({preventScroll:true});
}
function searchResults(app){
  const target=app.querySelector('#summary-search-results');target.hidden=!state.query.trim();if(target.hidden){target.replaceChildren();return;}
  const matches=matchingSections(data.colleges,state.query);
  target.innerHTML='<p role="status">'+(matches.length?matches.length+(matches.length===30?' of meer':'')+' onderdelen gevonden.':'Geen onderdeel gevonden. Probeer een kortere zoekterm.')+'</p>'+matches.map(({college,topic,section})=>'<button type="button" data-summary-jump="'+topic.id+'" data-summary-open="'+section.id+'"><small>'+escape(college.label+' · '+topic.title)+'</small>'+escape(section.title)+'</button>').join('');
}
function choose(app,topicId,sectionId,focus){
  const college=data.colleges.find(c=>c.id===topicId||c.topics.some(t=>t.id===topicId));if(!college)return;
  state.college=college.id;state.topic=college.topics.find(t=>t.id===topicId)?.id||college.topics[0].id;
  const chosen=college.topics.find(topic=>topic.id===state.topic);
  if(!sectionId&&!chosen.sections.some(section=>state.open.has(section.id)))state.open.add(chosen.sections[0].id);
  if(sectionId){state.open.add(sectionId);state.query='';}
  render(app,focus);announce();
  if(sectionId){const summary=app.querySelector('[data-summary-section="'+sectionId+'"]>summary');summary?.focus({preventScroll:true});summary?.scrollIntoView({block:'start',behavior:'instant'});}else window.scrollTo({top:0,behavior:'instant'});
}
function mount(){
  const app=document.querySelector('#pg-sam [data-summary-app]');if(!app||mounted.has(app))return;mounted.add(app);routeSelection();if(!saved.topic)state.open.add(current().topic.sections[0].id);render(app);openDecisionRoute(app);
  app.addEventListener('click',event=>{
    const order=event.target.closest('[data-reading-order]');if(order){event.preventDefault();const target=app.querySelector('#'+order.dataset.readingOrder);if(target){target.scrollIntoView({block:'start',behavior:'instant'});target.focus({preventScroll:true});}return;}
    const sectionHeading=event.target.closest('.summary-section>summary');if(sectionHeading&&!sectionHeading.parentElement.open)requestAnimationFrame(()=>sectionHeading.scrollIntoView({block:'start',behavior:'instant'}));
    const college=event.target.closest('[data-college]'),topic=event.target.closest('[data-topic]'),jump=event.target.closest('[data-summary-jump]'),expand=event.target.closest('[data-summary-expand]');
    if(college)choose(app,college.dataset.college,null,'[data-college="'+college.dataset.college+'"]');
    else if(topic)choose(app,topic.dataset.topic,null,'[data-topic="'+topic.dataset.topic+'"]');
    else if(jump){
      choose(app,jump.dataset.summaryJump,jump.dataset.summaryOpen);
      if(jump.dataset.summaryDecision){
        const tree=app.querySelector('[data-summary-tree="'+jump.dataset.summaryDecision+'"]');
        if(tree){tree.open=true;tree.querySelector(':scope>summary')?.focus({preventScroll:true});scrollDecision(tree);}
      }
    }
    else if(expand){const open=expand.dataset.summaryExpand==='true';for(const detail of app.querySelectorAll('[data-summary-section]')){detail.open=open;if(open)state.open.add(detail.dataset.summarySection);else state.open.delete(detail.dataset.summarySection);}save();}
  });
  app.addEventListener('input',event=>{if(event.target.id==='summary-search-input'){state.query=event.target.value;searchResults(app);}});
  app.addEventListener('change',event=>{
    const checkbox=event.target.closest('[data-summary-study]');if(!checkbox)return;
    const checked=checkbox.checked,result=setStudied(browserProgressStorage,checkbox.dataset.summaryStudy,[checkbox.dataset.studyPart],checked);
    refreshStudyStatus(app,result.ok?(checked?'Dit tekstonderdeel is gemarkeerd als bestudeerd.':'Studiemarkering verwijderd.'):result.error);
  });
  app.addEventListener('toggle',event=>{
    const detail=event.target;if(detail.matches('[data-summary-section]')){if(detail.open)state.open.add(detail.dataset.summarySection);else state.open.delete(detail.dataset.summarySection);save();}
  },true);
  window.dispatchEvent(new Event('belre:navigation'));
}
const page=document.getElementById('pg-sam');if(page){new MutationObserver(mount).observe(page,{childList:true,subtree:true});mount();}

function scrollDecision(tree){
  const scale=window.StudyScale?.get()||1;
  const toolbarHeight=document.querySelector('.belre-page-toolbar')?.getBoundingClientRect().height||58;
  const barHeight=document.querySelector('#pg-sam [data-reading-context]')?.getBoundingClientRect().height||46*scale;
  window.scrollTo({top:Math.max(0,scrollY+tree.getBoundingClientRect().top-toolbarHeight-barHeight-18*scale),behavior:'instant'});
}
function openDecisionRoute(app){
  const route=decisionRoute(location.hash);if(!route||route.topicId!==state.topic)return;
  const tree=app.querySelector('[data-summary-tree="'+route.treeId+'"]');if(!tree)return;
  tree.open=true;
  requestAnimationFrame(()=>{tree.querySelector(':scope>summary')?.focus({preventScroll:true});scrollDecision(tree);});
}
mountDecisionDirectory(data.colleges);

function restoreSummaryRoute(){
  if(!location.hash.startsWith('#pagina/sam'))return;
  const app=document.querySelector('#pg-sam [data-summary-app]');
  if(!app||!mounted.has(app))return;
  routeSelection();render(app);save();openDecisionRoute(app);
}
window.addEventListener('popstate',restoreSummaryRoute);
window.addEventListener('hashchange',restoreSummaryRoute);

window.addEventListener('belre:summary-route',restoreSummaryRoute);
window.addEventListener('storage',event=>{if(event.key===null||event.key===studyStorageKey){const app=document.querySelector('#pg-sam [data-summary-app]');if(app)refreshStudyStatus(app);}});
