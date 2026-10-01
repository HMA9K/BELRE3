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
  if(section&&!paragraph)return 'section-'+section.id;
  return id;
}

function sidebarHtml(college,outline,app){
  const sections=outline.sections.map(section=>'<li class="summary-nav-section" data-reading-group="'+esc(section.id)+'"><button type="button" data-reading-jump="section-'+esc(section.id)+'" data-reading-section="'+esc(section.id)+'"><span>'+esc(section.number)+'</span> '+esc(section.title)+'</button><ol class="summary-nav-paragraphs" aria-label="Subparagrafen bij '+esc(section.number)+'">'+section.paragraphs.filter(paragraph=>!paragraph.example).map(paragraph=>'<li><button type="button" data-reading-jump="'+esc(paragraph.id)+'"><span>'+esc(paragraph.number)+'</span> '+esc(paragraph.title)+'</button></li>').join('')+'</ol></li>').join('');
  const trees=outline.trees.length?'<div class="summary-nav-trees"><button type="button" data-reading-jump="summary-routes-title" class="summary-nav-stage-title">Beslisbomen</button><ol aria-label="Beslisbomen bij dit onderwerp">'+outline.trees.map(tree=>'<li><button type="button" data-reading-jump="'+esc(tree.id)+'"><small>Beslisboom '+tree.number+'</small>'+esc(tree.title)+'</button></li>').join('')+'</ol></div>':'';
  const stages=[['summary-exam-coverage','Tentamenoefening'],['summary-recall-title','Herhaling van het college']].filter(([id])=>app.querySelector('#'+id)).map(([id,title])=>'<button type="button" data-reading-jump="'+id+'">'+title+'</button>').join('');
  return '<details open><summary>Je leesplek</summary><p class="summary-nav-college">'+esc(college.label)+'</p><button type="button" data-reading-jump="summary-topic-title" class="summary-nav-topic">Onderwerp '+esc(outline.title)+'</button><p class="summary-nav-current" data-reading-current></p><ol class="summary-nav-sections" aria-label="Subonderwerpen en subparagrafen">'+sections+'</ol><div class="summary-nav-stages">'+trees+stages+'</div></details>';
}

// Only visible headings participate. The last heading above the reading line
// remains current until the following heading reaches it.
export function readingLocation(headings,line){
  const visible=headings.filter(heading=>heading.visible);
  return visible.filter(heading=>heading.top<=line).at(-1)||visible[0]||null;
}

export function mountReadingNavigation(app,college,topic){
  if(readers.has(app)){readers.get(app).update(college,topic);return;}
  let outline,selected='',pending=0;
  const active=()=>location.hash.startsWith('#pagina/sam')&&app.getClientRects().length>0;
  function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
  function sidebar(){
    const target=document.querySelector('[data-summary-outline]');if(!target||!outline)return;
    if(!outlines.has(target)){target.addEventListener('click',event=>readers.get(document.querySelector('#pg-sam [data-summary-app]'))?.jump(event));outlines.add(target);}
    if(target.dataset.topic===topic.id)return;
    target.dataset.topic=topic.id;
    target.innerHTML=sidebarHtml(college,outline,app);
  }
  function jump(event){
    const button=event.target.closest('[data-reading-jump]');if(!button)return;
    const heading=app.querySelector('#'+button.dataset.readingJump);if(!heading)return;
    let parent=heading.parentElement;while(parent&&parent!==app){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    heading.focus({preventScroll:true});
    const scale=window.StudyScale?.get()||1;
    const toolbarHeight=document.querySelector('.belre-page-toolbar')?.getBoundingClientRect().height||58;
    const barHeight=app.querySelector('[data-reading-context]')?.getBoundingClientRect().height||46*scale;
    window.scrollTo({top:Math.max(0,scrollY+heading.getBoundingClientRect().top-toolbarHeight-barHeight-18*scale),behavior:'instant'});
    if(innerWidth<=1100)document.querySelector('[data-nav-close]')?.click();
    schedule();
  }
  function sync(){
    pending=0;
    const target=document.querySelector('[data-summary-outline]');
    if(!active()){if(target&&!location.hash.startsWith('#pagina/sam'))target.hidden=true;return;}
    sidebar();if(target)target.hidden=false;
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
      target.querySelector('[data-reading-current]').textContent=label;
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
  function update(nextCollege,nextTopic){college=nextCollege;topic=nextTopic;outline=readingOutline(college,topic);selected='';schedule();}
  readers.set(app,{update,jump});
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  window.addEventListener('belre:navigation',schedule);app.addEventListener('toggle',schedule,true);
  update(college,topic);
}
