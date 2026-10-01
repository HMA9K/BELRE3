import {completionStep,readingStepUrl} from './summary-sequence.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const readers=new WeakMap();
const outlines=new WeakSet();

export function readingOutline(college,topic){
  const number=college.topics.findIndex(item=>item.id===topic.id)+1;
  return {number,title:number+'. '+topic.title,sections:topic.sections.map((section,index)=>{
    const sectionNumber=number+'.'+(index+1);let paragraphNumber=0,parentId='';
    return {id:section.id,number:sectionNumber,title:section.title.replace(/^\d+\.\s*/,''),
      paragraphs:(section.readingGuide?.paragraphs||[]).map((paragraph,i)=>{
        const id='reading-'+section.id+'-'+(i+1),example=paragraph.tone==='example';if(!example){paragraphNumber++;parentId=id;}
        return {id,number:example?null:sectionNumber+'.'+paragraphNumber,parentNumber:sectionNumber+(paragraphNumber?'.'+paragraphNumber:''),parentId,title:paragraph.heading,example};
      })};
  }),trees:(topic.decisionTrees||[]).map((tree,index)=>({id:'decision-'+tree.id,number:index+1,title:tree.title}))};
}

export function readingNavigationTarget(outline,id,sectionId){
  const section=outline.sections.find(item=>item.id===sectionId),paragraph=section?.paragraphs.find(item=>item.id===id);
  if(paragraph?.example)return paragraph.parentId||'section-'+section.id;
  if(id.startsWith('learning-'))return id;
  if(section&&!paragraph)return 'section-'+section.id;
  return id;
}

function sidebarHtml(college,topic,outline,app,colleges,sectionId){
  const sections=outline.sections.map(section=>{
    const active=section.id===sectionId;
    const paragraphs=section.paragraphs.filter(paragraph=>!paragraph.example).map(paragraph=>'<li><button type="button" data-reading-jump="'+esc(paragraph.id)+'"><span>'+esc(paragraph.number)+'</span> '+esc(paragraph.title)+'</button></li>').join('');
    const phases=active?[...app.querySelectorAll('[data-learning-phase]')].map(phase=>{
      const heading=phase.querySelector('h4');
      return '<li><button type="button" class="summary-nav-stage-title" data-reading-jump="'+esc(heading.id)+'">'+esc(({understand:'Begrijpen',foundation:'Onderbouwen',apply:'Toepassen',practice:'Zelf oefenen'})[phase.dataset.learningPhase])+'</button>'+(phase.dataset.learningPhase==='understand'?'<ol>'+paragraphs+'</ol>':'')+'</li>';
    }).join('')+'<li><button type="button" data-reading-jump="learning-'+esc(section.id)+'-sources">Wetsartikelen en bronnen</button></li>':'';
    return '<li class="summary-nav-section'+(active?' summary-nav-section-current':'')+'" data-reading-group="'+esc(section.id)+'">'+(active?'<button type="button" data-reading-jump="section-'+esc(section.id)+'"><span>'+esc(section.number)+'</span> '+esc(section.title)+'</button>':'<a href="'+readingStepUrl({topicId:topic.id,sectionId:section.id})+'"><span>'+esc(section.number)+'</span> '+esc(section.title)+'</a>')+(active?'<ol class="summary-nav-paragraphs" aria-label="Details van '+esc(section.number)+'">'+phases+'</ol>':'')+'</li>';
  }).join('');
  const trees=outline.trees.length?'<div class="summary-nav-trees"><button type="button" data-reading-jump="summary-routes-title" class="summary-nav-stage-title">Beslisbomen</button><ol aria-label="Beslisbomen bij dit onderwerp">'+outline.trees.map(tree=>'<li><button type="button" data-reading-jump="'+esc(tree.id)+'"><small>Beslisboom '+tree.number+'</small>'+esc(tree.title)+'</button></li>').join('')+'</ol></div>':'';
  const stages=[['summary-exam-coverage','Tentamenoefening'],['summary-recall-title','Herhaling van het college']].filter(([id])=>app.querySelector('#'+id)).map(([id,title])=>'<button type="button" data-reading-jump="'+id+'">'+title+'</button>').join('');
  const finishing=sectionId===completionStep;
  const completion=(finishing?'<button type="button" data-reading-jump="summary-completion-title">Afronding van dit onderwerp</button><div class="summary-nav-stages">'+trees+stages+'</div>':'<a href="'+readingStepUrl({topicId:topic.id,sectionId:completionStep})+'">Afronding van dit onderwerp</a>');
  return colleges.map(group=>'<div class="summary-nav-college-group"><p class="summary-nav-college">'+esc(group.label)+'</p><ol class="summary-nav-topics">'+group.topics.map((item,index)=>'<li'+(item.id===topic.id?' class="summary-nav-topic-current"':'')+'><a class="summary-nav-topic" href="#pagina/sam/'+esc(item.id)+'"'+(item.id===topic.id?' aria-current="page"':'')+'><span>'+(index+1)+'.</span> '+esc(item.title)+'</a>'+(item.id===topic.id?'<ol class="summary-nav-sections" aria-label="Subonderwerpen bij '+esc(item.title)+'">'+sections+'</ol>'+completion:'')+'</li>').join('')+'</ol></div>').join('');
}

