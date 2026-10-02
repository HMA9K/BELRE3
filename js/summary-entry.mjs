// Load the lesson bank only when a lesson or the decision directory is opened.
let loading;
function loadSummary(){
  if(!/^#pagina\/(?:sam|beslisbomen)(?:\/|$)/.test(location.hash))return;
  if(!loading)loading=import('./summary.mjs?v=20261002-align1').catch(()=>{
    loading=null;
    const host=document.querySelector('.pg.vis [data-summary-app],.pg.vis [data-summary-decision-directory]');
    if(host){
      host.replaceChildren();
      const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='De leerstof kon niet worden geladen.';
      const retry=document.createElement('button');retry.type='button';retry.textContent='Opnieuw proberen';retry.addEventListener('click',()=>location.reload(),{once:true});
      host.append(message,retry);
    }
  });
}
for(const event of ['belre:navigation','belre:summary-route','hashchange','popstate'])window.addEventListener(event,loadSummary);
loadSummary();
