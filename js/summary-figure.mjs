const esc=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const positions={moeder:[400,48,126,54],leverancier:[67,183,104,70],fabriek:[268,183,122,68],winkel:[530,183,122,68],afnemer:[735,183,104,70],'derde-fabriek':[268,393,148,70],'derde-winkel':[530,393,148,70],verrekenprijs:[400,133,144,46]};
const lines=[
  ['moeder-fabriek','M 400 76 V 112 H 268 V 149','ownership'],
  ['moeder-winkel','M 400 76 V 112 H 530 V 149','ownership'],
  ['aanvoer','M 120 183 H 207','trade'],
  ['concernverkoop','M 330 183 H 468','controlled'],
  ['wederverkoop','M 592 183 H 681','trade'],
  ['interne-verkoop','M 298 218 L 500 356','comparison'],
  ['interne-inkoop','M 298 356 L 500 218','comparison'],
  ['derdenverkoop','M 344 393 H 454','comparison']
];

export function validateInteractiveFigure(model){
  if(!['transfer-pricing','annotated-diagram'].includes(model.kind))throw Error('Onbekend interactief schema');
  const annotated=model.kind==='annotated-diagram',zones=new Map((model.zones||[]).map(zone=>[zone.id,zone]));
  if(annotated){
    if(!zones.size||zones.size!==model.zones.length)throw Error('Schema mist unieke klikgebieden');
    for(const zone of zones.values())if(!zone.id||zone.rect?.length!==4||zone.rect.some(value=>!Number.isFinite(value)||value<0)||zone.rect[2]<=0||zone.rect[3]<=0||zone.rect[0]+zone.rect[2]>100||zone.rect[1]+zone.rect[3]>100)throw Error('Klikgebied valt buiten de tekening: '+zone.id);
  }
  const choices=new Set(),edgeIds=new Set(lines.map(([id])=>id));
  for(const choice of model.choices){
    if(choices.has(choice.id)||!choice.id||!choice.title||!choice.text||!choice.facts?.length)throw Error('Onvolledige schema-uitleg: '+choice.id);
    choices.add(choice.id);
    if(!['party','transaction','method','flow','rule','concept','step'].includes(choice.type)||!choice.label||choice.facts.some(fact=>!fact.label||!fact.text))throw Error('Onvolledig schema-onderdeel: '+choice.id);
    if(!choice.actors?.length||!Array.isArray(choice.edges)||choice.actors.some(id=>annotated?!zones.has(id):!positions[id])||choice.edges.some(id=>!edgeIds.has(id)))throw Error('Schema verwijst naar onbekende partij of pijl: '+choice.id);
  }
  if(!choices.has(model.defaultChoice)||[...(annotated?zones.keys():Object.keys(positions))].some(id=>!choices.has(id)))throw Error('Schema mist een klikbaar onderdeel');
  if(!model.sourceRefs?.length||!model.sourceNote||!model.intro)throw Error('Schemabron ontbreekt');
}