// Only visible headings participate. The last heading above the reading line
// remains current until the following heading reaches it.
export function readingLocation(headings,line){
  const visible=headings.filter(heading=>heading.visible);
  return visible.filter(heading=>heading.top<=line).at(-1)||visible[0]||null;
}

export function mountReadingNavigation(app,college,topic,colleges=[college],sectionId=topic.sections[0].id){
  if(readers.has(app)){readers.get(app).update(college,topic,colleges,sectionId);return;}
  let outline,selected='',pending=0;
  const active=()=>location.hash.startsWith('#pagina/sam')&&!app.dataset.renderedDecision&&app.getClientRects().length>0;
  function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
  function sidebar(){
    const target=document.querySelector('[data-summary-outline]');if(!target||!outline)return;
    if(!outlines.has(target)){target.addEventListener('click',event=>readers.get(document.querySelector('#pg-sam [data-summary-app]'))?.jump(event));outlines.add(target);}
    const key=topic.id+'/'+sectionId;
    if(target.dataset.readingKey===key)return;
    target.dataset.readingKey=key;
    target.innerHTML=sidebarHtml(college,topic,outline,app,colleges,sectionId);
  }
  function jump(event){
    const button=event.target.closest('[data-reading-jump]');if(!button)return;
    const heading=app.querySelector('#'+button.dataset.readingJump);if(!heading)return;
    let parent=heading.parentElement;while(parent&&parent!==app){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    if(innerWidth<=1100)document.querySelector('[data-nav-close]')?.click();
    heading.focus({preventScroll:true});
    const scale=window.StudyScale?.get()||1;
    const toolbarHeight=document.querySelector('.belre-page-toolbar')?.getBoundingClientRect().height||58;
    const barHeight=app.querySelector('[data-reading-context]')?.getBoundingClientRect().height||46*scale;
    window.scrollTo({top:Math.max(0,scrollY+heading.getBoundingClientRect().top-toolbarHeight-barHeight-18*scale),behavior:'instant'});
    schedule();
  }
  function sync(){
    pending=0;
    const target=document.querySelector('[data-summary-outline]');
    const fallback=document.querySelector('[data-summary-colleges]');
    if(!active()){if(target&&(!location.hash.startsWith('#pagina/sam')||app.dataset.renderedDecision))target.hidden=true;if(fallback)fallback.hidden=false;return;}
    sidebar();if(target)target.hidden=false;
    if(fallback)fallback.hidden=true;
    const scale=window.StudyScale?.get()||1;
    const toolbar=document.querySelector('.belre-page-toolbar'),bar=app.querySelector('[data-reading-context]');
    const toolbarHeight=toolbar?.getBoundingClientRect().height||58;
    app.style.setProperty('--summary-sticky-top',toolbarHeight/scale+'px');
    const topicHeading=app.querySelector('#summary-topic-title');
    if(bar)bar.hidden=!topicHeading||topicHeading.getBoundingClientRect().bottom>toolbarHeight;
    const barHeight=bar?.getBoundingClientRect().height||46*scale;
    app.style.setProperty('--summary-reading-offset',(toolbarHeight+barHeight+18)/scale+'px');
    const headings=[...app.querySelectorAll('[data-summary-location]')].map(element=>({element,top:element.getBoundingClientRect().top,visible:element.getClientRects().length>0}));
    const current=readingLocation(headings,toolbarHeight+barHeight+30);
    if(!current)return;
    const element=current.element,id=element.id,label=element.dataset.summaryLocation;
    if(selected===id)return;selected=id;
    if(bar){
      const display=({'summary-topic-title':'Inleiding','summary-routes-title':'Artikelroutes','summary-exam-coverage':'Tentamenoefening','summary-recall-title':'Herhaling van het college'})[id]||label;
      bar.querySelector('[data-reading-context-title]').textContent=display;bar.dataset.section=element.dataset.readingSection||'';bar.title=college.label+' › '+topic.title+' › '+display;bar.setAttribute('aria-label',bar.title);
    }
    if(target){
      const navId=readingNavigationTarget(outline,id,element.dataset.readingSection);
      for(const button of target.querySelectorAll('[data-reading-jump]')){
        const isCurrent=button.dataset.readingJump===navId;
        if(isCurrent)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
      }
      for(const group of target.querySelectorAll('[data-reading-group]'))group.classList.toggle('summary-nav-section-current',group.dataset.readingGroup===element.dataset.readingSection);
      const currentButton=target.querySelector('[aria-current="location"]'),nav=target.closest('#belre-site-nav');
      if(innerWidth>1100&&currentButton&&nav&&currentButton.getClientRects().length){
        const itemRect=currentButton.getBoundingClientRect(),navRect=nav.getBoundingClientRect();
        if(itemRect.top<navRect.top+16)nav.scrollTop+=itemRect.top-navRect.top-16;
        else if(itemRect.bottom>navRect.bottom-20)nav.scrollTop+=itemRect.bottom-navRect.bottom+20;
      }
    }
  }
  function update(nextCollege,nextTopic,nextColleges,nextSectionId){college=nextCollege;topic=nextTopic;colleges=nextColleges;sectionId=nextSectionId;outline=readingOutline(college,topic);selected='';schedule();}
  readers.set(app,{update,jump});
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  window.addEventListener('belre:navigation',schedule);app.addEventListener('toggle',schedule,true);
  update(college,topic,colleges,sectionId);
}
