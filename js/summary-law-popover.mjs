import data from './summary-data.mjs?v=20261001-law2';
import {articleReferences,articleNumbers,selectLaw} from './summary-law-core.mjs?v=20261001-law2';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lawsPromise,popup,opener,current,expanded=false,selectedArticle,request=0;
const load=()=>lawsPromise??=fetch(new URL('./summary-law.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('bron');return r.json();}).catch(e=>{lawsPromise=null;throw e;});
const sectionFor=button=>{
  const treeId=button.closest('[data-summary-tree]')?.dataset.summaryTree;
  if(treeId)return data.colleges.flatMap(c=>c.topics.flatMap(t=>t.decisionTrees||[])).find(tree=>tree.id===treeId);
  const recallId=button.closest('[data-summary-recall]')?.dataset.summaryRecall;
  const sectionId=button.closest('[data-summary-section]')?.dataset.summarySection||button.closest('[data-summary-exam-example]')?.dataset.summaryExamExample;
  return recallId?data.colleges.flatMap(c=>c.remember).find(point=>point.id===recallId):data.colleges.flatMap(c=>c.topics.flatMap(t=>t.sections)).find(s=>s.id===sectionId);
};
const allReferences=data.colleges.flatMap(c=>c.topics.flatMap(t=>t.sections.flatMap(s=>s.articles)));
function marked(text,ranges){let result='',cursor=0;for(const [a,b] of ranges){result+=esc(text.slice(cursor,a))+'<mark>'+esc(text.slice(a,b))+'</mark>';cursor=b;}return result+esc(text.slice(cursor));}

/** Wrap a whole reference across inline emphasis; preserve source links and wording. */
export function linkSummaryArticles(app){
  const groups=new Set(),walker=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);
  const blockFor=node=>node.parentElement.closest('p,li,td,th,dt,dd,h2,h3,h4,h5,summary,div,section,article,aside,nav')||node.parentElement;
  while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement.closest('a,button,input,script,style'))groups.add(blockFor(node));}
  for(const group of groups){
    const nodes=[],walk=document.createTreeWalker(group,NodeFilter.SHOW_TEXT);let offset=0;
    while(walk.nextNode()){const node=walk.currentNode;nodes.push({node,start:offset,end:offset+node.length,eligible:blockFor(node)===group&&!node.parentElement.closest('a,button,input,script,style')});offset+=node.length;}
    // Keep nested blocks and existing controls out of both recognition and wrapping.
    const text=nodes.map(n=>n.eligible?n.node.data:'\uFFFC'.repeat(n.end-n.start)).join('');
    for(const ref of articleReferences(text).reverse()){
      const covered=nodes.filter(n=>n.end>ref.start&&n.start<ref.end);if(!covered.length||covered.some(n=>!n.eligible))continue;
      const first=covered[0],last=covered.at(-1),range=document.createRange();range.setStart(first.node,ref.start-first.start);range.setEnd(last.node,ref.end-last.start);
      const button=document.createElement('button');button.type='button';button.className='summary-article-ref';button.dataset.summaryLaw=JSON.stringify(ref);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.append(range.extractContents());range.insertNode(button);
    }
  }
}
function ensure(){if(popup)return;popup=document.createElement('div');popup.id='belre-law-popover';popup.className='belre-law-popover';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');popup.setAttribute('aria-labelledby','belre-law-title');popup.tabIndex=-1;popup.setAttribute('popover','manual');document.body.append(popup);}
function position(){
  if(!popup||popup.hidden||!opener)return;
  if(!opener.isConnected||!opener.getClientRects().length){close(false);return;}
  const rects=opener.getClientRects(),r=rects[rects.length-1],v=window.visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight,x=v?.offsetLeft||0,y=v?.offsetTop||0;
  if(r.bottom<y||r.top>y+h){close(false);return;}
  const width=Math.min(430,w-24),left=Math.min(Math.max(x+12,r.left),x+w-width-12),below=y+h-r.bottom-21,above=r.top-y-21;
  const useAbove=below<160&&above>below,room=Math.max(100,useAbove?above:below);
  popup.style.width=width+'px';popup.style.maxHeight=Math.min(expanded?500:340,room)+'px';popup.style.left=left+'px';
  popup.style.top=(useAbove?Math.max(y+12,r.top-popup.getBoundingClientRect().height-9):r.bottom+9)+'px';
}
function close(restore=true){if(!popup||popup.hidden)return;request++;const old=opener;opener=null;old?.setAttribute('aria-expanded','false');try{popup.hidePopover?.();}catch{}popup.hidden=true;if(restore&&old?.isConnected)old.focus({preventScroll:true});}
function render(catalog){
  const ref=current.ref,article=selectedArticle,law=ref.law==='Vpb'?catalog[article]:null;
  const heading='Art. '+article+' '+(ref.law==='Vpb'?'Wet Vpb 1969':ref.law==='IB'?'Wet IB 2001':ref.law)+(ref.part?' · '+ref.part:'');
  let content,source='',footer='';
  if(law){
    const section=current.section,refs=[...(section?.articles||[]),...(data.legalHighlights||[])].filter(a=>a.article===article);
    const selection=selectLaw(law,ref.part,refs,current.context,allReferences.filter(a=>a.article===article));
    const hasMarks=expanded?selection.ranges.length>0:selection.rows.some(r=>r.ranges.length);
    content='<p class="belre-law-legend">'+(hasMarks?'<mark>Gearceerd</mark> = kern voor deze verwijzing.':'Voor deze verwijzing is nog geen afzonderlijke kernarcering vastgelegd.')+'</p><div class="belre-law-quote">'+
      (expanded?marked(law.text,selection.ranges):selection.rows.map(r=>marked(r.text,r.ranges)).join('\n'))+'</div>';
    const sourceData=data.sources[law.sourceId];
    source='<a target="_blank" rel="noopener" href="/oefenen/content/'+esc(sourceData.url)+'#page='+law.pdfPages[0]+'">Studiekopie Wet Vpb · p. '+law.pdfPages.join(', ')+' · 24-05-2026</a>';
    footer='<button type="button" data-law-full aria-expanded="'+expanded+'">'+(expanded?'Relevante passage':'Volledig artikel')+'</button>';
  }else{
    content='<p>De letterlijke tekst van '+esc(heading)+' ontbreekt in het aangeleverde wetboek. Daarom wordt hier geen wettekst of arcering getoond.</p>';
    const refs=current.section?.sourceRefs||[];
    const slides=refs.filter(r=>/college|slides/i.test(data.sources[r.sourceId]?.title||''));
    source=(slides.length?slides:refs).slice(0,2).map(r=>'<a target="_blank" rel="noopener" href="/oefenen/content/'+esc(data.sources[r.sourceId].url)+'#page='+r.pdfPages[0]+'">'+esc(data.sources[r.sourceId].title.replace(/\.pdf$/i,''))+' · p. '+r.pdfPages.join(', ')+'</a>').join('<br>');
  }
  const numbers=articleNumbers(ref,ref.law==='Vpb'?catalog:{});
  popup.innerHTML='<header><div><h2 id="belre-law-title">'+esc(heading)+'</h2><p>'+(law?'Letterlijke wettekst':'Brontekst ontbreekt')+'</p></div><button type="button" data-law-close aria-label="Wetsartikel sluiten">×</button></header>'+
    (numbers.length>1?'<nav aria-label="Artikelen in deze verwijzing">'+numbers.map(n=>'<button type="button" data-law-select="'+esc(n)+'" aria-pressed="'+(n===article)+'">Art. '+esc(n)+'</button>').join('')+'</nav>':'')+
    '<div class="belre-law-content">'+content+'</div><footer><span>'+source+'</span>'+footer+'</footer>';
  position();
  const contentBox=popup.querySelector('.belre-law-content'),firstMark=contentBox.querySelector('.belre-law-quote mark');
  if(current.ref.part&&firstMark&&contentBox.scrollHeight>contentBox.clientHeight)contentBox.scrollTop=Math.max(0,firstMark.offsetTop-contentBox.offsetTop-contentBox.clientHeight/2);
}
async function open(button){
  ensure();if(opener===button&&!popup.hidden){close();return;}opener?.setAttribute('aria-expanded','false');opener=button;expanded=false;
  const section=sectionFor(button),ref=JSON.parse(button.dataset.summaryLaw);selectedArticle=ref.article;
  current={ref,section,context:button.closest('p,td,li')?.textContent||section?.title||''};
  if(button.getBoundingClientRect().bottom>innerHeight-350)button.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  const mine=++request;button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',popup.id);
  popup.hidden=false;popup.innerHTML='<div class="belre-law-content" role="status">Wettekst laden…</div>';
  try{popup.showPopover?.();}catch{popup.removeAttribute('popover');}position();
  try{const catalog=await load();if(mine!==request||opener!==button)return;render(catalog);if(button.matches(':focus-visible'))popup.focus({preventScroll:true});}
  catch{if(mine===request)popup.innerHTML='<div class="belre-law-content"><p>De wettekst kon niet worden geladen. Sluit het venster en probeer opnieuw.</p><button type="button" data-law-close>Sluiten</button></div>';}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-summary-law]');if(button){event.preventDefault();open(button);return;}
  if(event.target.closest('[data-law-close]')){close();return;}
  if(popup&&!popup.hidden&&popup.contains(event.target)){
    const full=event.target.closest('[data-law-full]'),select=event.target.closest('[data-law-select]');
    if(full||select){if(full)expanded=!expanded;else{selectedArticle=select.dataset.lawSelect;expanded=false;}const mine=request,catalog=await load();if(mine!==request)return;render(catalog);popup.querySelector(full?'[data-law-full]':'[data-law-select="'+selectedArticle+'"]')?.focus({preventScroll:true});}return;
  }
  close(false);
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&popup&&!popup.hidden){event.preventDefault();event.stopPropagation();close();}},true);
window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
window.addEventListener('hashchange',()=>close(false));window.addEventListener('popstate',()=>close(false));
window.addEventListener('belre:navigation',()=>{if(opener&&!opener.isConnected)close(false);});
window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
