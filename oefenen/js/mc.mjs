import {sourceButtons} from './sources.mjs?v=belre3-20260930-ui2';
import {mountMcCase} from './mc-case.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prose=s=>'<p class="source-prose">'+esc(s)+'</p>';
const categoryNames={syllabus:'Syllabusvragen',tentamen:'MC-tentamenvarianten',kort:'Korte vragen'};
const difficultyNames={basis:'Basis',toepassing:'Toepassing',tentamenniveau:'Tentamenniveau'};
const button=(label,action,extra='')=>'<button class="btn'+(['start','topic','college','check','confirm-finish'].includes(action)?' primary':'')+'" type="button" data-mc="'+action+'" '+extra+'>'+label+'</button>';
export function initPractice(bank,sources,exams) {
  const Core=window.BelreMc,KEY='belre3-mc-v1',host=document.getElementById('mc-app'),home=document.getElementById('start');
  const byId=new Map([...bank.questions,...(bank.retiredQuestions||[])].map(q=>[q.id,q])),topics=new Map(bank.topicOrder.map(t=>[t.id,t])),colleges=Core.colleges(bank);
  let state={version:1,runs:[],filters:{category:'',difficulty:'',college:'',topic:''}},corrupt=false,saved=true;
  try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(!Core.validateStore(parsed))throw new Error();state=parsed;}}
  catch{corrupt=true;saved=false;}
  function persist(){
    if(corrupt)return false;
    try{localStorage.setItem(KEY,JSON.stringify(state));saved=true;return true;}
    catch{saved=false;const note=host.querySelector('[data-mc-save]');if(note)note.textContent='Opslaan lukt niet. Houd deze pagina open en download een back-up.';return false;}
  }
  const compatible=run=>Core.canResume(bank,run);
  function note(){return '<p class="small" data-mc-save role="status">'+(corrupt?'Eerdere MC-voortgang kon niet worden gelezen en is niet overschreven. Starten is geblokkeerd.':saved?'Je antwoorden blijven in deze browser bewaard.':'Opslaan lukt niet. Houd deze pagina open en download een back-up.')+'</p>';}
  function filters(){return {...{category:'',difficulty:'',college:'',topic:''},...state.filters};}
  function stats(run){const answers=Object.values(run.answers);return {answered:answers.filter(a=>a.optionId).length,checked:answers.filter(a=>a.first).length,good:answers.filter(a=>a.first?.correct).length};}
  function title(run){return [categoryNames[run.filters.category]||'Alle MC-vragen',run.filters.topic?topics.get(run.filters.topic)?.title:colleges.find(c=>c.id===run.filters.college)?.label||'',difficultyNames[run.filters.difficulty]||''].filter(Boolean).join(' · ');}
  function selector(name,label,values,current){return '<label>'+label+'<select data-mc-filter="'+name+'"><option value="">Alle '+(name==='category'?'vraagtypen':name==='difficulty'?'niveaus':name==='college'?'hoorcolleges':'onderwerpen')+'</option>'+(Array.isArray(values)?values:Object.entries(values)).map(([value,text])=>'<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';}
  function menu() {
    const f=filters(),selected=Core.select(bank,f),live=state.runs.filter(r=>r.status==='active'&&compatible(r));
    const shown=colleges.filter(c=>!f.college||c.id===f.college);
    const availableTopics=shown.flatMap(c=>c.topics);
    const collegeTitles={'1-2':'Belastingplicht en winst','3':'Leningen en renteaftrek','4-5':'Deelnemingen en reorganisaties','6-7':'Fiscale eenheid','8':'Internationaal en verrekenprijzen','9':'Fiscale strategie en toezicht'};
    host.innerHTML='<div class="home-head"><h1>MC-oefenvragen</h1><p class="home-sub">'+bank.questions.length+' vragen · '+colleges.length+' collegegroepen · '+bank.topicOrder.length+' onderwerpen</p></div><div class="home-body">'+
      (live.length?'<section class="belre-resume"><h2>Verder oefenen</h2>'+live.slice(-4).reverse().map(r=>'<a class="btn" href="#mc/'+r.id+'/'+r.index+'">'+esc(title(r))+' · '+stats(r).answered+' / '+r.ids.length+' beantwoord</a>').join('')+'</section>':'')+
      '<section class="belre-selection" aria-labelledby="belre-selection-heading"><h2 id="belre-selection-heading">Kies je oefenvragen</h2><div class="belre-filters">'+
      selector('category','Vraagtype',categoryNames,f.category)+selector('difficulty','Moeilijkheid',difficultyNames,f.difficulty)+
      selector('college','Hoorcollege',colleges.map(c=>[c.id,c.label]),f.college)+
      selector('topic','Onderwerp',Object.fromEntries(availableTopics.map(t=>[t.id,t.title])),f.topic)+'</div>'+
      '<div class="belre-selection-actions"><p class="belre-selection-count" role="status"><strong>'+selected.length+'</strong> vragen binnen je selectie</p>'+button('Selectie oefenen','start',(!selected.length||corrupt?'disabled':''))+'</div>'+
      '<details class="belre-selection-help"><summary>Over de vraagtypen en college-indeling</summary><p>MC-tentamenvarianten zijn bewerkingen van open tentamenvragen. Korte vragen oefenen een afgebakende stap of bereiden daarop voor. De volledige open tentamens staan in de <a href="#dashboard">tentamenomgeving</a>.</p><p>De colleges volgen de bronbundels: 1 en 2, 3, 4 en 5, 6 en 7, 8 en 9. Alle onderwerpen horen bij één collegegroep.</p></details></section>'+
      '<h2 class="practice-section-title">Oefenen per hoorcollege</h2><div class="topic-grid belre-college-grid">'+shown.filter(c=>!f.topic||c.topics.some(t=>t.id===f.topic)).map(c=>{
        const n=Core.select(bank,{...f,college:c.id,topic:''}).length;
        return '<article class="topic-card"><div class="topic-top"><span class="topic-n belre-college-number">'+esc(c.id.replace('-', '–'))+'</span><h2>'+esc(collegeTitles[c.id]||c.label)+'</h2></div><p class="topic-description">'+esc(c.label)+' · '+c.topics.length+(c.topics.length===1?' onderwerp':' onderwerpen')+'</p><div class="topic-footer"><p class="topic-progress">'+n+' vragen</p>'+button('Oefen college','college','data-college="'+c.id+'" '+(!n||corrupt?'disabled':''))+'</div></article>';
      }).join('')+'</div><section class="practice-topics"><h2>Oefenen per onderwerp</h2><p>Kies een onderwerp binnen je hoorcollege.</p><div class="topic-groups">'+shown.map(c=>{
        const list=c.topics.filter(t=>!f.topic||t.id===f.topic);if(!list.length)return '';
        return '<section class="topic-group" aria-labelledby="college-'+c.id+'"><header class="topic-group-head"><h3 id="college-'+c.id+'">'+esc(c.label)+'</h3><p>'+esc(collegeTitles[c.id]||'')+'</p></header><div class="topic-grid">'+list.map(t=>{
          const n=Core.select(bank,{...f,college:c.id,topic:t.id}).length;
          return '<article class="topic-card"><div class="topic-top"><span class="topic-n">'+t.order+'</span><h4>'+esc(t.title)+'</h4></div><div class="topic-footer"><p class="topic-progress">'+n+(n===1?' vraag':' vragen')+'</p>'+button('Start','topic','data-topic="'+t.id+'" data-college="'+c.id+'" '+(!n||corrupt?'disabled':''))+'</div></article>';
        }).join('')+'</div></section>';
      }).join('')+'</div></section><nav class="belre-home-links" aria-label="Verder in BELRE3"><a href="../index.html">Home</a><a href="#voortgang">MC-voortgang</a><a href="#bronnen">Bronnen</a></nav>'+note()+'</div>';
  }
  function feedback(q,answer){
    if(!answer?.checked)return '';
    const option=q.options.find(o=>o.id===answer.optionId);
    return '<section class="belre-feedback" aria-label="Antwoord en uitleg"><h2>'+(answer.correct?'Goed beantwoord':'Dit antwoord klopt niet')+'</h2>'+
      prose(option?.explanation||'')+'<h3>Uitwerking</h3><ol>'+q.explanationSteps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
      '<h3>Herkenning</h3>'+prose(q.recognition)+'<h3>Valkuil</h3>'+prose(q.pitfall)+
      '<details><summary>Toelichting per antwoordmogelijkheid</summary>'+q.options.map((o,i)=>'<h3>'+String.fromCharCode(65+i)+(o.id===q.correctOptionId?' · Juiste antwoord':'')+'</h3>'+prose(o.explanation)).join('')+'</details>'+
      '<details><summary>Bronnen en wetsverwijzingen</summary><p>Oefenbasis: '+esc(q.lawVersion)+'. Casusjaren blijven behouden.</p>'+
      (q.legalReferences?.length?'<ul>'+q.legalReferences.map(r=>'<li>'+(typeof r==='string'?esc(r):esc(r.law)+' · artikel '+esc(r.article)+(r.paragraph?' · lid '+esc(r.paragraph):'')+(r.subsection?' · onderdeel '+esc(r.subsection):''))+'</li>').join('')+'</ul>':'')+
      '<div class="belre-source-actions">'+sourceButtons(q.sourceRefs,sources)+'</div></details></section>';
  }
  function runner(run,index) {
    if(!run||!compatible(run)){host.innerHTML='<div class="exam-paper"><h1>Deze oefenreeks is niet beschikbaar</h1><p>De reeks hoort bij een eerdere vragenbank of ontbreekt. Opgeslagen antwoorden zijn behouden.</p><a class="btn" href="#voortgang">Voortgang bekijken</a></div>';return;}
    const i=Math.max(0,Math.min(run.ids.length-1,Number(index)||0));run.index=i;
    const q=byId.get(run.ids[i]),answer=run.answers[q.id]||{},locked=run.status==='completed'||answer.checked;
    const caseButton=q.caseText?'<button type="button" class="btn practice-action" data-practice-case aria-controls="mc-case-panel" aria-expanded="true">Casus</button>':'';
    host.innerHTML='<h1>'+esc(title(run))+'</h1><article id="mc/'+run.id+'/'+i+'" class="frame question practice-question-page belre-mc-question" data-question-id="'+q.id+'"><div class="practice-question-frame"><div class="exam-case-layout practice-case-layout'+(!q.caseText?' is-case-hidden':'')+'">'+
      (q.caseText?'<aside id="mc-case-panel" class="exam-case-panel practice-case-panel" aria-labelledby="mc-case-title"><h2 id="mc-case-title">Casus · '+esc(q.title)+'</h2>'+prose(q.caseText)+'</aside><div class="exam-case-resizer" tabindex="0" role="separator" aria-label="Breedte van de casus links aanpassen" aria-controls="mc-case-panel" aria-orientation="vertical" aria-valuemin="25" aria-valuemax="60" aria-valuenow="33"><span aria-hidden="true">⋮</span></div>':'')+
      '<div class="qbody"><header class="question-header"><div class="qidentity"><span>VRAAG</span><span class="qnum">'+(i+1)+'</span>'+caseButton+'</div><span class="question-count">VRAAG <strong>'+(i+1)+'</strong> VAN <strong>'+run.ids.length+'</strong></span></header>'+
      '<p class="belre-question-meta">'+esc(categoryNames[q.category])+' · '+esc(difficultyNames[q.difficulty])+'</p><h2 class="qtitle">'+esc(q.title)+'</h2><div class="task" id="mc-prompt">'+prose(q.prompt)+'</div>'+
      (run.revision!==bank.contentRevision?'<p class="small">Je hervat je eerdere oefenreeks. Nieuwe reeksen gebruiken de bijgewerkte selectie.</p>':'')+
      '<fieldset class="options belre-options" aria-describedby="mc-prompt"><legend class="instruction">Kies het juiste antwoord</legend>'+q.options.map((o,n)=>'<label class="option '+(answer.checked&&o.id===q.correctOptionId?'is-correct':answer.checked&&o.id===answer.optionId?'is-wrong':'')+'"><input class="answer-radio sr-only" type="radio" name="mc-choice" value="'+esc(o.id)+'"'+(answer.optionId===o.id?' checked':'')+(locked?' disabled':'')+'><span class="option-header"><span class="bubble">'+String.fromCharCode(65+n)+'</span><span class="select-hint">'+(answer.optionId===o.id?'Gekozen':'Tik om te kiezen')+'</span></span><span class="option-content">'+esc(o.text)+'</span></label>').join('')+'</fieldset>'+
      '<div class="actions belre-check-actions">'+(run.status==='active'?(answer.checked?button('Opnieuw proberen','retry'):button('Nakijken','check',!answer.optionId?'disabled':'')):'<span class="notice">Afgeronde poging. De antwoorden blijven bewaard.</span>')+'</div>'+feedback(q,answer)+note()+
      '</div></div></div><nav class="question-nav" aria-label="MC-vraagnavigatie"><div class="nav-left">'+button('Vorige','previous',i===0?'disabled':'')+button('Volgende','next',i===run.ids.length-1?'disabled':'')+'</div><div class="nav-right"><span class="auto-score-inline">Goed: '+stats(run).good+'/'+stats(run).checked+'</span>'+button('Overzicht','overview')+button(run.marked[q.id]?'Gemarkeerd':'Markeren','mark','aria-pressed="'+!!run.marked[q.id]+'"')+(run.status==='active'?button('Oefenreeks afronden','finish'):'<a class="btn" href="#voortgang">Voortgang</a>')+caseButton+'</div></nav></article>';
    mountMcCase(host.querySelector('.belre-mc-question'));
    document.title='BELRE3 / MC / '+q.title;
  }
  function progress(){
    host.innerHTML='<h1>MC-voortgang</h1><div class="exam-paper"><p>De eerste gecontroleerde keuze bepaalt je MC-score. Opnieuw proberen verandert die eerste score niet.</p>'+
      (state.runs.length?'<div class="exam-table-wrap"><table class="exam-table"><thead><tr><th>Oefenreeks</th><th>Status</th><th>Beantwoord</th><th>Eerste score</th><th>Actie</th></tr></thead><tbody>'+state.runs.slice().reverse().map(r=>{const s=stats(r);return '<tr><td>'+esc(title(r))+'</td><td>'+(r.status==='completed'?'Afgerond':'Lopend')+'</td><td>'+s.answered+' / '+r.ids.length+'</td><td>'+s.good+' / '+s.checked+' nagekeken</td><td>'+(compatible(r)?'<a class="btn" href="#mc/'+r.id+'/'+r.index+'">Bekijken</a>':'Eerdere vragenbank')+'</td></tr>';}).join('')+'</tbody></table></div>':'<p>Je hebt nog geen oefenreeks gestart.</p>')+
      '<div class="actions">'+button('MC-back-up downloaden','backup')+'<a class="btn primary" href="#oefenen">Nieuwe oefenreeks</a></div>'+note()+'</div>';
  }
  function sourceList(){
    host.innerHTML='<h1>Bronnen</h1><div class="exam-paper"><p>De geselecteerde 57 bronpaden bevatten 55 unieke PDF-bestanden. De oefenvragen verwijzen naar deze documenten.</p><div class="belre-source-list">'+Object.values(sources).sort((a,b)=>a.title.localeCompare(b.title,'nl')).map(s=>'<p>'+sourceButtons([{sourceId:s.id,pdfPages:[1]}],sources,'Open')+'</p>').join('')+'</div></div>';
  }
  function route(){
    document.getElementById('mc-dialog')?.remove();
    const parts=location.hash.slice(1).split('/'),kind=parts[0]||'start';
    document.body.classList.toggle('practice-surface',kind==='mc');
    host.classList.toggle('belre-mc-menu',kind==='oefenen');
    host.classList.toggle('frame',kind!=='mc');
    home.hidden=kind!=='start';host.hidden=!['oefenen','mc','voortgang','bronnen'].includes(kind);
    if(kind==='start'){
      home.innerHTML='<div class="home-body belre-home"><h1>BELRE3 · Oefenen en tentamens</h1><p>Vennootschapsbelasting · oefenbasis 2026</p><div class="topic-grid">'+
        '<article class="topic-card"><h2>MC-oefenvragen</h2><p>'+bank.questions.length+' vragen in '+bank.topicOrder.length+' onderwerpen.</p><p>Syllabusvragen, MC-tentamenvarianten en korte vragen op drie niveaus.</p><a class="btn primary" href="#oefenen">MC-vragen oefenen</a></article>'+
        '<article class="topic-card"><h2>Tentamenomgeving</h2><p>'+exams.filter(e=>!e.supplemental).length+' BELRE3-tentamens en een afzonderlijke Vpb-selectie uit Tax 2.</p><p>Casus, PDF, antwoordeditor, klok en zelfbeoordeling.</p><a class="btn primary" href="#dashboard">Tentamens openen</a></article></div><p class="belre-home-links"><a href="../index.html">Terug naar BELRE3 leeromgeving</a><a href="#voortgang">MC-voortgang</a><a href="#bronnen">Bronnen</a></p></div>';
    }
    if(kind==='oefenen')menu();
    if(kind==='mc')runner(state.runs.find(r=>r.id===parts[1]),parts[2]);
    if(kind==='voortgang')progress();
    if(kind==='bronnen')sourceList();
    if(kind!=='mc')document.title='BELRE3 / '+({start:'Oefenen en tentamens',oefenen:'MC-vragen',voortgang:'MC-voortgang',bronnen:'Bronnen',dashboard:'Tentamens'}[kind]||'Tentamenomgeving');
  }
  function current(){const parts=location.hash.slice(1).split('/');return parts[0]==='mc'?state.runs.find(r=>r.id===parts[1]):null;}
  function go(run,index=run.index){run.index=index;persist();location.hash='mc/'+run.id+'/'+index;}
  function start(topic,college){
    if(corrupt)return;
    const f={...filters(),...(college?{college,topic:''}:{}),...(topic?{topic}:{})},run=Core.createRun(bank,f,'mc-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));
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
    dialog('Overzicht','<div class="compact-overview-body"><div class="compact-overview-remaining">Resterende vragen <strong>'+remaining+'</strong></div><ol class="compact-overview-grid" style="--overview-columns:'+Math.ceil((end-start)/10)+'">'+items+'</ol></div>',true,
      '<div class="compact-overview-footer"><span class="compact-overview-range">'+(start+1)+'–'+end+'</span>'+(run.ids.length>30?button('Vorige','overview-page','data-start="'+Math.max(0,start-30)+'" '+(start===0?'disabled':''))+button('Volgende','overview-page','data-start="'+end+'" '+(end>=run.ids.length?'disabled':'')):'')+'<button type="button" class="btn primary" data-mc="close-dialog">Sluiten</button></div>');
  }
  window.BelrePractice={current(){const run=current(),question=run&&byId.get(run.ids[run.index]);return question?{question,runId:run.id,index:run.index,title:title(run),topic:topics.get(question.topicId)}:null;}};
  host.addEventListener('change',e=>{
    if(e.target.matches('[data-mc-filter]')){state.filters={...filters(),[e.target.dataset.mcFilter]:e.target.value};if(e.target.dataset.mcFilter==='college'&&state.filters.topic&&!colleges.find(c=>c.id===e.target.value)?.topics.some(t=>t.id===state.filters.topic))state.filters.topic='';persist();menu();host.querySelector('[data-mc-filter="'+e.target.dataset.mcFilter+'"]')?.focus();return;}
    if(e.target.name==='mc-choice'){
      const run=current(),q=run&&byId.get(run.ids[run.index]);if(!q||run.status!=='active'||run.answers[q.id]?.checked||!q.options.some(o=>o.id===e.target.value))return;
      run.answers[q.id]={...(run.answers[q.id]||{}),optionId:e.target.value};persist();host.querySelector('[data-mc="check"]').disabled=false;host.querySelectorAll('.option .select-hint').forEach(n=>n.textContent=n.closest('.option').querySelector('input').checked?'Gekozen':'Tik om te kiezen');window.StudyMeasure?.activity('Vraag beantwoord');
    }
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-mc]');if(!b)return;const action=b.dataset.mc;
    if(action==='close-dialog'){document.getElementById('mc-dialog')?.close();return;}
    if(action==='backup'){
      const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='BELRE3-MC-voortgang.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(['start','topic','college'].includes(action)){start(b.dataset.topic,b.dataset.college);return;}
    const run=current();if(!run||!compatible(run))return;
    const q=byId.get(run.ids[run.index]);
    if(action==='previous'||action==='next'){go(run,Math.max(0,Math.min(run.ids.length-1,run.index+(action==='next'?1:-1))));return;}
    if(action==='jump'){document.getElementById('mc-dialog')?.close();go(run,Number(b.dataset.index));return;}
    if(action==='overview'||action==='overview-page'){overview(run,action==='overview-page'?Number(b.dataset.start):undefined);return;}
    if(run.status!=='active')return;
    if(action==='finish'){dialog('Oefenreeks afronden?','<p>'+stats(run).answered+' van '+run.ids.length+' vragen beantwoord. Je gekozen antwoorden worden nagekeken. Daarna blijft deze poging bewaard bij Voortgang.</p>'+button('Afronden en nakijken','confirm-finish'));return;}
    if(action==='confirm-finish'){
      for(const id of run.ids)if(run.answers[id]?.optionId&&!run.answers[id].checked)Core.check(run,byId.get(id));
      run.status='completed';run.submittedAt=Date.now();persist();document.getElementById('mc-dialog')?.close();location.hash='voortgang';return;
    }
    if(action==='check'){Core.check(run,q);persist();window.StudyMeasure?.activity('Antwoord nagekeken');runner(run,run.index);host.querySelector('.belre-feedback')?.scrollIntoView({block:'nearest'});}
    if(action==='retry'){run.answers[q.id]={first:run.answers[q.id].first,optionId:'',checked:false};persist();runner(run,run.index);}
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
