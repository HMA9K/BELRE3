// CAFA2 case-panel interaction, connected to BELRE3's existing question renderer.
const key='belre3-mc-case-panel-v1';
let width=100/3,open=true;
try{const saved=JSON.parse(sessionStorage.getItem(key)||'{}');if(Number.isFinite(saved.width))width=Math.max(25,Math.min(60,saved.width));if(typeof saved.open==='boolean')open=saved.open;}catch{}
function save(){try{sessionStorage.setItem(key,JSON.stringify({width,open}));}catch{}}
export function mountMcCase(question){
  const layout=question.querySelector('.practice-case-layout'),panel=layout?.querySelector('.exam-case-panel'),handle=layout?.querySelector('.exam-case-resizer');
  if(!panel||!handle)return;
  const controls=question.querySelectorAll('[data-practice-case]');
  function paint(){
    layout.style.setProperty('--case-width',width+'%');layout.classList.toggle('is-case-hidden',!open);
    panel.hidden=!open;handle.hidden=!open;handle.setAttribute('aria-valuenow',String(Math.round(width)));
    controls.forEach(button=>button.setAttribute('aria-expanded',String(open)));
  }
  controls.forEach(button=>button.addEventListener('click',()=>{open=!open;paint();save();}));
  handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();handle.setPointerCapture(event.pointerId);layout.classList.add('is-resizing');});
  handle.addEventListener('pointermove',event=>{if(!layout.classList.contains('is-resizing'))return;const rect=layout.getBoundingClientRect();width=Math.max(25,Math.min(60,100*(event.clientX-rect.left)/rect.width));paint();});
  function stop(){layout.classList.remove('is-resizing');save();}
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>handle.addEventListener(name,stop));
  handle.addEventListener('keydown',event=>{let next=width;if(event.key==='ArrowLeft')next-=5;else if(event.key==='ArrowRight')next+=5;else if(event.key==='Home')next=25;else if(event.key==='End')next=60;else return;event.preventDefault();width=Math.max(25,Math.min(60,next));paint();save();});
  paint();
}
