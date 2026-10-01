import {decisionPath,decisionRewind} from './summary-decision-core.mjs?v=20261001-revisit1';
const esc=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const nodeLabel=node=>node.tone==='exception'?'Uitzondering':({decision:'Voorwaarden controleren',step:'Vervolgstap',outcome:'Conclusie'}[node.type]);
function card(node,active=false,revisitIndex=null,step=null){
  const completed=revisitIndex!==null;
  const title='<span>'+esc(node.title)+'</span>'+(completed?'<button type="button" class="decision-revisit" data-decision-revisit="'+revisitIndex+'" aria-label="Keuze bij stap '+(revisitIndex+1)+' opnieuw maken: '+esc(node.title)+'">Keuze wijzigen</button>':'');
  return '<div class="decision-node decision-'+node.type+(node.tone?' decision-'+node.tone:'')+(completed?' decision-completed" data-decision-step="'+revisitIndex:'')+'"><span class="decision-kind">'+(step?'Stap '+step+' · ':'')+nodeLabel(node)+'</span><h5'+(active?' tabindex="-1" data-decision-current':'')+'>'+title+'</h5><p>'+esc(node.text)+'</p>'+(node.nextTrees?.length?'<nav class="decision-reading" aria-label="Vervolgbeslisboom"><strong>Vervolg de artikelroute:</strong>'+node.nextTrees.map(tree=>'<button type="button" data-summary-jump="'+esc(tree.topicId)+'" data-summary-decision="'+esc(tree.id)+'">'+esc(tree.title)+' →</button>').join('')+'</nav>':'')+'</div>';
}
function overview(tree){
  const nodes=new Map(tree.nodes.map(node=>[node.id,node]));
  function branch(id,depth){
    const node=nodes.get(id);
    return '<div class="decision-overview-node">'+card(node)+((node.choices||[]).length?'<div class="decision-fork'+(depth===0?' decision-root-fork':'')+'">'+node.choices.map(choice=>'<div class="decision-branch"><span class="decision-edge">'+esc(choice.label)+' ↓</span>'+branch(choice.to,depth+1)+'</div>').join('')+'</div>':'')+'</div>';
  }
  return branch(tree.start,0);
}
export function decisionPathHtml(tree,labels){
  const path=decisionPath(tree,labels),current=path.at(-1).node;
  const nodes=new Map(tree.nodes.map(node=>[node.id,node]));
  const history=labels.length?'<section class="decision-history" aria-label="Eerdere keuzes"><h5>Eerdere keuzes ('+labels.length+') · klik om een keuze te wijzigen</h5><ol>'+path.slice(0,-1).map(({node,chosen},index)=>'<li><button type="button" data-decision-revisit="'+index+'"><span>'+esc(node.title)+'</span><strong>Jouw keuze: '+esc(chosen.label)+'</strong></button></li>').join('')+'</ol></section>':'';
  return '<div class="decision-path-toolbar"><span role="status">'+(current.type==='outcome'?'Uitkomst van deze beslisboom bereikt.':'Stap '+path.length+': '+(current.type==='step'?'voer deze vervolgstap uit.':'beantwoord de vraag hieronder.'))+'</span><div><button type="button" data-decision-back'+(!labels.length?' disabled':'')+'>Stap terug</button><button type="button" data-decision-reset'+(!labels.length?' disabled':'')+'>Opnieuw</button></div></div>'+history+'<div class="decision-chosen-path">'+card(current,true,null,path.length)+'</div>'+
    (current.choices?.length?'<div class="decision-choice-fork" role="group" aria-label="Antwoord op de huidige stap">'+current.choices.map(choice=>{const next=nodes.get(choice.to),kind=next.type==='decision'?'Vervolgvraag':next.type==='step'?'Vervolgstap':'Uitkomst';return '<button type="button" data-decision-choice="'+esc(choice.label)+'"><span class="decision-choice-label">'+esc(choice.label)+' <span aria-hidden="true">→</span></span><span class="decision-choice-kind">'+kind+' na deze keuze</span><span class="decision-choice-destination">'+esc(next.title)+'</span></button>';}).join('')+'</div>':'');
}

export function decisionTreesHtml(topic,sourceList){
  if(!topic.decisionTrees?.length)return '';
  return '<section class="summary-decision-trees" aria-labelledby="decision-trees-title"><h4 id="decision-trees-title">Welke artikelroute volg je?</h4><p class="decision-guide">Beantwoord steeds de vraag in het actieve blok. Ja of nee geldt alleen voor die vraag: een nee kan dus naar een andere voorwaarde leiden. De keuzevakken noemen vooraf de vervolgvraag, vervolgstap of uitkomst. Na je klik verschijnt die stap. Eerdere keuzes blijven zichtbaar en kun je wijzigen; de volledige boom staat apart hieronder.</p>'+topic.decisionTrees.map((tree,index)=>'<details class="summary-decision" data-summary-tree="'+esc(tree.id)+'"'+(index===0?' open':'')+'><summary><span class="decision-summary-label">Beslisboom '+(index+1)+'</span><span>'+esc(tree.title)+'</span></summary><div class="decision-content"><p class="decision-intro">'+esc(tree.intro)+'</p><div data-decision-path>'+decisionPathHtml(tree,[])+'</div>'+((tree.notes||[]).length?'<aside class="decision-notes"><h5>Let op bij deze route</h5>'+tree.notes.map(note=>'<p>'+esc(note)+'</p>').join('')+'</aside>':'')+'<details class="decision-full"><summary>Hele beslisboom bekijken</summary><p>Dit is het overzicht van alle mogelijke routes. Het staat los van je huidige keuzes hierboven.</p><div class="decision-overview">'+overview(tree)+'</div></details><nav class="decision-reading" aria-label="Uitleg bij de beslisboom"><strong>Bijbehorende uitleg:</strong>'+tree.sections.map(section=>'<button type="button" data-summary-jump="'+esc(section.topicId)+'" data-summary-open="'+esc(section.id)+'">'+esc(section.title)+'</button>').join('')+'</nav><details class="summary-sources"><summary>Collegeslides en wetsartikelen bij deze beslisboom</summary>'+sourceList(tree.sourceRefs)+'</details></div></details>').join('')+'</section>';
}

export function mountDecisionTrees(app,trees,linkArticles){
  const byId=new Map(trees.map(tree=>[tree.id,tree]));
  for(const root of app.querySelectorAll('[data-summary-tree]')){
    const tree=byId.get(root.dataset.summaryTree);let labels=[];
    root.addEventListener('click',event=>{
      const choice=event.target.closest('[data-decision-choice]'),back=event.target.closest('[data-decision-back]'),reset=event.target.closest('[data-decision-reset]');
      const revisit=event.target.closest('[data-decision-revisit]')||(!event.target.closest('a,button,input,select,textarea,summary,[role="button"]')?event.target.closest('[data-decision-step]'):null);
      if(!choice&&!back&&!reset&&!revisit)return;
      if(revisit)labels=decisionRewind(tree,labels,Number(revisit.dataset.decisionRevisit??revisit.dataset.decisionStep));else if(choice)labels.push(choice.dataset.decisionChoice);else if(back)labels.pop();else labels=[];
      const target=root.querySelector('[data-decision-path]');target.innerHTML=decisionPathHtml(tree,labels);linkArticles(target);
      const heading=target.querySelector('[data-decision-current]');heading?.focus({preventScroll:true});
      if(heading){const rect=heading.getBoundingClientRect();if(rect.top<100||rect.bottom>innerHeight-80)heading.scrollIntoView({block:'center',behavior:'instant'});}
    });
  }
}
