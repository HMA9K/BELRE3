import {sourceButtons} from './sources.mjs?v=belre3-20261001-pdf-actions1';
import {mountMcCase} from './mc-case.mjs';
import {summaryUrl} from '../../js/course-links.mjs';
import {resultHtml,score} from './mc-results.mjs';
import {createCourseProgress} from './course-progress.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prose=s=>'<p class="source-prose">'+esc(s)+'</p>';
const categoryNames={syllabus:'Syllabusvragen',tentamen:'MC-tentamenvarianten',kort:'Korte vragen'};
const difficultyNames={basis:'Basis',toepassing:'Toepassing',tentamenniveau:'Tentamenniveau'};
const selectionHelpHtml=`<details class="belre-selection-help">
    <summary>Hoe werkt deze indeling en wat oefen je ermee?</summary>
    <div class="belre-selection-guide"><p class="belre-selection-intro">MC betekent meerkeuze: je kiest een antwoord en krijgt direct uitleg. Combineer de filters om gericht te oefenen.</p>
      <h3>Drie vraagtypen binnen MC</h3>
      <dl class="belre-question-types">
        <div><dt>Korte vragen</dt><dd>Controleer één begrip, voorwaarde, onderscheid, beslisstap of korte berekening. Gebruik de toelichting bij fouten om gericht te herhalen.</dd></div>
        <div><dt>Syllabusvragen</dt><dd>Oefen begrip en toepassing van de syllabus- en collegestof, met aandacht voor de redenering achter het antwoord.</dd></div>
        <div><dt>MC-tentamenvarianten</dt><dd>Meerkeuzeversies van open brontentamenvragen. Oefen regels, berekeningen en conclusies. Werk ook open vragen uit om zelf te leren formuleren en onderbouwen.</dd></div>
      </dl>
      <p class="belre-selection-key"><strong>Kort betekent afgebakend, niet automatisch gemakkelijk.</strong> Controleer ook of je kunt uitleggen waarom het antwoord klopt.</p>
      <h3>Moeilijkheid staat los van het vraagtype</h3>
      <dl class="belre-question-levels">
        <div><dt>Basis</dt><dd>Begrippen en hoofdregels herkennen; voorwaarden benoemen.</dd></div>
        <div><dt>Toepassing</dt><dd>Een regel toepassen op feiten, een beslisstap zetten of een berekening maken.</dd></div>
        <div><dt>Tentamenniveau</dt><dd>Voorwaarden, uitzonderingen of meerdere stappen beoordelen in een tentamencasus.</dd></div>
      </dl>
      <h3>Van hoorcollege naar onderwerp</h3>
      <p>Kies één of meer hoorcolleges; bij Onderwerp verschijnen de bijbehorende onderwerpen. Binnen een filtergroep worden vinkjes samengenomen. De vier filtergroepen gelden tegelijk; geen vinkjes betekent alles in die groep.</p>
      <p>Bijvoorbeeld: <strong>Korte vragen + Toepassing + Hoorcollege 3</strong> geeft alleen korte toepassingsvragen uit dat college. Een onderwerp beperkt de selectie verder. Het getoonde aantal volgt je selectie.</p>
      <ul class="belre-selection-actions-guide">
        <li><strong>Selectie oefenen:</strong> alle vragen binnen je filters.</li>
        <li><strong>Oefen college:</strong> alle onderwerpen van dat college. Vraagtype en niveau blijven gelden; het onderwerpfilter vervalt voor deze reeks.</li>
        <li><strong>Start bij een onderwerp:</strong> alleen dat onderwerp, met je gekozen vraagtype en niveau.</li>
        <li><strong>Gemengde toetsreeks:</strong> 20, 40 of alle geselecteerde vragen in willekeurige volgorde, met directe feedback en zonder tijdslimiet. Een kleinere selectie wordt volledig gebruikt.</li>
      </ul>
      <h3>Twee manieren om ermee te oefenen</h3>
      <p><strong>Snel herhalen:</strong> kies korte vragen binnen één onderwerp. Bedenk eerst zelf het antwoord en gebruik fouten om gericht te herhalen.</p>
      <p><strong>Open tentamenvragen oefenen:</strong> begin met syllabusvragen, oefen daarna MC-tentamenvarianten en schrijf zelf een uitwerking in de <a href="#dashboard">tentamenomgeving</a>. Een gemengde reeks oefent het kiezen van de aanpak zonder vaste onderwerpvolgorde.</p>
    </div>
  </details>`;
