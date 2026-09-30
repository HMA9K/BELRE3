import {contentBase} from '../config.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sourceButtons(refs,sources,label='Bron') {
  return refs.map(ref=>{
    const source=sources[ref.sourceId];if(!source)return '';
    return '<button class="btn" type="button" data-source-id="'+esc(ref.sourceId)+'" data-source-page="'+(ref.pdfPages?.[0]||1)+'">'+esc(label)+': '+esc(source.title.split('/').pop())+(ref.pdfPages?.length?' · p. '+ref.pdfPages.join(', '):'')+'</button>';
  }).join('');
}
export function initSources(sources,exams) {
  const pane=document.getElementById('source-pane'),view=pane.querySelector('[data-source-view]'),status=pane.querySelector('[data-source-status]');
  let current=null,frame=null,opener=null,request=0,page=1;
  async function saved(){
    try{const reader=frame?.contentWindow?.CafaPdfReader;await reader?.flush();if(reader?.pending)throw new Error();return true;}
    catch{status.textContent='Arceringen zijn nog niet opgeslagen. Download de bewerkte PDF voordat je dit venster sluit.';return false;}
  }
  async function close(){
    if(!await saved())return;
    pane.hidden=true;document.body.classList.remove('belre-pdf-open');
    if(opener?.isConnected)opener.focus({preventScroll:true});
  }
  async function open(id,requestedPage,button) {
    const source=sources[id];if(!source)return;
    const ticket=++request;if(id!==current&&!await saved())return;if(ticket!==request)return;
    opener=button;pane.dataset.position=button.dataset.sourceHistorical?'right':'left';page=Math.max(1,Math.min(source.pages,Number(requestedPage)||1));
    pane.hidden=false;document.body.classList.add('belre-pdf-open');status.textContent='';
    pane.querySelector('[data-source-title]').textContent=source.title.split('/').pop();
    pane.querySelector('[data-source-note]').textContent=button.dataset.sourceHistorical?'Historische bronuitwerking. Deze PDF is geen oefenmodel voor de wetgeving van 2026.':'Origineel brondocument. Tabellen en schema’s lees je in deze PDF.';
    const url=new URL(source.url,contentBase);
    const download=pane.querySelector('[data-source-download]');download.href=url.href;download.download=source.title.split('/').pop();
    if(current!==id){
      frame=document.createElement('iframe');frame.title='Bron: '+source.title.split('/').pop();
      frame.src=new URL('../pdf-reader/web/viewer.html',import.meta.url).href+'?file='+encodeURIComponent(url.href)+'#page='+page;
      view.replaceChildren(frame);current=id;
    }else frame.contentWindow?.CafaPdfReader?.goToPage(page);
    pane.querySelector('[data-source-close]').focus({preventScroll:true});
  }
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==frame?.contentWindow||e.data!=='belre3:pdf-ready')return;
    frame.contentWindow.CafaPdfReader.goToPage(page);
  });
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-source-id]');
    if(button){e.preventDefault();void open(button.dataset.sourceId,button.dataset.sourcePage,button);}
    if(e.target.closest('[data-source-close]'))void close();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pane.hidden){e.preventDefault();void close();}});
  function decorate(){
    const position=window.CafaExams?.getPosition(),context=position&&CafaExams.getQuestionContext(position.attempt,position.index);
    const welcome=location.hash.match(/^#welkom\/([^/]+)/),review=location.hash.match(/^#inzage\/([^/]+)/);
    const attempt=review&&CafaExams.getAttempt(review[1]);
    const id=context?.exam.id||welcome?.[1]||attempt?.exam.id;
    const exam=exams.find(e=>e.id===id);if(!exam)return;
    const host=document.querySelector('#exam-app .exam-answer-actions,#exam-app .exam-paper,#exam-app .exam-results-panel,#exam-app .review-toolbar');
    if(!host||host.querySelector('[data-pdf-actions]'))return;
    const bar=document.createElement('div');bar.dataset.pdfActions='';bar.className='belre-source-actions';
    const refs=exam.pdfReferences.map(ref=>({sourceId:ref.sourceId,pdfPages:ref.role==='questions'?(context?.question.contextPdfPages?.length?context.question.contextPdfPages:context?.question.sourceRef.pdfPages||[1]):[1],role:ref.role}));
    bar.innerHTML=refs.map(ref=>'<button class="btn" type="button" data-source-id="'+esc(ref.sourceId)+'" data-source-page="'+(ref.pdfPages[0]||1)+'"'+(ref.role==='model_solution'?' data-source-historical="true"':'')+'>'+ (ref.role==='questions'?'Tentamen PDF':'Historische uitwerking PDF')+'</button>').join('');
    host.append(bar);
  }
  window.addEventListener('cafa:exam-route',decorate);
  window.addEventListener('hashchange',()=>{if(!pane.hidden)void close();request++;});
  decorate();
}