function explanation(choice){
  return '<span class="tp-detail-kind">'+({party:'Partij',method:'Vergelijkingsmethode',transaction:'Concerntransactie',flow:'Geldstroom',rule:'Fiscale regel',concept:'Begrip',step:'Rekenstap'}[choice.type])+'</span><h5>'+esc(choice.title)+'</h5><p>'+esc(choice.text)+'</p>'+(choice.formula?'<p class="tp-formula">'+esc(choice.formula)+'</p>':'')+'<dl>'+choice.facts.map(fact=>'<div><dt>'+esc(fact.label)+'</dt><dd>'+esc(fact.text)+'</dd></div>').join('')+'</dl>';
}
const figureId=sectionId=>'tp-'+sectionId;
function annotatedFigureHtml(section,sourceLink,original,caption){
  const figure=section.figure,model=figure.interactive,id=figureId(section.id),initial=model.choices.find(choice=>choice.id===model.defaultChoice);
  const button=(choice,index,zone)=>'<button type="button" data-tp-choice="'+esc(choice.id)+'" aria-pressed="'+(choice===initial)+'" aria-controls="'+esc(id)+'-detail"'+(zone?' class="diagram-hotspot" data-diagram-zone="'+esc(zone.id)+'" aria-label="'+esc(choice.label)+'" style="left:'+zone.rect[0]+'%;top:'+zone.rect[1]+'%;width:'+zone.rect[2]+'%;height:'+zone.rect[3]+'%"':'')+'><span class="diagram-index">'+(index+1)+'</span>'+(zone?'':' '+esc(choice.label))+'</button>';
  return '<figure class="summary-slide-figure summary-interactive-figure summary-annotated-figure" data-summary-figure="'+esc(section.id)+'"><h4>'+esc(figure.title)+'</h4><p class="diagram-context"><strong>Hoort bij:</strong> '+esc(section.title.replace(/^\d+\.\s*/,''))+'</p><p class="tp-guide">'+esc(model.intro)+'</p><p class="tp-scroll-hint">Schuif de tekening opzij of kies een onderdeel met de knoppen eronder.</p><div class="diagram-scroll" tabindex="0" aria-label="Interactief schema met klikbare onderdelen, horizontaal scrollbaar"><div class="diagram-stage"><img src="'+esc(figure.image)+'" alt="'+esc(figure.alt)+'" loading="lazy" width="1600" height="900">'+model.zones.map(zone=>{const index=model.choices.findIndex(choice=>choice.id===zone.id);return button(model.choices[index],index,zone);}).join('')+'</div></div><div class="tp-methods" role="group" aria-label="Kies een onderdeel van dit schema">'+model.choices.map((choice,index)=>button(choice,index)).join('')+'</div><div class="tp-detail" id="'+esc(id)+'-detail" data-tp-detail aria-live="polite" aria-atomic="true">'+explanation(initial)+'</div><figcaption class="tp-sources">'+sourceLink(model.sourceRefs[0],'Collegeslides bij dit schema')+'<details><summary>Oorspronkelijke slide en bronafbakening</summary><p>'+esc(model.sourceNote)+'</p>'+original+caption+'</details></figcaption></figure>';
}
export function summaryFigureHtml(section,sourceLink){
  const figure=section.figure;if(!figure)return '';
  const original='<a href="'+esc(figure.image)+'" target="_blank" rel="noopener" aria-label="Vergroot: '+esc(figure.title)+'"><img src="'+esc(figure.image)+'" alt="'+esc(figure.alt)+'" loading="lazy" width="1600" height="900"></a>';
  const caption='<p>'+esc(figure.explanation)+'</p>'+sourceLink(figure,'Collegeslide')+' · <a href="'+esc(figure.image)+'" target="_blank" rel="noopener">Vergroten</a>';
  if(!figure.interactive)return '<figure class="summary-slide-figure"><h4>'+esc(figure.title)+'</h4>'+original+'<figcaption>'+caption+'</figcaption></figure>';
  if(figure.interactive.kind==='annotated-diagram')return annotatedFigureHtml(section,sourceLink,original,caption);
  const model=figure.interactive,id=figureId(section.id),initial=model.choices.find(choice=>choice.id===model.defaultChoice);
  const button=choice=>'<button type="button" data-tp-choice="'+esc(choice.id)+'" aria-pressed="'+(choice===initial)+'" aria-controls="'+esc(id)+'-detail">'+esc(choice.label)+'</button>';
  return '<figure class="summary-slide-figure summary-interactive-figure" data-summary-figure="'+esc(section.id)+'"><h4>'+esc(figure.title)+'</h4><p class="tp-guide">'+esc(model.intro)+'</p><div class="tp-legend"><span class="tp-legend-concern">Onderdeel van concern M</span><span class="tp-legend-independent">Onafhankelijke partij</span><span class="tp-legend-arrow">Pijlen: leveringen; bovenste lijnen: concernverhouding</span></div><p class="tp-scroll-hint">Op een smal scherm kun je het schema opzij schuiven. De uitleg en methodeknoppen blijven hieronder zichtbaar.</p><div class="tp-scroll" tabindex="0" aria-label="Interactief verrekenprijsschema, horizontaal scrollbaar"><div class="tp-stage"><svg viewBox="0 0 800 460" aria-hidden="true" focusable="false"><defs><marker id="'+esc(id)+'-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>'+lines.map(([edge,path,type])=>'<path data-tp-edge="'+edge+'" class="tp-line tp-line-'+type+'" d="'+path+'"'+(type==='ownership'?'':' marker-end="url(#'+esc(id)+'-arrow)"')+'/>').join('')+'<text x="164" y="143" text-anchor="middle">Cost +</text><text x="631" y="143" text-anchor="middle">Resale −</text><text x="181" y="290" text-anchor="middle">Interne CUP</text><text x="620" y="290" text-anchor="middle">Interne CUP</text><text x="400" y="362" text-anchor="middle">Externe CUP</text></svg>'+model.choices.filter(choice=>positions[choice.id]).map(choice=>{const [x,y,w,h]=positions[choice.id];return '<div class="tp-actor tp-actor-'+esc(choice.group||choice.type)+'" data-tp-actor="'+esc(choice.id)+'" style="left:'+((x-w/2)/8)+'%;top:'+((y-h/2)/4.6)+'%;width:'+(w/8)+'%;height:'+(h/4.6)+'%">'+button(choice)+'</div>';}).join('')+'</div></div><div class="tp-methods" role="group" aria-label="Kies de vergelijking">'+model.choices.filter(choice=>choice.type==='method').map(button).join('')+'</div><div class="tp-detail" id="'+esc(id)+'-detail" data-tp-detail aria-live="polite" aria-atomic="true">'+explanation(initial)+'</div><figcaption class="tp-sources">'+sourceLink(model.sourceRefs[0],'Collegeslides bij dit schema')+'<details><summary>Oorspronkelijke slide en toelichting op de labels</summary><p>'+esc(model.sourceNote)+'</p>'+original+caption+'</details></figcaption></figure>';
}

