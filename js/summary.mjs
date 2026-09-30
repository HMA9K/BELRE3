import data from './summary-data.mjs';
import {quoteRanges,matchingSections} from './summary-core.mjs';
const escape=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const storageKey='belre3-summary-v2',mounted=new WeakSet();
let saved={};try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}')||{};}catch{}
const state={college:saved.college||'c12',topic:saved.topic||'c12-bp',open:new Set(Array.isArray(saved.open)?saved.open:[]),query:''};
let lawPromise;
const save=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify({...state,open:[...state.open],query:undefined}));}catch{}};
function sourceLink(ref,label){
  const source=data.sources[ref.sourceId];if(!source)return '';
  const pages=ref.pdfPages||[],text=label||source.title.split('/').at(-1).replace(/\.pdf$/i,'');
  return '<a target="_blank" rel="noopener" href="/oefenen/content/'+escape(source.url)+'#page='+pages[0]+'">'+escape(text)+(pages.length?' · p. '+pages.join(', '):'')+'</a>';
}
const sourceList=refs=>'<ul>'+refs.map(ref=>'<li>'+sourceLink(ref)+(ref.locator?' <span>('+escape(ref.locator)+')</span>':'')+'</li>').join('')+'</ul>';
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
  const hash='#pagina/sam/'+state.topic;if(location.hash!==hash)history.replaceState(null,'',hash);
  window.dispatchEvent(new Event('belre:navigation'));save();
}
function sectionHtml(section,index){
  return '<details class="summary-section" data-summary-section="'+escape(section.id)+'"'+(state.open.has(section.id)?' open':'')+'><summary>'+escape(section.title)+'</summary><div class="summary-section-body"><div>'+section.bodyHtml+'</div>'+
    '<div class="summary-exam-tip"><strong>Voor je tentamenantwoord</strong>'+escape(section.examTip)+'</div>'+
    section.articles.map((article,i)=>'<details class="summary-law" data-law-index="'+index+':'+i+'"><summary>'+escape(article.label)+'</summary><div class="summary-law-body"><p>'+escape(article.why)+'</p><div data-law-content><p>De wettekst wordt geladen zodra je deze verwijzing opent.</p></div></div></details>').join('')+
    '<details class="summary-sources"><summary>Studiebronnen bij deze uitleg</summary>'+sourceList(section.sourceRefs)+'</details></div></details>';
}
function coverageHtml(topic){
  const related=topic.id==='c67-anti'?'c67-voeg':topic.id.startsWith('c9-')?'c9-ht':topic.id;
  const rows=data.coverage.filter(r=>r.summaryTopic===related),examIds=new Set(rows.flatMap(r=>r.examIds));
  const examples=[...new Map(rows.flatMap(r=>r.examples).map(e=>[e.examId+':'+e.group,e])).values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  return '<details class="summary-coverage"><summary>Zo komt dit onderwerp terug in de tentamens</summary><p>'+ (examIds.size?(related===topic.id?'Dit onderwerp':'Het bredere onderwerp '+rows.map(r=>r.title).join(', '))+' is gekoppeld aan opgaven in '+examIds.size+' van de '+data.examCount+' BELRE3-brontentamens.':'Dit onderwerp heeft geen afzonderlijke koppeling in de beschikbare BELRE3-tentamenopgaven, maar hoort wel bij de voorgeschreven leerstof.')+'</p>'+
    (examples.length?'<ul>'+examples.map(e=>'<li>'+sourceLink(e.sourceRefs[0],'Tentamen '+e.date.split('-').reverse().join('-')+', opgave '+e.group)+'</li>').join('')+'</ul>':'')+
    '<p>Een opgave kan meerdere onderwerpen combineren. De telling is geen voorspelling van je toets. Gebruik de kernregels én oefen het motiveren en rekenen.</p></details>';
}
function scopeHtml(){return '<details class="summary-scope"><summary>Tentamendekking en gebruikte bronnen</summary><p>Gecontroleerd tegen de aangeleverde Wet Vpb van 24 mei 2026, officiële collegeslides, onderwijsprogramma, oorspronkelijke tentamens en uitwerkingen en de oefenbundels. Het onderwijsprogramma verdeelt 65–90 van de 100 punten over toepassing. Alleen regels herkennen is dus niet genoeg: oefen ook berekeningen en gemotiveerde antwoorden.</p>'+
  '<p>'+sourceLink({sourceId:'pdf-d9a35cf6fcd385b1',pdfPages:[3,4,5,6,7]},'Onderwijsprogramma: leerdoelen, toetsmatrix en stofafbakening')+'</p>'+
  '<div class="summary-table-scroll" tabindex="0"><table><caption>Dekking van de 19 onderwerpen uit de tentamenindeling</caption><thead><tr><th scope="col">Onderwerp</th><th scope="col">BELRE3-brontentamens</th></tr></thead><tbody>'+data.coverage.map(r=>'<tr><td><button type="button" data-summary-jump="'+r.summaryTopic+'">'+escape(r.title)+'</button></td><td>'+r.examIds.length+' van '+data.examCount+'</td></tr>').join('')+'</tbody></table></div>'+
  '<p>De aanvullende Tax 2-opgaven tellen niet mee in deze frequenties. Ook onderwerpen zonder historische opgave, zoals innovatiebox, blijven onderdeel van de stof. Artikel 13 lid 17 en artikel 28c zijn volgens het onderwijsprogramma geen zelfstandig te bestuderen onderdelen.</p>'+
  '<p>De voorgeschreven leerboekparagrafen en afzonderlijke syllabi zijn niet als bronbestand aanwezig. De aangeleverde wetstekst eindigt bij artikel 29i; artikel 35 ontbreekt. Voor college 9 zijn uitsluitend de toegestane slides en uitwerkingen gebruikt; de losse artikelen vallen buiten deze bronafbakening. Historische antwoordmodellen kunnen andere tarieven of artikelnummers gebruiken.</p></details>';}
function render(app,focus){
  const {college,topic}=current();
  app.innerHTML='<div class="summary-tools"><div class="summary-search"><label for="summary-search-input">Zoek in alle colleges</label><input type="search" id="summary-search-input" placeholder="Bijvoorbeeld renteaftrek, liquidatieverlies of art. 15ai" value="'+escape(state.query)+'" autocomplete="off" aria-controls="summary-search-results"></div><p class="summary-version">Broncontrole 30 september 2026 · Wetboek 24 mei 2026</p></div><div class="summary-search-results" id="summary-search-results" hidden></div>'+
    '<nav class="summary-colleges" aria-label="Kies een college">'+data.colleges.map(c=>'<button type="button" data-college="'+c.id+'" aria-pressed="'+(c.id===college.id)+'">'+escape(c.label)+'</button>').join('')+'</nav>'+
    '<p class="summary-kicker">'+escape(college.label)+'</p><h2>'+escape(college.title)+'</h2><p class="summary-intro">'+escape(college.intro)+'</p>'+
    '<section class="summary-objectives" aria-labelledby="summary-objectives-title"><h3 id="summary-objectives-title">Na dit college kun je</h3><ul>'+college.objectives.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul></section>'+
    '<nav class="summary-topics" aria-label="Onderwerpen binnen dit college">'+college.topics.map(t=>'<button type="button" data-topic="'+t.id+'" aria-pressed="'+(t.id===topic.id)+'">'+escape(t.title)+'</button>').join('')+'</nav>'+
    '<section aria-labelledby="summary-topic-title"><h3 id="summary-topic-title">'+escape(topic.title)+'</h3><p class="summary-topic-intro">'+escape(topic.summary)+'</p>'+
    '<div class="summary-section-actions"><span>'+topic.sections.length+' onderdelen</span><div><button type="button" data-summary-expand="true">Alles uitklappen</button><button type="button" data-summary-expand="false">Alles inklappen</button></div></div>'+topic.sections.map(sectionHtml).join('')+'</section>'+coverageHtml(topic)+
    '<section class="summary-recall" aria-labelledby="summary-recall-title"><h3 id="summary-recall-title">'+escape(college.label)+': onthouden en kunnen toepassen</h3><ul>'+college.remember.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul></section>'+
    '<div class="summary-bottom"><a href="/oefenen/#oefenen">Oefenen met MC-vragen</a><a href="/oefenen/#welkom/opgaven">Oefenen met open tentamenvragen</a></div>'+scopeHtml();
  for(const table of app.querySelectorAll('.summary-section-body table')){
    const scroll=document.createElement('div');scroll.className='summary-table-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','Tabel, horizontaal scrollbaar');table.before(scroll);scroll.append(table);
  }
  searchResults(app);if(focus)app.querySelector(focus)?.focus({preventScroll:true});
}
function searchResults(app){
  const target=app.querySelector('#summary-search-results');target.hidden=!state.query.trim();if(target.hidden){target.replaceChildren();return;}
  const matches=matchingSections(data.colleges,state.query);
  target.innerHTML='<p role="status">'+(matches.length?matches.length+(matches.length===30?' of meer':'')+' onderdelen gevonden.':'Geen onderdeel gevonden. Probeer een kortere zoekterm.')+'</p>'+matches.map(({college,topic,section})=>'<button type="button" data-summary-jump="'+topic.id+'" data-summary-open="'+section.id+'"><small>'+escape(college.label+' · '+topic.title)+'</small>'+escape(section.title)+'</button>').join('');
}
function choose(app,topicId,sectionId,focus){
  const college=data.colleges.find(c=>c.id===topicId||c.topics.some(t=>t.id===topicId));if(!college)return;
  state.college=college.id;state.topic=college.topics.find(t=>t.id===topicId)?.id||college.topics[0].id;
  if(sectionId){state.open.add(sectionId);state.query='';}
  render(app,focus);announce();
  if(sectionId){const summary=app.querySelector('[data-summary-section="'+sectionId+'"]>summary');summary?.focus({preventScroll:true});summary?.scrollIntoView({block:'center',behavior:'smooth'});}
}
async function loadLaw(details){
  if(details.dataset.loaded)return;
  const [section,index]=details.dataset.lawIndex.split(':').map(Number),reference=current().topic.sections[section]?.articles[index];if(!reference)return;
  const target=details.querySelector('[data-law-content]');target.textContent='Wettekst laden…';
  try{
    lawPromise??=fetch(new URL('./summary-law.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('bron');return r.json();}).catch(e=>{lawPromise=null;throw e;});
    const law=(await lawPromise)[reference.article];if(!target.isConnected)return;
    const ranges=quoteRanges(law.text,reference.quotes);let marked='',cursor=0;
    for(const [start,end] of ranges){marked+=escape(law.text.slice(cursor,start))+'<mark>'+escape(law.text.slice(start,end))+'</mark>';cursor=end;}marked+=escape(law.text.slice(cursor));
    const frequency=data.lawFrequency[reference.article],example=frequency?.examples[0];
    target.innerHTML='<p class="summary-law-meta">Geel markeert de kern bij dit onderwerp. Lees voorwaarden en uitzonderingen in samenhang.</p>'+reference.quotes.map(q=>'<blockquote class="summary-law-core"><mark>'+escape(q.replace(/\s+/g,' ').trim())+'</mark></blockquote>').join('')+
      '<p class="summary-law-meta">'+sourceLink(law,'Wet Vpb 1969, versie '+data.lawVersion)+'</p>'+
      (example?'<p class="summary-law-meta">Voorbeeld van een artikelverwijzing in een oorspronkelijke uitwerking: '+sourceLink(example,example.date.split('-').reverse().join('-'))+'. Historische nummering kan afwijken.</p>':'')+
      '<details class="summary-law-full"><summary>Volledig artikel '+escape(reference.article)+' met arcering</summary><div class="summary-law-text" tabindex="0" aria-label="Volledige wettekst met gemarkeerde kernpassages">'+marked+'</div></details>';
    details.dataset.loaded='true';
  }catch{if(target.isConnected)target.innerHTML='<p>De wettekst kon niet worden geladen. Sluit en open deze verwijzing om opnieuw te proberen.</p>'+sourceLink({sourceId:'pdf-339e313c8d9ef642',pdfPages:[1]},'Open het wetboek');}
}
function mount(){
  const app=document.querySelector('#pg-sam [data-summary-app]');if(!app||mounted.has(app))return;mounted.add(app);routeSelection();render(app);
  app.addEventListener('click',event=>{
    const college=event.target.closest('[data-college]'),topic=event.target.closest('[data-topic]'),jump=event.target.closest('[data-summary-jump]'),expand=event.target.closest('[data-summary-expand]');
    if(college)choose(app,college.dataset.college,null,'[data-college="'+college.dataset.college+'"]');
    else if(topic)choose(app,topic.dataset.topic,null,'[data-topic="'+topic.dataset.topic+'"]');
    else if(jump)choose(app,jump.dataset.summaryJump,jump.dataset.summaryOpen);
    else if(expand){const open=expand.dataset.summaryExpand==='true';for(const detail of app.querySelectorAll('[data-summary-section]')){detail.open=open;if(open)state.open.add(detail.dataset.summarySection);else state.open.delete(detail.dataset.summarySection);}save();}
  });
  app.addEventListener('input',event=>{if(event.target.id==='summary-search-input'){state.query=event.target.value;searchResults(app);}});
  app.addEventListener('toggle',event=>{
    const detail=event.target;if(detail.matches('[data-summary-section]')){if(detail.open)state.open.add(detail.dataset.summarySection);else state.open.delete(detail.dataset.summarySection);save();}
    if(detail.matches('[data-law-index]')&&detail.open)loadLaw(detail);
  },true);
  window.dispatchEvent(new Event('belre:navigation'));
}
const page=document.getElementById('pg-sam');if(page){new MutationObserver(mount).observe(page,{childList:true,subtree:true});mount();}
