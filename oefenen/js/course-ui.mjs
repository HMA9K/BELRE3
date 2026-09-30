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
