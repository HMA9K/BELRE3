/** A persistent host keeps the assistant and in-flight replies alive across environments. */
export function createNavigation(onChange){
  const main=document.createElement('div');main.id='belre-main';
  for(const child of [...document.body.childNodes])main.append(child);
  document.body.append(main);
  // The course banner stays full width; only the page below it shares the sidebar.
  const pages=document.createElement('div');pages.id='belre-page-content';
  const firstPage=main.querySelector('.pg');if(firstPage)firstPage.before(pages);
  for(const page of main.querySelectorAll('.pg'))pages.append(page);
  let frame=null,courseOpen=false;
  const originalPage=window.sp;
  function showCourse(hash){
    courseOpen=true;main.hidden=true;document.body.classList.add('belre-course-open');
    if(!frame){frame=document.createElement('iframe');frame.id='belre-course-frame';frame.title='BELRE3 oefen- en tentamenomgeving';frame.src='/oefenen/?ingebed=1'+hash;frame.addEventListener('load',()=>{connect();onChange();});document.body.append(frame);}
    else {frame.hidden=false;if(frame.contentWindow.location.hash!==hash)frame.contentWindow.location.replace(frame.contentWindow.location.href.split('#')[0]+hash);}
    onChange();
  }
  function showPage(id){courseOpen=false;main.hidden=false;if(frame)frame.hidden=true;document.body.classList.remove('belre-course-open');originalPage(id);onChange();}
  function urlFor(hash){return '#omgeving/'+encodeURIComponent(hash.replace(/^#/,''));}
  function navigateCourse(hash){const next=urlFor(hash);if(location.hash===next)showCourse(hash);else location.hash=next;}
  function connect(){
    const w=frame.contentWindow,d=w.document;
    // A frame navigation already creates a browser-history entry. Mirror its URL
    // in that entry rather than creating a second step for the same page.
    w.addEventListener('hashchange',()=>{if(!courseOpen)return;const next=urlFor(w.location.hash);if(location.hash!==next)history.replaceState(null,'',next);document.title=d.title;onChange();});
    d.addEventListener('click',e=>{
      const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target==='_blank')return;
      const u=new URL(a.href,d.baseURI);
      if(u.origin===location.origin&&['/','/index.html'].includes(u.pathname)){e.preventDefault();if(u.hash.startsWith('#pagina/')){main.hidden=false;location.hash=u.hash;route();}else window.sp('home');}
    });
    const announce=()=>onChange();
    d.addEventListener('input',announce);d.addEventListener('change',announce);d.addEventListener('click',()=>setTimeout(announce,0));
    w.addEventListener('cafa:ready',announce);w.addEventListener('cafa:practice-change',announce);
    w.BelreAssistantHost={open:()=>window.BelreAssistant?.open(),close:()=>window.BelreAssistant?.close(),get isOpen(){return document.body.classList.contains('belre-assistant-open');}};
    function questionButton(){
      const host=d.querySelector('#mc-app:not([hidden]) .belre-check-actions,#exam-app:not([hidden]) .exam-answer-actions');
      if(host&&!host.querySelector('[data-belre-assistant]')){const button=d.createElement('button');button.type='button';button.className='btn belre-assistant-question';button.dataset.belreAssistant='';button.textContent='BELRE3 Assistent';host.append(button);}
    }
    d.addEventListener('click',e=>{if(e.target.closest('[data-belre-assistant]'))w.BelreAssistantHost.open();});
    const app=d.getElementById('app-content');if(app)new MutationObserver(()=>{questionButton();onChange();}).observe(app,{childList:true,subtree:true});
    questionButton();
  }
  function route(){
    if(location.hash.startsWith('#omgeving/')){let hash;try{hash='#'+decodeURIComponent(location.hash.slice(10));}catch{hash='#start';}showCourse(hash);}
    else if(location.hash.startsWith('#pagina/')){const [id,section]=location.hash.slice(8).split('/');showPage(document.getElementById('pg-'+id)?id:'home');if(id==='sam'&&!document.querySelector('#pg-sam [data-summary-app]')&&section&&/^c(?:12|3|45|67|8|9)(?:-[a-z]+)?$/.test(section)){document.querySelector('[data-college="'+section.split('-')[0]+'"]')?.click();document.querySelector('[data-topic="'+section+'"]')?.click();}if(id==='sam')window.dispatchEvent(new Event('belre:summary-route'));}
    else showPage('home');
    onChange();
  }
  window.sp=id=>{if(!document.getElementById('pg-'+id))return;showPage(id);const next=id==='home'?'#pagina/home':'#pagina/'+id;if(location.hash!==next)history.pushState(null,'',next);};
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target==='_blank')return;
    const u=new URL(a.href,location.href);if(u.origin===location.origin&&/^\/oefenen\/?(?:index\.html)?$/.test(u.pathname)){e.preventDefault();navigateCourse(u.hash||'#start');}
  });
  window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
  if(!location.hash)history.replaceState(null,'','#pagina/home');
  route();
  return {get window(){return courseOpen&&frame?.contentWindow?.BelrePractice?frame.contentWindow:window;},get courseWindow(){return frame?.contentWindow;},get loading(){return courseOpen&&!frame?.contentWindow?.BelrePractice;},get inCourse(){return courseOpen;},get inPractice(){return courseOpen&&/^#mc(?:\/|$)/.test(frame?.contentWindow?.location.hash||'');},get inExam(){return courseOpen&&/^#(?:dashboard|welkom|tentamen|inzage|mc-inzage)(?:\/|$)/.test(frame?.contentWindow?.location.hash||'');},setInert(value){main.inert=value;if(frame)frame.inert=value;},navigateCourse};
}