function select(figure,model,id,linkArticles){
  const choice=model.choices.find(item=>item.id===id);if(!choice)return;
  figure.dataset.tpSelected=id;
  for(const button of figure.querySelectorAll('[data-tp-choice]'))button.setAttribute('aria-pressed',String(button.dataset.tpChoice===id));
  for(const actor of figure.querySelectorAll('[data-tp-actor]'))actor.classList.toggle('tp-active',choice.actors.includes(actor.dataset.tpActor)||actor.dataset.tpActor===id);
  for(const zone of figure.querySelectorAll('[data-diagram-zone]'))zone.classList.toggle('diagram-active',choice.actors.includes(zone.dataset.diagramZone));
  for(const line of figure.querySelectorAll('[data-tp-edge]'))line.classList.toggle('tp-active',choice.edges.includes(line.dataset.tpEdge));
  figure.querySelector('[data-tp-detail]').innerHTML=explanation(choice);
  linkArticles?.(figure.querySelector('[data-tp-detail]'));
}
export function mountSummaryFigures(app,sections,linkArticles){
  const models=new Map(sections.filter(section=>section.figure?.interactive).map(section=>[section.id,section.figure.interactive]));
  for(const figure of app.querySelectorAll('[data-summary-figure]')){
    const model=models.get(figure.dataset.summaryFigure);if(!model)continue;
    select(figure,model,model.defaultChoice,linkArticles);
    figure.addEventListener('click',event=>{const button=event.target.closest('[data-tp-choice]');if(button&&figure.contains(button))select(figure,model,button.dataset.tpChoice,linkArticles);});
  }
}
