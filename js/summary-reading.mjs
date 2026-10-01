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
  })};
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
    target.innerHTML='<details open><summary>Je leesplek</summary><p class="summary-nav-college">'+esc(college.label)+'</p><button type="button" data-reading-jump="summary-topic-title" class="summary-nav-topic">Onderwerp '+esc(outline.title)+'</button><p class="summary-nav-current" data-reading-current></p><ol>'+outline.sections.map(section=>'<li><button type="button" data-reading-jump="section-'+esc(section.id)+'" data-reading-section="'+esc(section.id)+'"><span>'+esc(section.number)+'</span> '+esc(section.title)+'</button></li>').join('')+'</ol><div class="summary-nav-stages">'+[['summary-routes','Artikelroutes'],['summary-exam-coverage','Tentamenoefening'],['summary-recall-title','Herhaling van het college']].filter(([id])=>app.querySelector('#'+id)).map(([id,title])=>'<button type="button" data-reading-jump="'+id+'">'+title+'</button>').join('')+'</div></details>';
  }
  function jump(event){
    const button=event.target.closest('[data-reading-jump]');if(!button)return;
    const heading=app.querySelector('#'+button.dataset.readingJump);if(!heading)return;
    let parent=heading.parentElement;while(parent&&parent!==app){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});
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
      for(const button of target.querySelectorAll('[data-reading-jump]')){
        const isCurrent=button.dataset.readingJump===id||button.dataset.readingSection&&button.dataset.readingSection===element.dataset.readingSection;
        if(isCurrent)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
      }
    }
  }
  function update(nextCollege,nextTopic){college=nextCollege;topic=nextTopic;outline=readingOutline(college,topic);selected='';schedule();}
  readers.set(app,{update,jump});
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  window.addEventListener('belre:navigation',schedule);app.addEventListener('toggle',schedule,true);
  update(college,topic);
}
