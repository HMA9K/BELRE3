import {colleges,summaryUrl,summaryStudyParts} from '../../js/course-links.mjs?v=20261001-progress1';
import {browserProgressStorage,studyStorageKey,readStudyProgress,setStudied} from '../../js/study-progress.mjs';
import {mcStorageKey,examStorageKey,readQuestionProgress,courseProgress} from './course-progress-core.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>location.hash==='#voortgang/onderwerpen';
const meter=(value,label,ok=true)=>!ok?'<span class="course-progress-unavailable">Niet leesbaar</span>':value.available?
  '<span class="course-progress-count"><strong>'+value.answered+'</strong> / '+value.available+'</span><progress max="'+value.available+'" value="'+value.answered+'" aria-label="'+esc(label)+': '+value.answered+' van '+value.available+' beantwoord"></progress>':
  '<span class="course-progress-empty">Geen bronvragen</span>';

export function createCourseProgress(host,bank,exams,map,dependencies){
  function render(focusTopic,message='',error=false){
    const questions=readQuestionProgress(browserProgressStorage,dependencies),reading=readStudyProgress(browserProgressStorage);
    const progress=courseProgress(bank,exams,map,{...questions,study:reading.store},dependencies.examEngine.answeredCount);
    const messages=[!questions.mcOK?'Je MC-voortgang kon niet worden gelezen. De telling is daarom niet beschikbaar.':'',!questions.examOK?'Je tentamenvoortgang kon niet worden gelezen. De telling is daarom niet beschikbaar.':'',reading.error||'',error?message:''].filter(Boolean);
    host.innerHTML='<div class="home-head"><h1>Voortgang per onderwerp</h1><p class="home-sub">Alle colleges, je oefenvragen en je bestudeerde leerstof op één plek.</p></div><div class="course-progress-body">'+
      (messages.length?'<div class="course-progress-notice" role="alert">'+messages.map(text=>'<p>'+esc(text)+'</p>').join('')+'</div>':'')+
      '<div class="course-progress-totals" aria-label="Totale voortgang"><section><h2>MC en korte vragen</h2>'+meter(progress.mc,'Alle MC en korte vragen',questions.mcOK)+'<p>Unieke vragen beantwoord</p></section><section><h2>Open tentamenvragen</h2>'+meter(progress.exam,'Alle open tentamenvragen',questions.examOK)+'<p>Unieke bronvragen beantwoord</p></section><section><h2>Leerstof bestudeerd</h2>'+(reading.ok?'<span class="course-progress-count"><strong>'+progress.study.completed+'</strong> / '+progress.study.total+'</span><progress max="'+progress.study.total+'" value="'+progress.study.completed+'" aria-label="'+progress.study.completed+' van '+progress.study.total+' onderwerpen bestudeerd"></progress>':'<span class="course-progress-unavailable">Niet leesbaar</span>')+'<p>Onderwerpen zelf afgevinkt</p></section></div>'+
      '<p class="course-progress-intro">De aantallen tonen je beantwoorde vragen, naast het aantal beschikbare vragen. Vink de leerstof af nadat je die hebt bestudeerd. Dit kan hier of bij de uitleg.</p>'+
      '<nav class="course-progress-jumps" aria-label="Ga naar een college">'+progress.colleges.map(c=>'<a href="#progress-college-'+esc(c.id.replaceAll(' ','-'))+'" data-progress-college="'+esc(c.id)+'">College '+esc(c.id)+'</a>').join('')+'</nav>'+
      progress.colleges.map(college=>{
        const label=colleges.find(([,id])=>id===college.id)?.[2]||'';
        return '<section class="course-progress-college" id="progress-college-'+esc(college.id.replaceAll(' ','-'))+'" aria-labelledby="progress-title-'+esc(college.id.replaceAll(' ','-'))+'"><header><div><p>College '+esc(college.id)+'</p><h2 id="progress-title-'+esc(college.id.replaceAll(' ','-'))+'">'+esc(label)+'</h2></div><span>'+(reading.ok?college.study.completed+' / '+college.study.total+' onderwerpen bestudeerd':'Studiemarkeringen niet leesbaar')+'</span></header>'+
          '<table data-table-static><caption class="sr-only">Voortgang per onderwerp van college '+esc(college.id)+'</caption><thead><tr><th scope="col">Onderwerp</th><th scope="col">MC en korte vragen</th><th scope="col">Open tentamenvragen</th><th scope="col">Leerstof</th></tr></thead><tbody>'+college.topics.map(topic=>{
            const mcLink='#oefenen/onderwerp/'+topic.id,examLink='#welkom/opgaven/onderwerp/'+topic.id;
            return '<tr data-progress-topic="'+esc(topic.id)+'"><th scope="row"><a href="'+summaryUrl(topic.id)+'">'+esc(topic.title)+'</a><nav aria-label="Oefenen: '+esc(topic.title)+'"><a href="'+mcLink+'">MC oefenen</a>'+(topic.exam.available?'<a href="'+examLink+'">Open vragen</a>':'')+'</nav></th>'+
              '<td data-progress-label="MC en korte vragen">'+meter(topic.mc,topic.title+' MC',questions.mcOK)+'</td><td data-progress-label="Open tentamenvragen">'+meter(topic.exam,topic.title+' tentamenvragen',questions.examOK)+'</td>'+
              '<td data-progress-label="Leerstof"><label class="course-progress-study"><input type="checkbox" data-progress-study="'+esc(topic.id)+'" aria-label="'+esc(topic.title)+': leerstof bestudeerd"'+(topic.study.studied?' checked':'')+(!reading.ok?' disabled':'')+'><span>'+(topic.study.studied?'Bestudeerd':'Markeer bestudeerd')+'</span></label>'+(topic.study.total>1?'<small data-study-parts>'+topic.study.completed+' / '+topic.study.total+' tekstonderdelen</small>':'')+'</td></tr>';
          }).join('')+'</tbody></table></section>';
      }).join('')+
      '<details class="course-progress-explanation"><summary>Wat telt mee in dit overzicht?</summary><ul><li>Bij MC en korte vragen telt een gekozen antwoord mee. Een vraag telt één keer, ook als je meerdere reeksen doet of opnieuw probeert. Het aantal gaat over de huidige vragenbank.</li><li>Bij open tentamenvragen telt een ingevuld antwoord mee, ook in een lopende poging. Dezelfde bronvraag in een volledig tentamen en een oefenreeks per onderwerp telt één keer.</li><li>De open vragen omvatten '+(progress.exam.available-progress.supplementary)+' BELRE3-bronvragen en '+progress.supplementary+' aanvullende vragen uit Tax 2. Bij een gemengde bronopgave tellen de vragen mee bij elk gekoppeld onderwerp. De totaaltelling telt ze één keer.</li><li>Bestudeerd is je eigen markering. Het openen van een pagina vinkt niets af. Een onderwerp met meerdere tekstonderdelen is bestudeerd zodra alle bijbehorende onderdelen zijn afgevinkt.</li><li>Beantwoord en bestudeerd zeggen hoeveel je hebt gedaan. Bekijk je scores en uitwerkingen om te beoordelen wat je beheerst. Alles blijft in deze browser bewaard.</li></ul></details>'+
      '<nav class="course-progress-links" aria-label="Resultaten en bronnen"><a href="#voortgang">MC-resultaten per oefenreeks</a><a href="#dashboard/voltooid">Tentamenresultaten</a><a href="#bronnen">Studiebronnen</a></nav><p class="small" role="status" data-progress-status>'+esc(message||'Je opgeslagen voortgang wordt automatisch samengebracht. Eerdere antwoorden blijven behouden.')+'</p></div>';
    for(const topic of progress.colleges.flatMap(c=>c.topics)){
      const checkbox=host.querySelector('[data-progress-study="'+topic.id+'"]');checkbox.indeterminate=topic.study.completed>0&&!topic.study.studied;
    }
    if(focusTopic)host.querySelector('[data-progress-study="'+focusTopic+'"]')?.focus({preventScroll:true});
    document.title='BELRE3 / Voortgang per onderwerp';
  }
  host.addEventListener('change',event=>{
    const control=event.target.closest('[data-progress-study]');if(!control||!active())return;
    const topic=control.dataset.progressStudy,result=setStudied(browserProgressStorage,topic,summaryStudyParts(topic),control.checked);
    render(topic,result.ok?(control.checked?'Leerstof gemarkeerd als bestudeerd.':'Studiemarkering verwijderd.'):result.error,!result.ok);
  });
  host.addEventListener('click',event=>{
    const link=event.target.closest('[data-progress-college]');if(!link||!active())return;
    event.preventDefault();const id='progress-college-'+link.dataset.progressCollege.replaceAll(' ','-');
    const section=document.getElementById(id);section?.scrollIntoView({block:'start',behavior:'smooth'});const heading=section?.querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  });
  let queued=false;
  function refresh(){
    if(!active()||queued)return;queued=true;
    queueMicrotask(()=>{queued=false;if(active())render(host.ownerDocument.activeElement?.dataset.progressStudy);});
  }
  window.addEventListener('storage',event=>{if([null,mcStorageKey,examStorageKey,studyStorageKey].includes(event.key))refresh();});
  window.addEventListener('belre:question-progress',refresh);
  return {render};
}
