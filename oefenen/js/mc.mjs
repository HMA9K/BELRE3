import {sourceButtons} from './sources.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prose=s=>'<p class="source-prose">'+esc(s)+'</p>';
const categoryNames={syllabus:'Syllabusvragen',tentamen:'MC-tentamenvarianten',kort:'Korte vragen'};
const difficultyNames={basis:'Basis',toepassing:'Toepassing',tentamenniveau:'Tentamenniveau'};
const button=(label,action,extra='')=>'<button class="btn'+(['start','topic','check','confirm-finish'].includes(action)?' primary':'')+'" type="button" data-mc="'+action+'" '+extra+'>'+label+'</button>';
export function initPractice(bank,sources,exams) {
  const Core=window.BelreMc,KEY='belre3-mc-v1',host=document.getElementById('mc-app'),home=document.getElementById('start');
  const byId=new Map([...bank.questions,...(bank.retiredQuestions||[])].map(q=>[q.id,q])),topics=new Map(bank.topicOrder.map(t=>[t.id,t]));
  let state={version:1,runs:[],filters:{category:'',difficulty:'',topic:''}},corrupt=false,saved=true;
  try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(!Core.validateStore(parsed))throw new Error();state=parsed;}}
  catch{corrupt=true;saved=false;}
  function persist(){
    if(corrupt)return false;
    try{localStorage.setItem(KEY,JSON.stringify(state));saved=true;return true;}
    catch{saved=false;const note=host.querySelector('[data-mc-save]');if(note)note.textContent='Opslaan lukt niet. Houd deze pagina open en download een back-up.';return false;}
  }
  const compatible=run=>Core.canResume(bank,run);
  function note(){return '<p class="small" data-mc-save role="status">'+(corrupt?'Eerdere MC-voortgang kon niet worden gelezen en is niet overschreven. Starten is geblokkeerd.':saved?'Je antwoorden blijven in deze browser bewaard.':'Opslaan lukt niet. Houd deze pagina open en download een back-up.')+'</p>';}
  function filters(){return {...{category:'',difficulty:'',topic:''},...state.filters};}
  function stats(run){const answers=Object.values(run.answers);return {answered:answers.filter(a=>a.optionId).length,checked:answers.filter(a=>a.first).length,good:answers.filter(a=>a.first?.correct).length};}
  function title(run){return [categoryNames[run.filters.category]||'Alle MC-vragen',run.filters.topic?topics.get(run.filters.topic)?.title:'',difficultyNames[run.filters.difficulty]||''].filter(Boolean).join(' · ');}
  function selector(name,label,values,current){return '<label>'+label+'<select data-mc-filter="'+name+'"><option value="">Alle '+(name==='category'?'vraagtypen':name==='difficulty'?'niveaus':'onderwerpen')+'</option>'+Object.entries(values).map(([value,text])=>'<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';}
  function menu() {
    const f=filters(),selected=Core.select(bank,f);
    const live=state.runs.filter(r=>r.status==='active'&&compatible(r));
    host.innerHTML='<div class="belre-page-heading"><h1>MC-oefenvragen</h1><p>Syllabusvragen, MC-tentamenvarianten en korte vragen. Kies het vraagtype en de moeilijkheid afzonderlijk.</p></div>'+
      (live.length?'<section class="exam-paper"><h2>Verder oefenen</h2>'+live.slice(-4).reverse().map(r=>'<p><a class="btn" href="#mc/'+r.id+'/'+r.index+'">'+esc(title(r))+' hervatten · '+stats(r).answered+' / '+r.ids.length+'</a></p>').join('')+'</section>':'')+
      '<div class="exam-paper"><h2>Stel je oefenreeks samen</h2><div class="belre-filters">'+
      selector('category','Vraagtype',categoryNames,f.category)+selector('difficulty','Moeilijkheid',difficultyNames,f.difficulty)+
      selector('topic','Onderwerp',Object.fromEntries(bank.topicOrder.map(t=>[t.id,t.title])),f.topic)+'</div>'+
      '<p class="belre-selection-count" role="status"><strong>'+selected.length+'</strong> vragen binnen je selectie</p><p class="small">MC-tentamenvarianten zijn bewerkingen van oorspronkelijke open tentamenvragen. Korte vragen oefenen een afgebakende stap of bereiden daarop voor. De volledige open tentamens staan in de <a href="#dashboard">tentamenomgeving</a>.</p>'+
      button('Oefenreeks starten','start',(!selected.length||corrupt?'disabled':''))+note()+'</div>'+
      '<div class="topic-grid belre-topic-grid">'+bank.topicOrder.filter(t=>!f.topic||t.id===f.topic).map(t=>{
        const n=Core.select(bank,{...f,topic:t.id}).length;
        return '<article class="topic-card"><div class="topic-top"><span class="topic-n">'+t.order+'</span><h2>'+esc(t.title)+'</h2></div><p class="topic-description">College '+esc(t.college)+'</p><div class="topic-footer"><p class="topic-progress">'+n+(n===1?' vraag':' vragen')+'</p>'+button('Oefen onderwerp','topic','data-topic="'+t.id+'" '+(!n||corrupt?'disabled':''))+'</div></article>';
      }).join('')+'</div>';
  }
  function feedback(q,answer){
    if(!answer?.checked)return '';
    const option=q.options.find(o=>o.id===answer.optionId);
    return '<section class="belre-feedback" aria-label="Antwoord en uitleg"><h2>'+(answer.correct?'Goed beantwoord':'Dit antwoord klopt niet')+'</h2>'+
      prose(option?.explanation||'')+'<h3>Uitwerking</h3><ol>'+q.explanationSteps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
      '<h3>Herkenning</h3>'+prose(q.recognition)+'<h3>Valkuil</h3>'+prose(q.pitfall)+
      '<details><summary>Toelichting per antwoordmogelijkheid</summary>'+q.options.map((o,i)=>'<h3>'+String.fromCharCode(65+i)+(o.id===q.correctOptionId?' · Juiste antwoord':'')+'</h3>'+prose(o.explanation)).join('')+'</details>'+
      '<details><summary>Bronnen en wetsverwijzingen</summary><p>Oefenbasis: '+esc(q.lawVersion)+'. Casusjaren blijven behouden.</p>'+
      (q.legalReferences?.length?'<ul>'+q.legalReferences.map(r=>'<li>'+esc(r.law)+' · artikel '+esc(r.article)+(r.paragraph?' · lid '+esc(r.paragraph):'')+(r.subsection?' · onderdeel '+esc(r.subsection):'')+'</li>').join('')+'</ul>':'')+
      '<div class="belre-source-actions">'+sourceButtons(q.sourceRefs,sources)+'</div></details></section>';
  }
  function runner(run,index) {
    if(!run||!compatible(run)){host.innerHTML='<div class="exam-paper"><h1>Deze oefenreeks is niet beschikbaar</h1><p>De reeks hoort bij een eerdere vragenbank of ontbreekt. Opgeslagen antwoorden zijn behouden.</p><a class="btn" href="#voortgang">Voortgang bekijken</a></div>';return;}
    const i=Math.max(0,Math.min(run.ids.length-1,Number(index)||0));run.index=i;
    const q=byId.get(run.ids[i]),answer=run.answers[q.id]||{},locked=run.status==='completed'||answer.checked;
    host.innerHTML='<h1>'+esc(title(run))+'</h1>'+(run.revision!==bank.contentRevision?'<p class="small">Je hervat je eerdere oefenreeks. Nieuwe reeksen gebruiken de bijgewerkte selectie.</p>':'')+'<article class="frame question practice-question-page belre-mc-question" data-question-id="'+q.id+'"><div class="question-header"><div><span class="qnum">'+(i+1)+'</span> '+esc(categoryNames[q.category])+' · '+esc(difficultyNames[q.difficulty])+'</div><span>VRAAG '+(i+1)+' VAN '+run.ids.length+'</span></div>'+
      '<div class="belre-mc-layout">'+(q.caseText?'<aside class="exam-case-panel belre-mc-case"><h2>Casus</h2>'+prose(q.caseText)+'</aside>':'')+
      '<div class="qbody"><h2>'+esc(q.title)+'</h2>'+prose(q.prompt)+
      '<fieldset class="options belre-options"><legend class="sr-only">Kies één antwoord</legend>'+q.options.map((o,n)=>'<label class="option '+(answer.checked&&o.id===q.correctOptionId?'is-correct':answer.checked&&o.id===answer.optionId?'is-wrong':'')+'"><input type="radio" name="mc-choice" value="'+esc(o.id)+'"'+(answer.optionId===o.id?' checked':'')+(locked?' disabled':'')+'><span class="belre-option-letter">'+String.fromCharCode(65+n)+'</span><span class="option-content">'+esc(o.text)+'</span></label>').join('')+'</fieldset>'+
      '<div class="actions">'+(run.status==='active'?(answer.checked?button('Opnieuw proberen','retry'):button('Antwoord controleren','check',!answer.optionId?'disabled':'')):'<span class="notice">Afgeronde poging. De antwoorden blijven bewaard.</span>')+'</div>'+feedback(q,answer)+note()+
      '</div></div><footer class="exam-footer"><div class="actions">'+button('‹ Vorige','previous',i===0?'disabled':'')+button('Volgende ›','next',i===run.ids.length-1?'disabled':'')+'</div><div class="actions">'+button('Overzicht','overview')+button(run.marked[q.id]?'Gemarkeerd':'Markeren','mark','aria-pressed="'+!!run.marked[q.id]+'"')+(run.status==='active'?button('Oefenreeks afronden','finish'):'<a class="btn" href="#voortgang">Voortgang</a>')+'</div></footer></article>';
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
  function start(topic){
    if(corrupt)return;
    const f={...filters(),...(topic?{topic}: {})},run=Core.createRun(bank,f,'mc-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));
    state.runs.push(run);
    if(!persist()){state.runs.pop();menu();return;}
    go(run,0);
  }
  function dialog(title,html){
    document.getElementById('mc-dialog')?.remove();
    const d=document.createElement('dialog');d.id='mc-dialog';d.className='exam-dialog belre-mc-dialog';
    d.innerHTML='<div class="exam-modal-head"><h2>'+esc(title)+'</h2>'+button('Sluiten ×','close-dialog')+'</div><div class="exam-modal-body">'+html+'</div>';document.body.append(d);d.showModal();
  }
  host.addEventListener('change',e=>{
    if(e.target.matches('[data-mc-filter]')){state.filters={...filters(),[e.target.dataset.mcFilter]:e.target.value};persist();menu();host.querySelector('[data-mc-filter="'+e.target.dataset.mcFilter+'"]')?.focus();return;}
    if(e.target.name==='mc-choice'){
      const run=current(),q=run&&byId.get(run.ids[run.index]);if(!q||run.status!=='active'||run.answers[q.id]?.checked||!q.options.some(o=>o.id===e.target.value))return;
      run.answers[q.id]={...(run.answers[q.id]||{}),optionId:e.target.value};persist();host.querySelector('[data-mc="check"]').disabled=false;
    }
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-mc]');if(!b)return;const action=b.dataset.mc;
    if(action==='close-dialog'){document.getElementById('mc-dialog')?.close();return;}
    if(action==='backup'){
      const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='BELRE3-MC-voortgang.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(action==='start'||action==='topic'){start(b.dataset.topic);return;}
    const run=current();if(!run||!compatible(run))return;
    const q=byId.get(run.ids[run.index]);
    if(action==='previous'||action==='next'){go(run,Math.max(0,Math.min(run.ids.length-1,run.index+(action==='next'?1:-1))));return;}
    if(action==='jump'){document.getElementById('mc-dialog')?.close();go(run,Number(b.dataset.index));return;}
    if(action==='overview'){
      dialog('Vraagoverzicht','<div class="belre-overview">'+run.ids.map((id,i)=>{const a=run.answers[id];return button(String(i+1)+(run.marked[id]?' ⚑':''),'jump','data-index="'+i+'" aria-label="Vraag '+(i+1)+', '+(a?.checked?'nagekeken':a?'beantwoord':'niet beantwoord')+'" data-state="'+(a?.checked?(a.correct?'good':'bad'):a?'answered':'empty')+'"');}).join('')+'</div>');return;
    }
    if(run.status!=='active')return;
    if(action==='finish'){dialog('Oefenreeks afronden?','<p>'+stats(run).answered+' van '+run.ids.length+' vragen beantwoord. Je gekozen antwoorden worden nagekeken. Daarna blijft deze poging bewaard bij Voortgang.</p>'+button('Afronden en nakijken','confirm-finish'));return;}
    if(action==='confirm-finish'){
      for(const id of run.ids)if(run.answers[id]?.optionId&&!run.answers[id].checked)Core.check(run,byId.get(id));
      run.status='completed';run.submittedAt=Date.now();persist();document.getElementById('mc-dialog')?.close();location.hash='voortgang';return;
    }
    if(action==='check'){Core.check(run,q);persist();runner(run,run.index);host.querySelector('.belre-feedback')?.scrollIntoView({block:'nearest'});}
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