const button=(label,action,extra='')=>'<button class="btn'+(['start','topic','college','check','confirm-finish'].includes(action)?' primary':'')+'" type="button" data-mc="'+action+'" '+extra+'>'+label+'</button>';
export function initPractice(bank,sources,exams,courseMap) {
  const Core=window.BelreMc,KEY='belre3-mc-v1',host=document.getElementById('mc-app'),home=document.getElementById('start');
  const byId=new Map([...bank.questions,...(bank.retiredQuestions||[])].map(q=>[q.id,q])),topics=new Map(bank.topicOrder.map(t=>[t.id,t])),colleges=Core.colleges(bank);
  const courseProgress=createCourseProgress(host,bank,exams,courseMap,{mcCore:Core,examEngine:window.CafaExamEngine});
  let state={version:1,runs:[],filters:{category:'',difficulty:'',college:'',topic:''}},corrupt=false,saved=true;
  let resumeHidden=false,testCount=20;
  try{resumeHidden=localStorage.getItem('belre3-mc-resume-hidden')==='true';}catch{}
  try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(!Core.validateStore(parsed))throw new Error();state=parsed;}}
  catch{corrupt=true;saved=false;}
  function persist(){
    if(corrupt)return false;
    try{localStorage.setItem(KEY,JSON.stringify(state));saved=true;window.dispatchEvent(new Event('belre:question-progress'));return true;}
    catch{saved=false;const note=host.querySelector('[data-mc-save]');if(note)note.textContent='Opslaan lukt niet. Houd deze pagina open en download een back-up.';return false;}
  }
  const compatible=run=>Core.canResume(bank,run);
  function note(){return '<p class="small" data-mc-save role="status">'+(corrupt?'Eerdere MC-voortgang kon niet worden gelezen en is niet overschreven. Starten is geblokkeerd.':saved?'Je antwoorden blijven in deze browser bewaard.':'Opslaan lukt niet. Houd deze pagina open en download een back-up.')+'</p>';}
  function filters(){return Object.fromEntries(['category','difficulty','college','topic'].map(key=>[key,Core.filterValues(state.filters?.[key])]));}
  function stats(run){const answers=Object.values(run.answers);return {answered:answers.filter(a=>a.optionId).length,checked:answers.filter(a=>a.first).length,good:answers.filter(a=>a.first?.correct).length};}
  function title(run){
    const f=run.filters||{},labels=(key,lookup)=>Core.filterValues(f[key]).map(value=>lookup(value)).filter(Boolean);
    const categories=labels('category',value=>categoryNames[value]),levels=labels('difficulty',value=>difficultyNames[value]);
    const subject=labels('topic',value=>topics.get(value)?.title),college=labels('college',value=>colleges.find(c=>c.id===value)?.label);
    return [run.mode==='test'?'Gemengde toetsreeks':'',categories.join(' + ')||'Alle MC-vragen',subject.length>2?subject.length+' onderwerpen':subject.join(' + ')||college.join(' + '),levels.join(' + ')].filter(Boolean).join(' · ');
  }
  function frequency(topic){
    const item=courseMap?.topics.find(t=>t.id===topic);if(!item)return '';
    return '<details class="belre-frequency"><summary>In '+item.examIds.length+' van '+courseMap.examIds.length+' BELRE3-tentamens</summary><p>Aantal verschillende brontentamens waarin dit onderwerp in een opgave voorkomt. MC-varianten en de aanvullende Tax 2-selectie tellen niet mee. Dit is geen voorspelling voor je volgende tentamen.</p>'+
      (item.examIds.length?'<ul>'+item.examIds.map(id=>{const exam=exams.find(e=>e.id===id);return '<li><a href="#welkom/'+id+'">'+esc(exam.date.split('-').reverse().join('-'))+'</a></li>';}).join('')+'</ul>':'<p>Geen opgave over dit onderwerp aangetroffen in deze bronselectie. Het onderwerp blijft wel onderdeel van de leerstof.</p>')+'</details>';
  }
  function selector(name,label,values,current){
    const entries=Array.isArray(values)?values:Object.entries(values);
    return '<fieldset class="belre-filter-group'+(name==='college'||name==='topic'?' belre-filter-wide':'')+'"><legend>'+label+' <span>'+(current.length?current.length+' gekozen':'alles')+'</span></legend>'+(current.length?'<button type="button" class="belre-filter-reset" data-mc-reset="'+name+'">Alles</button>':'')+'<div class="belre-checkboxes'+(name==='topic'?' belre-topic-choices':'')+'">'+entries.map(([value,text,detail])=>'<label class="belre-filter-choice"><input type="checkbox" data-mc-filter="'+name+'" value="'+esc(value)+'"'+(current.includes(value)?' checked':'')+'><span>'+esc(text)+(detail?'<small>'+esc(detail)+'</small>':'')+'</span></label>').join('')+'</div></fieldset>';
  }
  function menu() {
    const f=filters(),selected=Core.select(bank,f),live=state.runs.filter(r=>r.status==='active'&&compatible(r));
    const shown=colleges.filter(c=>!f.college.length||f.college.includes(c.id));
    const availableTopics=Core.availableTopics(bank,f);
    const collegeTitles={'1-2':'Belastingplicht en winst','3':'Leningen en renteaftrek','4-5':'Deelnemingen en reorganisaties','6-7':'Fiscale eenheid','8':'Internationaal en verrekenprijzen','9':'Fiscale strategie en toezicht'};
    host.innerHTML='<div class="home-head"><h1>MC-oefenvragen</h1><p class="home-sub">'+bank.questions.length+' vragen · '+colleges.length+' collegegroepen · '+bank.topicOrder.length+' onderwerpen</p></div><div class="home-body">'+
      '<section class="belre-selection" aria-labelledby="belre-selection-heading"><div class="belre-selection-head"><h2 id="belre-selection-heading">Kies je oefenvragen</h2><p>Meerdere vinkjes mogelijk. Geen vinkjes in een groep = alles.</p></div><div class="belre-filters">'+
      selector('category','Vraagtype',{...categoryNames,tentamen:'Tentamenvarianten'},f.category)+selector('difficulty','Moeilijkheid',difficultyNames,f.difficulty)+
      selector('college','Hoorcollege',colleges.map(c=>[c.id,c.label.replace('Hoorcollege ','HC ').replace(' en ',' & ')]),f.college)+
      selector('topic','Onderwerp',availableTopics.map(t=>[t.id,t.title,shown.length>1?'HC '+t.college.replace(' en ',' & '):'']),f.topic)+'</div>'+
      '<div class="belre-selection-actions"><p class="belre-selection-count" role="status"><strong>'+selected.length+'</strong> vragen binnen je selectie</p>'+button('Selectie oefenen','start',(!selected.length||corrupt?'disabled':''))+'</div><div class="belre-test-selection"><fieldset><legend>Gemengde toetsreeks</legend><div>'+[[20,'20 vragen'],[40,'40 vragen'],[0,'Alles']].map(([value,label])=>'<label><input type="radio" name="mc-test-count" data-test-count value="'+value+'"'+(testCount===value?' checked':'')+'>'+label+'</label>').join('')+'</div></fieldset>'+button('Toetsreeks starten','start-test',(!selected.length||corrupt?'disabled':''))+'<p>Willekeurige volgorde, met direct de uitslag en uitleg.</p></div>'+selectionHelpHtml+
      '</section>'+
      (live.length?'<section class="belre-resume"><div class="belre-resume-head"><h2>Verder oefenen</h2>'+button(resumeHidden?'Tonen':'Verbergen','toggle-resume','aria-controls="mc-resume-links" aria-expanded="'+!resumeHidden+'"')+'</div><div class="belre-resume-links" id="mc-resume-links"'+(resumeHidden?' hidden':'')+'>'+live.slice(-4).reverse().map(r=>'<a class="btn" href="#mc/'+r.id+'/'+r.index+'">'+esc(title(r))+' · '+stats(r).answered+' / '+r.ids.length+' beantwoord</a>').join('')+'</div></section>':'')+
      '<h2 class="practice-section-title">Oefenen per hoorcollege</h2><div class="topic-grid belre-college-grid">'+shown.filter(c=>!f.topic.length||c.topics.some(t=>f.topic.includes(t.id))).map(c=>{
        const n=Core.select(bank,{...f,college:c.id,topic:''}).length;
        return '<article class="topic-card"><div class="topic-top"><span class="topic-n belre-college-number">'+esc(c.id.replace('-', '–'))+'</span><h2>'+esc(collegeTitles[c.id]||c.label)+'</h2></div><p class="topic-description">'+esc(c.label)+' · '+c.topics.length+(c.topics.length===1?' onderwerp':' onderwerpen')+'</p><div class="topic-footer"><p class="topic-progress">'+n+' vragen</p>'+button('Oefen college','college','data-college="'+c.id+'" '+(!n||corrupt?'disabled':''))+'</div></article>';
      }).join('')+'</div><section class="practice-topics"><h2>Oefenen per onderwerp</h2><p>Kies een onderwerp binnen je hoorcollege.</p><div class="topic-groups">'+shown.map(c=>{
        const list=c.topics.filter(t=>!f.topic.length||f.topic.includes(t.id));if(!list.length)return '';
        return '<section class="topic-group" aria-labelledby="college-'+c.id+'"><header class="topic-group-head"><h3 id="college-'+c.id+'">'+esc(c.label)+'</h3><p>'+esc(collegeTitles[c.id]||'')+'</p></header><div class="topic-grid">'+list.map(t=>{
          const n=Core.select(bank,{...f,college:c.id,topic:t.id}).length;
          return '<article class="topic-card"><div class="topic-top"><span class="topic-n">'+t.order+'</span><h4>'+esc(t.title)+'</h4></div>'+frequency(t.id)+'<div class="topic-footer"><p class="topic-progress">'+n+(n===1?' vraag':' vragen')+'</p>'+button('Start','topic','data-topic="'+t.id+'" data-college="'+c.id+'" '+(!n||corrupt?'disabled':''))+'</div><a class="belre-theory-link" href="'+summaryUrl(t.id)+'">Leerstof bij dit onderwerp</a></article>';
        }).join('')+'</div></section>';
      }).join('')+'</div></section><nav class="belre-home-links" aria-label="Verder in BELRE3"><a href="../index.html">Home</a><a href="#voortgang/onderwerpen">Voortgang per onderwerp</a><a href="#voortgang">MC-resultaten</a><a href="#bronnen">Bronnen</a></nav>'+note()+'</div>';
  }
  function feedback(q,answer){
    if(!answer?.checked)return '';
    const option=q.options.find(o=>o.id===answer.optionId);
    return '<section class="belre-feedback" aria-label="Antwoord en uitleg"><h2>'+(answer.correct?'Goed beantwoord':'Dit antwoord klopt niet')+'</h2>'+
      prose(option?.explanation||'')+'<h3>Uitwerking</h3><ol>'+q.explanationSteps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
      '<h3>Herkenning</h3>'+prose(q.recognition)+'<h3>Valkuil</h3>'+prose(q.pitfall)+
      '<details><summary>Toelichting per antwoordmogelijkheid</summary>'+q.options.map((o,i)=>'<h3>'+String.fromCharCode(65+i)+(o.id===q.correctOptionId?' · Juiste antwoord':'')+'</h3>'+prose(o.explanation)).join('')+'</details>'+
      (answer.ownText?.trim()?'<label class="belre-self-review">Vergelijk je eigen uitwerking met het model<select data-self-review><option value="">Nog niet zelf beoordeeld</option>'+Object.entries({good:'Goed',partial:'Gedeeltelijk goed',again:'Nog oefenen'}).map(([value,text])=>'<option value="'+value+'"'+(answer.selfReview===value?' selected':'')+'>'+text+'</option>').join('')+'</select></label>':'')+
      '<details><summary>Bronnen en wetsverwijzingen</summary><p>Oefenbasis: '+esc(q.lawVersion)+'. Casusjaren blijven behouden.</p>'+
      (q.legalReferences?.length?'<ul>'+q.legalReferences.map(r=>'<li>'+(typeof r==='string'?esc(r):esc(r.law)+' · artikel '+esc(r.article)+(r.paragraph?' · lid '+esc(r.paragraph):'')+(r.subsection?' · onderdeel '+esc(r.subsection):''))+'</li>').join('')+'</ul>':'')+
      '<div class="belre-source-actions">'+sourceButtons(q.sourceRefs,sources)+'</div></details></section>';
  }
  function learningHelp(q){
    return '<details class="belre-learning-help"><summary>Leerhulp en bronnen</summary><p>'+esc(q.recognition)+'</p><p><a class="btn" href="'+summaryUrl(q.topicId)+'">Bijbehorende samenvatting</a><a class="btn" href="/index.html#pagina/art">Wet Vpb 1969</a></p><p>Oefenbasis: '+esc(q.lawVersion)+'.</p><div class="belre-source-actions">'+sourceButtons(q.sourceRefs,sources)+'</div></details>';
  }
  function runner(run,index) {
    if(!run||!compatible(run)){host.innerHTML='<div class="exam-paper"><h1>Deze oefenreeks is niet beschikbaar</h1><p>De reeks hoort bij een eerdere vragenbank of ontbreekt. Opgeslagen antwoorden zijn behouden.</p><a class="btn" href="#voortgang">Voortgang bekijken</a></div>';return;}
    const i=Math.max(0,Math.min(run.ids.length-1,Number(index)||0));run.index=i;
    const q=byId.get(run.ids[i]),answer=run.answers[q.id]||{};
    if(run.status==='active'&&answer.optionId&&!answer.checked){Core.check(run,q);persist();}
    const locked=run.status==='completed'||answer.checked;
    const caseButton=q.caseText?'<button type="button" class="btn practice-action" data-practice-case aria-controls="mc-case-panel" aria-expanded="true">Casus</button>':'';
    host.innerHTML='<h1>'+esc(title(run))+'</h1><article id="mc/'+run.id+'/'+i+'" class="frame question practice-question-page belre-mc-question" data-question-id="'+q.id+'"><div class="practice-question-frame"><div class="exam-case-layout practice-case-layout'+(!q.caseText?' is-case-hidden':'')+'">'+
      (q.caseText?'<aside id="mc-case-panel" class="exam-case-panel practice-case-panel" aria-labelledby="mc-case-title"><h2 id="mc-case-title">Casus · '+esc(q.title)+'</h2>'+prose(q.caseText)+'</aside><div class="exam-case-resizer" tabindex="0" role="separator" aria-label="Breedte van de casus links aanpassen" aria-controls="mc-case-panel" aria-orientation="vertical" aria-valuemin="25" aria-valuemax="60" aria-valuenow="33"><span aria-hidden="true">⋮</span></div>':'')+
      '<div class="qbody"><header class="question-header"><div class="qidentity"><span>VRAAG</span><span class="qnum">'+(i+1)+'</span>'+caseButton+'</div><span class="question-count">VRAAG <strong>'+(i+1)+'</strong> VAN <strong>'+run.ids.length+'</strong></span></header>'+
      '<p class="belre-question-meta">'+esc(categoryNames[q.category])+' · '+esc(difficultyNames[q.difficulty])+'</p><h2 class="qtitle">'+esc(q.title)+'</h2><div class="task" id="mc-prompt">'+prose(q.prompt)+'</div>'+
      (run.revision!==bank.contentRevision?'<p class="small">Je hervat je eerdere oefenreeks. Nieuwe reeksen gebruiken de bijgewerkte selectie.</p>':'')+
      learningHelp(q)+'<details class="belre-own-work"'+(answer.ownText?' open':'')+'><summary>Zelf uitwerken</summary><label for="mc-own-text">Schrijf eerst je redenering of berekening. Kies daarna het MC-antwoord en vergelijk je uitwerking met het model.</label><textarea id="mc-own-text" data-mc-own rows="6" maxlength="30000"'+(run.status==='completed'?' readonly':'')+'>'+esc(answer.ownText||'')+'</textarea><p class="small">Je eigen tekst blijft bewaard bij deze vraag en oefenreeks. De MC-keuze wordt automatisch nagekeken; je eigen tekst beoordeel je zelf.</p></details>'+
      '<fieldset class="options belre-options" aria-describedby="mc-prompt"><legend class="instruction">Kies het juiste antwoord · direct nakijken</legend>'+q.options.map((o,n)=>'<label class="option '+(answer.checked&&o.id===q.correctOptionId?'is-correct':answer.checked&&o.id===answer.optionId?'is-wrong':'')+'"><input class="answer-radio sr-only" type="radio" name="mc-choice" value="'+esc(o.id)+'"'+(answer.optionId===o.id?' checked':'')+(locked?' disabled':'')+'><span class="option-header"><span class="bubble">'+String.fromCharCode(65+n)+'</span><span class="select-hint">'+(answer.optionId===o.id?'Gekozen':'Tik om te kiezen')+'</span></span><span class="option-content">'+esc(o.text)+'</span></label>').join('')+'</fieldset>'+
      '<div class="actions belre-check-actions">'+(run.status==='active'?(answer.checked?button('Opnieuw proberen','retry'):'<span class="small">Je keuze wordt meteen nagekeken.</span>'):'<span class="notice">Afgeronde poging. De antwoorden blijven bewaard.</span>')+'<a class="btn" href="#resultaten/'+run.id+'">Resultaten</a></div><p class="sr-only" role="status">'+(answer.checked?(answer.correct?'Goed beantwoord.':'Dit antwoord klopt niet.'):'')+'</p>'+feedback(q,answer)+note()+
      '</div></div></div><nav class="question-nav" aria-label="MC-vraagnavigatie"><div class="nav-left">'+button('Vorige','previous',i===0?'disabled':'')+button('Volgende','next',i===run.ids.length-1?'disabled':'')+'</div><div class="nav-right"><span class="auto-score-inline">Goed: '+stats(run).good+'/'+stats(run).checked+'</span>'+button('Overzicht','overview')+button(run.marked[q.id]?'Gemarkeerd':'Markeren','mark','aria-pressed="'+!!run.marked[q.id]+'"')+(run.status==='active'?button('Oefenreeks afronden','finish'):'<a class="btn" href="#voortgang">Voortgang</a>')+caseButton+'</div></nav></article>';
    mountMcCase(host.querySelector('.belre-mc-question'));
    if(run.status==='completed')host.querySelector('[data-self-review]')?.setAttribute('disabled','');
    document.title='BELRE3 / MC / '+q.title;
  }
  function progress(){
    host.innerHTML='<h1>MC-voortgang</h1><div class="exam-paper"><p>De eerste gecontroleerde keuze bepaalt je MC-score. Opnieuw proberen verandert die eerste score niet.</p>'+
      (state.runs.length?'<div class="exam-table-wrap"><table class="exam-table"><thead><tr><th>Oefenreeks</th><th>Status</th><th>Beantwoord</th><th>Eerste score</th><th>Actie</th></tr></thead><tbody>'+state.runs.slice().reverse().map(r=>{const s=stats(r);return '<tr><td>'+esc(title(r))+'</td><td>'+(r.status==='completed'?'Afgerond':'Lopend')+'</td><td>'+s.answered+' / '+r.ids.length+'</td><td>'+s.good+' / '+s.checked+' nagekeken</td><td>'+(compatible(r)?'<a class="btn" href="#resultaten/'+r.id+'">Resultaten</a>':'Eerdere vragenbank')+'</td></tr>';}).join('')+'</tbody></table></div>':'<p>Je hebt nog geen oefenreeks gestart.</p>')+
      '<div class="actions"><a class="btn" href="#voortgang/onderwerpen">Voortgang per onderwerp</a>'+button('MC-back-up downloaden','backup')+'<a class="btn primary" href="#oefenen">Nieuwe oefenreeks</a></div>'+note()+'</div>';
  }
  function sourceList(){
    host.innerHTML='<h1>Bronnen</h1><div class="exam-paper"><p>'+Object.keys(sources).length+' documenten. Kies een bron om te lezen of te arceren.</p><div class="belre-source-list">'+Object.values(sources).sort((a,b)=>a.title.localeCompare(b.title,'nl')).map(s=>'<p>'+sourceButtons([{sourceId:s.id,pdfPages:[1]}],sources,'Open')+'</p>').join('')+'</div></div>';
  }
  function results(id,filter='all'){
    const run=state.runs.find(r=>r.id===id);if(!run||!compatible(run)){host.innerHTML='<h1>Oefenreeks niet beschikbaar</h1><a href="#voortgang">Alle oefenreeksen</a>';return;}
    host.innerHTML=resultHtml(run,byId,bank.topicOrder,colleges,title(run),filter);
    host.querySelector('[data-result-filter]').value=filter;
  }
  function route(){
    document.getElementById('mc-dialog')?.remove();
    const parts=location.hash.slice(1).split('/'),kind=parts[0]||'start';
    document.body.classList.toggle('practice-surface',kind==='mc');
    document.body.classList.toggle('belre-sources-page',kind==='bronnen');
    host.classList.toggle('belre-mc-menu',kind==='oefenen');
    host.classList.toggle('frame',kind!=='mc');
    home.hidden=kind!=='start';host.hidden=!['oefenen','mc','voortgang','bronnen','resultaten'].includes(kind);
    if(kind==='start'){
      home.innerHTML='<div class="home-body belre-home"><h1>BELRE3 · Oefenen en tentamens</h1><p>Vennootschapsbelasting · oefenbasis 2026</p><div class="topic-grid">'+
        '<article class="topic-card"><h2>MC-oefenvragen</h2><p>'+bank.questions.length+' vragen in '+bank.topicOrder.length+' onderwerpen.</p><p>Syllabusvragen, MC-tentamenvarianten en korte vragen op drie niveaus.</p><a class="btn primary" href="#oefenen">MC-vragen oefenen</a></article>'+
        '<article class="topic-card"><h2>Tentamenomgeving</h2><p>'+exams.filter(e=>!e.supplemental).length+' BELRE3-tentamens en een afzonderlijke Vpb-selectie uit Tax 2.</p><p>Casus, PDF, antwoordeditor, klok en zelfbeoordeling.</p><a class="btn primary" href="#dashboard">Tentamens openen</a></article></div><p class="belre-home-links"><a href="../index.html">Terug naar BELRE3 leeromgeving</a><a href="#voortgang/onderwerpen">Voortgang per onderwerp</a><a href="#voortgang">MC-resultaten</a><a href="#bronnen">Bronnen</a></p></div>';
    }
    if(kind==='oefenen'){
      if(parts[1]==='onderwerp'&&topics.has(parts[2])){
        const college=colleges.find(c=>c.topics.some(t=>t.id===parts[2]));
        state.filters={category:'',difficulty:'',college:college.id,topic:parts[2]};persist();
      }
      menu();
    }
    if(kind==='mc')runner(state.runs.find(r=>r.id===parts[1]),parts[2]);
    if(kind==='voortgang'){if(parts[1]==='onderwerpen')courseProgress.render();else progress();}
    host.setAttribute('aria-label',kind==='voortgang'&&parts[1]==='onderwerpen'?'Centrale studievoortgang':'MC-oefenvragen');
    if(kind==='resultaten')results(parts[1]);
    if(kind==='bronnen')sourceList();
    if(kind!=='mc'&&!(kind==='voortgang'&&parts[1]==='onderwerpen'))document.title='BELRE3 / '+({start:'Oefenen en tentamens',oefenen:'MC-vragen',voortgang:'MC-voortgang',bronnen:'Bronnen',dashboard:'Tentamens'}[kind]||'Tentamenomgeving');
  }
  function current(){const parts=location.hash.slice(1).split('/');return parts[0]==='mc'?state.runs.find(r=>r.id===parts[1]):null;}
  function go(run,index=run.index){run.index=index;persist();location.hash='mc/'+run.id+'/'+index;}
  function start(topic,college,options={}){
    if(corrupt)return;
    const f=options.ids?{}:{...filters(),...(college?{college,topic:''}:{}),...(topic?{topic}:{})},run=Core.createRun(bank,f,'mc-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),options);
    state.runs.push(run);
    if(!persist()){state.runs.pop();menu();return;}
    window.StudyMeasure?.activity('Oefenreeks gestart');go(run,0);
  }
  function dialog(title,html,overview=false,footer=''){
    document.getElementById('mc-dialog')?.remove();
    const opener=document.activeElement,d=document.createElement('dialog');d.id='mc-dialog';d.className=overview?'overview-dialog compact-overview-dialog':'exam-dialog belre-mc-dialog';
    d.setAttribute('aria-labelledby','mc-dialog-title');
    d.innerHTML='<div class="dialog-header exam-modal-head"><h2 id="mc-dialog-title">'+esc(title)+'</h2><button type="button" class="dialog-close" data-mc="close-dialog" aria-label="Venster sluiten">×</button></div><div class="dialog-body exam-modal-body">'+html+'</div>'+footer;
    d.addEventListener('close',()=>{d.remove();if(opener?.isConnected)opener.focus({preventScroll:true});});
    document.body.append(d);d.showModal();
  }
  function overview(run,start=Math.floor(run.index/30)*30){
    const end=Math.min(start+30,run.ids.length),remaining=run.ids.filter(id=>!run.answers[id]?.optionId).length;
    const items=run.ids.slice(start,end).map((id,n)=>{const i=start+n,a=run.answers[id],answered=!!a?.optionId;
      return '<li><button class="compact-overview-item'+(answered?' is-answered':'')+'" type="button" data-mc="jump" data-index="'+i+'"'+(i===run.index?' aria-current="step"':'')+' aria-label="Vraag '+(i+1)+', '+(answered?'beantwoord':'niet beantwoord')+(run.marked[id]?', gemarkeerd':'')+'"><span class="compact-overview-number">'+(i+1)+'</span><span class="compact-overview-state">'+(answered?'Beantwoord':'Niet beantwoord')+'</span>'+(run.marked[id]?'<span class="compact-overview-flag" aria-hidden="true">⚑</span>':'')+'</button></li>';
    }).join('');
    dialog('Overzicht','<div class="compact-overview-body"><div class="compact-overview-remaining">Resterende vragen <strong>'+remaining+'</strong></div><ol class="compact-overview-grid" style="--overview-columns:'+Math.ceil((end-start)/10)+';--overview-rows:'+Math.min(10,end-start)+'">'+items+'</ol></div>',true,
      '<div class="compact-overview-footer"><span class="compact-overview-range">'+(start+1)+'–'+end+'</span>'+(run.ids.length>30?button('Vorige','overview-page','data-start="'+Math.max(0,start-30)+'" '+(start===0?'disabled':''))+button('Volgende','overview-page','data-start="'+end+'" '+(end>=run.ids.length?'disabled':'')):'')+'<button type="button" class="btn primary" data-mc="close-dialog">Sluiten</button></div>');
  }
  window.BelrePractice={current(){const run=current(),question=run&&byId.get(run.ids[run.index]);return question?{question,runId:run.id,index:run.index,title:title(run),topic:topics.get(question.topicId)}:null;}};
  window.CafaPractice={getCompleted(){return state.runs.filter(r=>r.status==='completed').map(r=>{const s=score(r);return {id:r.id,code:'MC-'+r.id,title:title(r),submittedAt:r.submittedAt,answered:s.checked,total:s.total,auto:s.checked,good:s.good,href:'#resultaten/'+r.id};});}};
  host.addEventListener('input',e=>{
    if(!e.target.matches('[data-mc-own]'))return;
    const run=current(),q=run&&byId.get(run.ids[run.index]);if(!q||run.status!=='active')return;
    const answer=run.answers[q.id]||{optionId:''};answer.ownText=e.target.value;run.answers[q.id]=answer;persist();
  });
  host.addEventListener('change',e=>{
    if(e.target.matches('[data-result-filter]')){const id=location.hash.split('/')[1],filter=e.target.value;results(id,filter);host.querySelector('[data-result-filter]').focus();return;}
    if(e.target.matches('[data-self-review]')){const run=current(),q=run&&byId.get(run.ids[run.index]);if(run?.status==='active'&&run.answers[q.id]?.checked){run.answers[q.id].selfReview=e.target.value;persist();}return;}
    if(e.target.matches('[data-test-count]')){testCount=Number(e.target.value);return;}
    if(e.target.matches('[data-mc-filter]')){
      const key=e.target.dataset.mcFilter,value=e.target.value,f=filters();
      f[key]=e.target.checked?[...new Set([...f[key],value])]:f[key].filter(item=>item!==value);
      if(key==='college'){const allowed=new Set(Core.availableTopics(bank,f).map(topic=>topic.id));f.topic=f.topic.filter(id=>allowed.has(id));}
      state.filters=f;persist();menu();host.querySelector('[data-mc-filter="'+key+'"][value="'+value+'"]')?.focus({preventScroll:true});return;
    }
    if(e.target.name==='mc-choice'){
      const run=current(),q=run&&byId.get(run.ids[run.index]);if(!q||run.status!=='active'||run.answers[q.id]?.checked||!q.options.some(o=>o.id===e.target.value))return;
      run.answers[q.id]={...(run.answers[q.id]||{}),optionId:e.target.value};Core.check(run,q);persist();window.StudyMeasure?.activity('Vraag beantwoord');runner(run,run.index);host.querySelector('.belre-feedback')?.scrollIntoView({block:'nearest'});
    }
  });
  document.addEventListener('click',e=>{
    const reset=e.target.closest('[data-mc-reset]');if(reset){state.filters={...filters(),[reset.dataset.mcReset]:[]};persist();menu();host.querySelector('[data-mc-filter="'+reset.dataset.mcReset+'"]')?.focus({preventScroll:true});return;}
    const b=e.target.closest('[data-mc]');if(!b)return;const action=b.dataset.mc;
    if(action==='toggle-resume'){
      resumeHidden=!resumeHidden;host.querySelector('#mc-resume-links').hidden=resumeHidden;
      b.textContent=resumeHidden?'Tonen':'Verbergen';b.setAttribute('aria-expanded',String(!resumeHidden));
      try{localStorage.setItem('belre3-mc-resume-hidden',String(resumeHidden));}catch{}
      return;
    }
    if(action==='close-dialog'){document.getElementById('mc-dialog')?.close();return;}
    if(action==='backup'){
      const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='BELRE3-MC-voortgang.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(['start','topic','college'].includes(action)){start(b.dataset.topic,b.dataset.college);return;}
    if(action==='start-test'){start(null,null,{mode:'test',count:testCount});return;}
    if(action==='repeat-wrong'){const old=state.runs.find(r=>r.id===b.dataset.run);if(old){const ids=old.ids.filter(id=>old.answers[id]?.first&&!old.answers[id].first.correct&&bank.questions.some(q=>q.id===id));if(ids.length)start(null,null,{ids});else dialog('Geen actuele vragen','<p>Deze vragen zijn inmiddels uit de actieve selectie gehaald. Je eerdere antwoorden blijven bewaard.</p>');}return;}
    const run=current();if(!run||!compatible(run))return;
    const q=byId.get(run.ids[run.index]);
    if(action==='previous'||action==='next'){go(run,Math.max(0,Math.min(run.ids.length-1,run.index+(action==='next'?1:-1))));return;}
    if(action==='jump'){document.getElementById('mc-dialog')?.close();go(run,Number(b.dataset.index));return;}
    if(action==='overview'||action==='overview-page'){overview(run,action==='overview-page'?Number(b.dataset.start):undefined);return;}
    if(run.status!=='active')return;
    if(action==='finish'){dialog('Oefenreeks afronden?','<p>'+stats(run).answered+' van '+run.ids.length+' vragen beantwoord. Je antwoorden en eigen uitwerkingen blijven bewaard. Je ziet hierna je resultaten per hoorcollege, onderwerp en vraag.</p>'+button('Afronden en resultaten bekijken','confirm-finish'));return;}
    if(action==='confirm-finish'){
      for(const id of run.ids)if(run.answers[id]?.optionId&&!run.answers[id].checked)Core.check(run,byId.get(id));
      run.status='completed';run.submittedAt=Date.now();persist();document.getElementById('mc-dialog')?.close();location.hash='resultaten/'+run.id;return;
    }
    if(action==='check'){Core.check(run,q);persist();window.StudyMeasure?.activity('Antwoord nagekeken');runner(run,run.index);host.querySelector('.belre-feedback')?.scrollIntoView({block:'nearest'});}
    if(action==='retry'){run.answers[q.id]={...run.answers[q.id],optionId:'',checked:false,correct:false};persist();runner(run,run.index);}
    if(action==='mark'){run.marked[q.id]=!run.marked[q.id];persist();b.textContent=run.marked[q.id]?'Gemarkeerd':'Markeren';b.setAttribute('aria-pressed',String(!!run.marked[q.id]));}
  });
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeunload',e=>{if(!saved){e.preventDefault();e.returnValue='';}});
  window.addEventListener('storage',e=>{
    if(e.key!==KEY||!saved||!e.newValue)return;
    try{const next=JSON.parse(e.newValue);if(!Core.validateStore(next))return;state=next;route();}catch{}
  });
  if(!location.hash)history.replaceState(null,'','#start');route();
}
