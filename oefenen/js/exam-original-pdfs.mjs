import {originalPdfs} from '../data/exam-original-pdfs.mjs?v=belre3-20260930-ui2';
import {createDocumentPanel} from './document-panel.mjs?v=belre3-sources-wide-1';

// Original source documents only. No attempt, answer or assistant conversation is written here.
let left=null,right=null,dock=null,queued=false,currentKey='',rightRequest=0;
const viewers=new Map();
const idleReaders=new Map(),IDLE_READER_MS=60000;
function forgetViewer(key,box){clearTimeout(idleReaders.get(key));idleReaders.delete(key);box.remove();viewers.delete(key);}
function scheduleIdleReaders(){
  for(const [key,box] of viewers){
    if(activeViewer(box)){clearTimeout(idleReaders.get(key));idleReaders.delete(key);continue;}
    if(idleReaders.has(key))continue;
    idleReaders.set(key,setTimeout(async()=>{
      idleReaders.delete(key);
      if(activeViewer(box)||viewers.get(key)!==box)return;
      try{const reader=box.querySelector('iframe')?.contentWindow?.CafaPdfReader;
        if(!reader?.ready){scheduleIdleReaders();return;}
        await reader.flush();
        if(!reader.pending&&!activeViewer(box)&&viewers.get(key)===box)forgetViewer(key,box);
      }catch{}
      scheduleIdleReaders();
    },IDLE_READER_MS));
  }
}
let pruning=false;
const activeViewer=box=>box===left?.viewer||(right?.open&&box.parentElement===right&&!box.inert);
async function pruneViewers(){
  if(pruning)return;pruning=true;
  const failed=new Set();
  try{
    while(viewers.size>2){
      const candidate=[...viewers].find(([key,box])=>!activeViewer(box)&&!failed.has(key));
      if(!candidate)break;
      const [key,box]=candidate;
      try{
        const reader=box.querySelector('iframe')?.contentWindow?.CafaPdfReader;
        // Finish the IndexedDB transaction before releasing the browsing context.
        // Keep unsaved annotations accessible if local storage fails.
        await reader?.flush();
        if(reader?.pending){failed.add(key);continue;}
      }catch{failed.add(key);continue;}
      // The user may have reopened this document while saving was in progress.
      if(activeViewer(box)||viewers.get(key)!==box)continue;
      forgetViewer(key,box);
    }
  }finally{pruning=false;scheduleIdleReaders();}
}
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function context(){
  const question=document.getElementById(location.hash.slice(1));
  if(question?.matches('.question')){
    const mc=window.BelrePractice?.current();
    const sourceIds=new Set((mc?.question.sourceRefs||[]).map(ref=>ref.sourceId));
    const exam=(window.CAFA2_EXAMS||[]).find(exam=>exam.pdfReferences?.some(ref=>ref.role==='questions'&&sourceIds.has(ref.sourceId)));
    return {id:exam?.id,host:question,key:location.hash};
  }
  // A practice route briefly has no question while its screen is being loaded.
  if(/^#(?:kap|val|nvw|hk)-\d+$/.test(location.hash))return {loading:true};
  const position=window.CafaExams?.getPosition();
  if(position){const ctx=CafaExams.getQuestionContext(position.attempt,position.index);
    return {id:ctx?.question.sourceExamId||ctx?.exam.id,host:document.getElementById('exam-app'),key:position.attempt+':'+position.index};}
  const match=location.hash.match(/^#welkom\/([^/]+)/);
  return {id:match?.[1],host:document.getElementById('exam-app'),key:location.hash};
}
function actions(id,download=false){
  const source=originalPdfs[id];if(!source)return null;
  const group=document.createElement('span');group.className='original-pdf-actions';group.dataset.pdfExam=id;
  for(const [kind,label] of [['questions','Tentamen PDF'],['solutions','Uitwerking PDF']]){
    const directDownload=download||(kind==='questions'&&location.hash.startsWith('#welkom/'));
    const button=document.createElement(directDownload&&source[kind].url?'a':'button');button.className='btn';
    button.dataset.pdfExam=id;button.textContent=label+(kind==='questions'&&directDownload?' downloaden':'');
    if(directDownload&&source[kind].url){
      button.href=source[kind].url;button.download='BELRE3-'+source.date+'-'+(kind==='questions'?'tentamen':'uitwerking')+'.pdf';
      button.dataset.pdfDownload=kind;button.title=kind==='questions'?'Download het originele tentamen als PDF':'Download de historische bronuitwerking als PDF';
    }else{button.type='button';button.dataset.originalPdf=kind;button.setAttribute('aria-pressed','false');}
    if(!source[kind].url){button.disabled=true;button.title=source[kind].reason;button.setAttribute('aria-describedby','original-pdf-missing');}
    group.append(button);
  }
  return group;
}
function viewer(id,kind){
  const key=id+':'+kind;if(viewers.has(key)){
    clearTimeout(idleReaders.get(key));idleReaders.delete(key);
    const box=viewers.get(key);viewers.delete(key);viewers.set(key,box);return box;
  }
  const source=originalPdfs[id],file=source[kind],label=source.documentOnly?file.title.split('/').pop():kind==='questions'?'Origineel tentamen':'Historische uitwerking';
  const caption=label+(source.date?' · '+source.date.split('-').reverse().join('-'):'');
  const box=document.createElement('section');box.className='original-pdf-viewer';box.dataset.pdfExam=id;
  box.innerHTML='<header class="original-pdf-head"><strong>'+htmlEscape(caption)+'</strong><button type="button" class="btn" data-pdf-close="'+kind+'">'+(kind==='questions'?'Terug naar casus':'Sluiten')+'</button></header>'+
    (kind==='solutions'&&!source.documentOnly?'<p class="original-pdf-link">Historische bronuitwerking. Geen vrijgegeven oefenmodel voor de wetgeving van 2026.</p>':'')+
    '<p class="original-pdf-link"><a target="_blank" rel="noopener" href="'+file.url+'">Open PDF in een nieuw tabblad</a> · <a href="'+file.url+'" download>Origineel downloaden</a></p>'+
    '<iframe title="'+htmlEscape(label+' '+file.title)+'" src="pdf-reader/web/viewer.html?file='+encodeURIComponent(new URL(file.url,document.baseURI).href)+'&amp;key='+encodeURIComponent(key+':'+file.sha256)+'" loading="eager"></iframe>';
  viewers.set(key,box);return box;
}
function placeLeft(){
  if(!left)return;
  const rect=left.panel.getBoundingClientRect(),box=left.viewer;
  const scale=window.StudyScale?.get()||1;
  for(const [key,value] of Object.entries({left:rect.left/scale+'px',top:rect.top/scale+'px',width:rect.width/scale+'px',height:rect.height/scale+'px'})){
    if(box.style[key]!==value)box.style[key]=value;
  }
  box.style.visibility=left.panel.isConnected&&rect.width&&rect.height?'visible':'hidden';
}
const leftObserver=new ResizeObserver(placeLeft);
function closeLeft(){
  if(!left)return;
  leftObserver.unobserve(left.panel);left.viewer.style.visibility='hidden';left.viewer.inert=true;
  for(const item of left.children)item.node.hidden=item.hidden;
  left.panel.classList.remove('original-pdf-left');
  if(left.wrapper){let content=left.primary;while(content.parentElement&&content.parentElement!==left.wrapper)content=content.parentElement;
    left.wrapper.before(content);left.wrapper.remove();}
  left=null;updatePressed();scheduleIdleReaders();
}
function closeRight(){rightRequest++;if(right?.open)dock.hide();document.body.classList.remove('original-pdf-open');scheduleIdleReaders();}
function updatePressed(){
  document.querySelectorAll('[data-original-pdf]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.originalPdf==='questions'?left?.id===b.dataset.pdfExam:right?.open&&right.dataset.pdfExam===b.dataset.pdfExam)));
}
function openLeft(id,opener,restore=false){
  if(left?.id===id&&!restore){closeLeft();return;}
  closeLeft();document.querySelector('.cirrus-case-float [data-float-close]')?.click();
  const ctx=context();let panel=ctx.host?.querySelector('.exam-case-panel'),wrapper=null,primary=null;
  if(panel){
    if(panel.hidden){const toggle=ctx.host.querySelector('[data-exam-action="section"],[data-practice-case]');toggle?.click();panel=ctx.host.querySelector('.exam-case-panel');}
  }else{
    primary=ctx.host?.querySelector('.exam-dashboard-content,.exam-paper,.exam-results-panel,.qbody');if(!primary)return;
    wrapper=document.createElement('div');wrapper.className='original-pdf-dashboard-layout';
    panel=document.createElement('aside');panel.className='original-pdf-dashboard-pane';
    primary.before(wrapper);wrapper.append(panel,primary);
  }
  if(!panel||panel.hidden)return;
  const children=[...panel.children].map(node=>({node,hidden:node.hidden}));children.forEach(({node})=>node.hidden=true);
  const box=viewer(id,'questions');panel.classList.add('original-pdf-left');
  box.classList.add('original-pdf-left-viewer');box.inert=false;
  if(!box.isConnected)document.body.append(box);
  left={id,panel,children,viewer:box,wrapper,primary,opener};updatePressed();
  leftObserver.observe(panel);placeLeft();
  void pruneViewers();
}
async function openRight(id,opener,forceOpen=false){
  if(right?.open&&right.dataset.pdfExam===id){if(!forceOpen)closeRight();return;}
  const request=++rightRequest;
  if(!right){
    right=document.createElement('dialog');right.id='exam-original-solutions';right.className='study-assistant original-pdf-right';right.setAttribute('aria-label','Bron of historische uitwerking PDF');document.body.append(right);
    dock=createDocumentPanel(right,{fallbackSelector:'.exam-dashboard-content,.exam-paper',preserveContent:true,readerFirst:()=>location.hash==='#bronnen'});
    right.addEventListener('close',()=>{if(right.open)return;document.body.classList.remove('original-pdf-open');updatePressed();scheduleIdleReaders();});
  }
  const assistant=document.getElementById('study-assistant'),key=context().key;
  if(assistant?.open)await new Promise(resolve=>{assistant.addEventListener('close',resolve,{once:true});assistant.close();});
  if(context().key!==key||request!==rightRequest)return;
  right.dataset.pdfExam=id;const box=viewer(id,'solutions');
  if(window.StudyAssistant&&!box.querySelector('[data-pdf-assistant]')){
    const restore=document.createElement('button');restore.type='button';restore.className='btn';restore.dataset.pdfAssistant='';restore.textContent='Terug naar assistent';box.querySelector('header').append(restore);
  }
  // Keep the current documents attached across question changes and toggles.
  // Older, inactive readers are released after saving their annotations.
  for(const item of right.children){item.style.visibility='hidden';item.inert=true;}
  if(!box.isConnected)right.append(box);
  box.style.visibility='visible';box.inert=false;dock.show(opener);document.body.classList.add('original-pdf-open');updatePressed();
  void pruneViewers();
}
function mount(){
  queued=false;const ctx=context();
  if(ctx.loading){placeLeft();return;}
  if(currentKey&&currentKey!==ctx.key){
    if(left&&left.id!==ctx.id)closeLeft();
    if(right?.open&&right.dataset.pdfExam!==ctx.id)closeRight();
  }currentKey=ctx.key;
  if(left&&(!left.panel.isConnected||!ctx.host?.contains(left.panel))){if(ctx.id===left.id)openLeft(left.id,left.opener,true);else closeLeft();}
  placeLeft();if(right?.open)dock.refresh();
  const target=ctx.host?.querySelector('.exam-footer .actions,.question-nav .nav-left')||ctx.host?.querySelector('.question-nav,.exam-welcome-actions,.exam-paper .actions');
  if(target&&originalPdfs[ctx.id]&&!target.querySelector('.original-pdf-actions'))target.append(actions(ctx.id));
  const welcome=ctx.host?.querySelector('.exam-paper');
  if(location.hash.startsWith('#welkom/')&&welcome&&originalPdfs[ctx.id]&&!welcome.querySelector('.original-pdf-actions'))welcome.append(actions(ctx.id));
  document.querySelectorAll('#exam-app a.exam-name').forEach(link=>{
    const href=link.getAttribute('href'),m=href?.match(/^#(welkom|tentamen|inzage)\/([^/]+)/);if(!m)return;
    const id=m[1]==='welkom'?m[2]:CafaExams.getQuestionContext(m[2])?.exam.id;
    if(originalPdfs[id]&&!link.parentElement.querySelector('.original-pdf-actions'))link.parentElement.append(actions(id,true));
  });
  updatePressed();
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(mount);}}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-cirrus-float],[data-exam-action="section"],[data-practice-case]')&&left)closeLeft();
  const close=event.target.closest('[data-pdf-close]');if(close){if(close.dataset.pdfClose==='questions')closeLeft();else closeRight();return;}
  if(event.target.closest('[data-pdf-assistant]')){window.StudyAssistant?.resume();return;}
  const button=event.target.closest('[data-original-pdf]');if(!button||button.disabled)return;
  if(button.dataset.originalPdf==='questions')openLeft(button.dataset.pdfExam,button);else openRight(button.dataset.pdfExam,button);
},true);
// Keep the source PDF visible until the introductory Continue action is accepted.
window.addEventListener('cafa:assistant-start',event=>{
  const closed=right?.open?new Promise(resolve=>right.addEventListener('close',resolve,{once:true})):null;
  closeRight();if(closed)event.detail?.waitUntil?.(closed);
});
window.addEventListener('hashchange',schedule);
window.addEventListener('resize',placeLeft);
document.addEventListener('scroll',placeLeft,true);
window.addEventListener('cafa:ready',schedule);
new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.target.matches?.('.question')))schedule();}).observe(document.getElementById('app-content'),{childList:true,subtree:true});
mount();

// Source references use the same document dock as the original exam PDFs.
export async function openSource(id,page,opener){
  if(!originalPdfs[id])return;
  await openRight(id,opener,true);
  const box=viewers.get(id+':solutions'),frame=box?.querySelector('iframe');
  if(!frame)return;
  const target=Math.max(1,Number(page)||1),go=()=>frame.contentWindow?.CafaPdfReader?.goToPage(target);
  if(frame.contentWindow?.CafaPdfReader?.ready)go();
  else {const cleanup=()=>window.removeEventListener('message',ready),ready=event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data!=='belre3:pdf-ready')return;cleanup();clearTimeout(timeout);if(right?.open&&right.dataset.pdfExam===id)go();};const timeout=setTimeout(cleanup,30000);window.addEventListener('message',ready);}
}
