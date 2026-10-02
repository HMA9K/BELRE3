import {createNavigation} from './assistant-navigation.mjs?v=20261001-analysis2';
import {createAssistantLayout} from './assistant-layout.mjs?v=20261001-align2';
import {createSiteShell} from './site-shell.mjs?v=20261002-menugroups1';
import {readContext} from './assistant-page.mjs?v=20261001-decision-context1';
import {historyFor} from './assistant-context.mjs';
import {renderMarkdown} from './study-assistant-render.mjs';

const KEY='belre3-assistant-conversation-v1';
let saved={};try{saved=JSON.parse(sessionStorage.getItem(KEY)||'{}')||{};}catch{}
let messages=Array.isArray(saved.messages)?saved.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-100):[];
let consent=saved.consent===true,status=null,running=false,controller=null,current=null,contextGeneration=0,requestGeneration=0,refreshTimer;
const nav=createNavigation(()=>{window.BelreAssistant?.refreshLauncher();clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshContext,30);window.dispatchEvent(new Event('belre:navigation'));});
createSiteShell(nav);
const ui=document.createElement('div');ui.id='belre-assistant-ui';
ui.innerHTML=`<button type="button" class="study-assistant-launch" aria-controls="belre-assistant" aria-expanded="false" hidden><span class="belre-assistant-mark" aria-hidden="true">✓</span>BELRE3 Assistent</button>
<div id="belre-assistant-resizer" role="separator" tabindex="0" aria-label="Breedte van de assistent aanpassen" aria-orientation="vertical" aria-valuemin="340" aria-valuemax="720" aria-valuenow="430" hidden></div>
<aside id="belre-assistant" class="study-assistant" aria-labelledby="belre-assistant-title" hidden>
<header class="study-head"><div><p class="study-eyebrow">HULP BIJ BELASTINGRECHT 3</p><h2 id="belre-assistant-title">BELRE3 Assistent</h2></div><button type="button" class="study-icon-button" data-action="close" aria-label="Terug naar de pagina" title="Assistent verbergen">×</button></header>
<div class="study-context"><strong data-context-title>Context wordt geladen</strong><p data-context-question></p><div class="study-context-controls"><label data-question-only hidden>Stand <select data-mode aria-label="Hulpstand"><option value="hint">Eerst een hint</option><option value="review">Antwoord en uitleg</option></select></label><button type="button" class="study-text-button" data-action="clear">Nieuw gesprek</button></div></div>
<div class="study-scroll"><div class="study-banner" data-banner role="status" hidden></div>
<section data-access><p class="study-access-note" data-access-note></p><label class="study-consent"><input type="checkbox" data-consent>Ik deel mijn bericht, de actuele paginacontext en mijn ingevulde antwoord met OpenAI om hulp te krijgen. Mijn gesprek blijft in dit tabblad bewaard.</label>
<form data-login><label for="belre-assistant-code" data-code-label hidden>Toegangscode van de beheerder</label><div class="study-code-row"><input id="belre-assistant-code" type="password" autocomplete="off" maxlength="256" hidden><button type="submit" data-start>Start de assistent</button></div></form><button type="button" class="study-text-button" data-action="status">Beschikbaarheid opnieuw controleren</button></section>
<div class="study-starters"><button type="button" data-prompt="Geef één hint voor de eerste stap, zonder de oplossing te verklappen.">Geef een hint</button><button type="button" data-prompt="Leg het belangrijkste begrip op deze pagina uit en verwijs naar de BELRE3-bronnen.">Leg het begrip uit</button><button type="button" data-prompt="Welke casusgegevens zijn voor deze vraag relevant, en waarom?" data-question-only>Welke gegevens?</button><button type="button" data-prompt="Kijk mijn ingevulde antwoord na. Leg uit wat goed, fout of onvolledig is en geef waar mogelijk een onderbouwd puntenadvies." data-question-only>Kijk mijn antwoord na</button><button type="button" data-prompt="Geef het antwoord op deze vraag met de berekening of redenering." data-question-only>Antwoord en uitleg</button></div>
<div class="study-messages" role="log" aria-live="polite" aria-relevant="additions" data-messages></div><p data-pending class="study-access-note" role="status" hidden></p></div>
<footer class="study-compose"><form data-chat-form><label class="study-sr" for="belre-assistant-message">Je vraag aan de assistent</label><textarea id="belre-assistant-message" rows="2" maxlength="2500" placeholder="Stel je vraag over deze pagina…"></textarea><div class="study-send-row"><span data-counter>0 / 2500</span><button type="button" data-action="stop" hidden>Stop</button><button type="submit" data-send>Versturen</button></div></form><div class="study-bottom"><small>55 brondocumenten · gesprek blijft bij navigeren</small><button type="button" class="study-text-button" data-action="logout" hidden>Uitloggen</button></div></footer></aside>`;
document.body.append(ui);
const $=s=>ui.querySelector(s),panel=$('#belre-assistant'),input=$('#belre-assistant-message'),launcher=$('.study-assistant-launch'),resizer=$('#belre-assistant-resizer');
const layout=createAssistantLayout(nav,panel);
input.value=typeof saved.draft==='string'?saved.draft.slice(0,2500):'';$('[data-consent]').checked=consent;
let width=Math.max(340,Math.min(720,Number(saved.width)||430));
function setWidth(value){const factor=window.StudyScale?.get()||1;width=Math.max(340,Math.min(Math.min(720,innerWidth*.45/factor),value));document.documentElement.style.setProperty('--belre-assistant-width',width+'px');resizer.setAttribute('aria-valuenow',String(Math.round(width)));layout.schedule();}
setWidth(width);
function persist(){try{sessionStorage.setItem(KEY,JSON.stringify({messages:messages.slice(-100),draft:input.value,consent,open:!panel.hidden,width}));}catch{banner('Bewaren in dit tabblad lukt niet. Houd de pagina open om het gesprek te behouden.');}}
function banner(text,error=false){const el=$('[data-banner]');el.textContent=text;el.hidden=!text;el.classList.toggle('is-error',error);}
function controls(){const ready=!!current&&!nav.loading&&!!status?.ready&&!!status?.authenticated&&consent;$('[data-send]').disabled=!ready||running||!input.value.trim();$('[data-start]').disabled=!consent||!status?.ready;$('[data-action="stop"]').hidden=!running;$('[data-mode]').disabled=running;$('[data-counter]').textContent=input.value.length+' / 2500';for(const b of ui.querySelectorAll('[data-prompt]'))b.disabled=running||!current;$('[data-action="logout"]').hidden=!status?.authenticated;$('[data-access]').hidden=!!status?.authenticated&&consent;}
function render(){
  const log=$('[data-messages]');log.replaceChildren();
  for(const m of messages){
    const article=document.createElement('article');article.className='study-message is-'+m.role;
    const who=document.createElement('strong');who.className='study-message-who';who.textContent=m.role==='user'?'Jij':'BELRE3 Assistent';
    const label=document.createElement('small');label.className='study-message-context';label.textContent=m.contextLabel||'BELRE3';
    const body=document.createElement('div');body.className='study-message-body';
    renderMarkdown(body,m.content.replace(/\[bron:([^\]]+)\]/g,(_,id)=>{const n=(m.citations||[]).findIndex(c=>c.id===id);return n<0?'':'['+(n+1)+']';}),document,{feedback:m.role==='assistant'});
    article.append(who,label,body);
    if(m.failed){const note=document.createElement('p');note.className='study-message-error';note.textContent='Niet beantwoord. Je kunt je vraag opnieuw versturen.';article.append(note);}
    if(m.citations?.length){const refs=document.createElement('nav');refs.className='study-sources';refs.setAttribute('aria-label','Bronnen bij dit antwoord');m.citations.forEach((c,i)=>{if(!/^\/oefenen\/content\/pdf\/[a-f0-9]{64}\.pdf#page=\d+$/.test(c.url))return;const a=document.createElement('a');a.href=c.url;a.target='_blank';a.rel='noopener';a.textContent=(i+1)+'. '+c.label;refs.append(a);});article.append(refs);}
    log.append(article);
  }
}
function refreshLauncher(){
  const activeDocument=nav.inCourse?nav.courseWindow?.document:document;
  const selector=nav.inCourse?'[data-belre-assistant]':'.pg.vis [data-open-belre-assistant]';
  if(nav.inCourse)for(const button of activeDocument?.querySelectorAll(selector)||[])button.hidden=!panel.hidden;
  const inline=[...activeDocument?.querySelectorAll(selector)||[]].find(button=>button.getClientRects().length&&activeDocument.defaultView.getComputedStyle(button).visibility==='visible');
  launcher.hidden=!panel.hidden||!!inline;
  launcher.setAttribute('aria-expanded',String(!panel.hidden));
  inline?.setAttribute('aria-expanded',String(!panel.hidden));
  return inline||launcher;
}
async function refreshContext(){
  refreshLauncher();
  layout.schedule();
  const generation=++contextGeneration;
  const footer=nav.inCourse&&!nav.loading?nav.window.document.querySelector('#mc-app:not([hidden]) .question-nav,#exam-app:not([hidden]) .exam-footer'):null;
  const frame=document.getElementById('belre-course-frame'),factor=window.StudyScale?.get()||1;
  const top=footer?frame.getBoundingClientRect().top+footer.getBoundingClientRect().top*(frame.getBoundingClientRect().width/nav.window.innerWidth):null;
  launcher.style.bottom=Number.isFinite(top)&&top<innerHeight&&top>innerHeight/2?Math.ceil((innerHeight-top+12)/factor)+'px':'';
  try{const value=await readContext(nav.window);if(generation!==contextGeneration)return;current=value;$('[data-context-title]').textContent=nav.loading?'Omgeving laden…':value.label;$('[data-context-question]').textContent=value.preview;for(const b of ui.querySelectorAll('[data-question-only]'))b.hidden=value.context.kind==='page';controls();}catch{current=null;$('[data-context-title]').textContent='De pagina wordt geladen';controls();}
}
function toggle(open){if(open&&nav.inCourse)nav.courseWindow?.dispatchEvent(new Event('cafa:assistant-start'));panel.hidden=!open;resizer.hidden=!open;document.body.classList.toggle('belre-assistant-open',open);nav.setInert(open&&innerWidth<=760);const trigger=refreshLauncher();layout.sync();persist();if(open){refreshContext();refreshStatus();$('[data-action="close"]').focus({preventScroll:true});}else trigger.focus({preventScroll:true});}
async function api(name,body,signal){const r=await fetch('/api/study-'+name,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal});let data;try{data=await r.json();}catch{throw Error('De assistentverbinding is nog niet beschikbaar.');}if(!r.ok){const error=Error(data.error||'De verbinding kon niet worden voltooid.');error.code=data.code;throw error;}return data;}
async function refreshStatus(){
  try{status=await api('status');const until=new Date(status.freeUntil).toLocaleDateString('nl-NL',{day:'numeric',month:'long',timeZone:'Europe/Amsterdam'});$('[data-access-note]').textContent=status.freeAccess?'Tijdelijk gratis. Vanaf '+until+' heb je een toegangscode van de beheerder nodig.':'Vraag een toegangscode bij de beheerder om de assistent te gebruiken.';$('[data-code-label]').hidden=!status.codeRequired;$('#belre-assistant-code').hidden=!status.codeRequired;$('[data-start]').textContent=status.codeRequired?'Ontgrendelen':'Start de assistent';if(!status.ready)banner('De BELRE3 Assistent wordt ingericht. Echte antwoorden zijn nog niet beschikbaar.');else if(!running)banner('');updateHome(status);}catch(error){status=null;banner(error.message,true);}controls();
}
function updateHome(s){const date=new Date(s.freeUntil).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});for(const node of document.querySelectorAll('[data-assistant-period]'))node.textContent=!s.ready?'De assistent wordt ingericht. Antwoorden zijn beschikbaar zodra de verbinding is geactiveerd.':s.freeAccess?'Gratis tot '+date+' uur. Daarna vraag je een toegangscode bij de beheerder.':'Vraag een toegangscode bij de beheerder om de BELRE3 Assistent te gebruiken.';}
async function start(e){e.preventDefault();try{await api('auth',{code:$('#belre-assistant-code').value,consent});$('#belre-assistant-code').value='';await refreshStatus();if(status?.authenticated)input.focus();}catch(error){banner(error.message,true);}controls();}
async function send(e){
  e.preventDefault();if(running||!status?.authenticated||!consent||!input.value.trim()||nav.loading)return;
  // Capture before the await: a navigation during hashing must not change this request's context.
  running=true;controls();const w=nav.window,text=input.value.trim();let snapshot;
  try{snapshot=await readContext(w);}catch{running=false;controls();banner('De vraagcontext kon niet worden gelezen. Probeer het opnieuw.',true);return;}
  const history=historyFor(messages),message={role:'user',content:text,contextLabel:snapshot.label};
  messages.push(message);input.value='';running=true;controller=new AbortController();const generation=++requestGeneration;
  $('[data-pending]').textContent='Antwoord wordt opgesteld bij: '+snapshot.label;$('[data-pending]').hidden=false;
  banner('');render();controls();persist();
  try{const response=await api('chat',{...snapshot,message:text,history,mode:snapshot.context.kind==='page'?'review':$('[data-mode]').value,consent},controller.signal);
    if(generation!==requestGeneration)return;
    messages.push({role:'assistant',content:response.answer,citations:response.citations,contextLabel:snapshot.label});
  }catch(error){if(generation!==requestGeneration)return;message.failed=true;if(!input.value)input.value=text;if(error.code==='login_required')await refreshStatus();banner(error.name==='AbortError'?'Je verzoek is gestopt.':error.message,true);}
  finally{if(generation===requestGeneration){running=false;controller=null;$('[data-pending]').hidden=true;render();controls();persist();const scroll=$('.study-scroll');scroll.scrollTop=scroll.scrollHeight;}}
}
launcher.addEventListener('click',()=>toggle(true));$('[data-login]').addEventListener('submit',start);$('[data-chat-form]').addEventListener('submit',send);
input.addEventListener('input',()=>{controls();persist();});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!$('[data-send]').disabled)$('[data-chat-form]').requestSubmit();}});
$('[data-consent]').addEventListener('change',e=>{consent=e.target.checked;controls();persist();});
ui.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.prompt){input.value=b.dataset.prompt;controls();input.focus();persist();return;}
  const action=b.dataset.action;if(action==='close')toggle(false);if(action==='stop')controller?.abort();if(action==='status')refreshStatus();
  if(action==='clear'){if(running){banner('Stop eerst het lopende antwoord voordat je een nieuw gesprek begint.');return;}messages=[];input.value='';render();banner('');controls();persist();}
  if(action==='logout'){try{await api('logout',{});consent=false;$('[data-consent]').checked=false;await refreshStatus();persist();}catch(error){banner(error.message,true);}}
});
document.addEventListener('click',e=>{if(e.target.closest('[data-open-belre-assistant]'))toggle(true);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();toggle(false);}if(e.key==='Tab'&&!panel.hidden&&innerWidth<=760){const focus=[...panel.querySelectorAll('button,input,textarea,select,a')].filter(n=>!n.disabled&&n.getClientRects().length);const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
document.addEventListener('selectionchange',()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshContext,150);});
window.addEventListener('scroll',()=>{if(nav.inCourse)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshContext,200);},{passive:true});
function viewport(){if(innerWidth>760)setWidth(width);nav.setInert(!panel.hidden&&innerWidth<=760);refreshLauncher();layout.schedule();}
window.addEventListener('resize',viewport);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();
resizer.addEventListener('pointerdown',e=>{resizer.setPointerCapture(e.pointerId);resizer.dataset.dragging='true';e.preventDefault();});
resizer.addEventListener('pointermove',e=>{if(resizer.dataset.dragging)setWidth((innerWidth-e.clientX)/(window.StudyScale?.get()||1));});
for(const event of ['pointerup','pointercancel'])resizer.addEventListener(event,()=>{delete resizer.dataset.dragging;persist();});
resizer.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();setWidth(e.key==='Home'?430:width+(e.key==='ArrowLeft'?20:-20));persist();}});
window.BelreAssistant={open:()=>toggle(true),close:()=>toggle(false),refreshLauncher};
render();controls();refreshContext();refreshStatus();if(saved.open)toggle(true);
