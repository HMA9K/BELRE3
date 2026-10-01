import {examStudyLinks} from './course-study-links.mjs';
// Keep the existing privacy control clear of the fixed question navigation.
let footer=null,queued=false;
const resize=new ResizeObserver(entries=>{
  for(const entry of entries){
    if(entry.target!==footer)continue;
    const value=Math.ceil(footer.getBoundingClientRect().height)+'px';
    if(document.documentElement.style.getPropertyValue('--belre-footer-height')!==value)document.documentElement.style.setProperty('--belre-footer-height',value);
  }
});
function refresh(){
  queued=false;
  const app=document.querySelector('#exam-app:not([hidden])'),actions=app?.querySelector('.exam-answer-actions');
  if(actions&&!actions.querySelector('[data-belre-study-links]')){
    const position=window.CafaExams?.getPosition(),context=position&&window.CafaExams.getQuestionContext(position.attempt,position.index);
    const links=examStudyLinks(context,window.BELRE3_COURSE_MAP),group=document.createElement(links.length>1?'details':'span');group.dataset.belreStudyLinks='';group.className='belre-study-links';
    let target=group;
    if(links.length>1){const summary=document.createElement('summary');summary.className='btn belre-summary-link';summary.textContent='Uitleg bij deze vraag';const nav=document.createElement('nav');nav.setAttribute('aria-label','Uitleg bij deze tentamenvraag');group.append(summary,nav);target=nav;}
    for(const item of links){const link=document.createElement('a');link.href=item.href;link.className='btn belre-summary-link';link.textContent=links.length===1?'Uitleg bij deze vraag →':item.title+' →';target.append(link);}
    actions.querySelector('[data-exam-action="pause"]').after(group);
  }
  const controls=app?.querySelector('.exam-cirrus-actions');
  if(controls&&!controls.querySelector('[data-belre-law-book]')){const link=document.createElement('a');link.href='/index.html#pagina/art';link.className='btn';link.dataset.belreLawBook='';link.textContent='Wetboek';controls.querySelector('[data-exam-action="submit"]').before(link);}
  const current=document.querySelector('#mc-app:not([hidden]) .question-nav,#exam-app:not([hidden]) .exam-footer');
  if(current===footer)return;
  if(footer)resize.unobserve(footer);
  footer=current;
  if(footer)resize.observe(footer);else document.documentElement.style.removeProperty('--belre-footer-height');
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(refresh);}
new MutationObserver(schedule).observe(document.getElementById('app-content'),{childList:true,subtree:true});
window.addEventListener('hashchange',schedule);
refresh();
