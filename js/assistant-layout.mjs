/** Align the persistent panel with the active page banner and question frame. */
export function createAssistantLayout(nav,panel){
  let pending=0,courseDocument=null;
  const observed=new WeakSet(),resize=new ResizeObserver(schedule);
  function schedule(){if(!pending)pending=requestAnimationFrame(sync);}
  function observe(element){if(element&&!observed.has(element)){observed.add(element);resize.observe(element);}}
  function sync(){
    pending=0;
    const course=nav.courseWindow?.document;
    if(course?.body){
      const docked=!panel.hidden&&innerWidth>760;
      course.body.classList.toggle('belre-assistant-docked',docked);
      const width=getComputedStyle(document.documentElement).getPropertyValue('--belre-assistant-width');
      if(course.documentElement.style.getPropertyValue('--belre-assistant-width')!==width)course.documentElement.style.setProperty('--belre-assistant-width',width);
      if(docked)for(const floating of course.querySelectorAll('#calculator-dialog:not([hidden]),.cirrus-case-float:not([hidden])')){
        const r=floating.getBoundingClientRect(),right=course.defaultView.innerWidth-parseFloat(width)-12;
        if(r.width&&r.right>right){const scale=course.defaultView.StudyScale?.get()||1;floating.style.transform='none';floating.style.left=Math.max(8,right-r.width)/scale+'px';}
      }
      if(course!==courseDocument){
        courseDocument=course;
        course.defaultView.addEventListener('scroll',schedule,{passive:true});
        new MutationObserver(schedule).observe(course.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
      }
    }
    const banners=nav.inCourse&&course?.body
      ?[...course.querySelectorAll('.topbar,.learning-page-head,#exam-app:not([hidden]) .cirrus-page-head')]
      :[document.querySelector('.belre-site-header'),document.querySelector('.belre-page-toolbar')];
    let bottom=0;
    for(const banner of banners){observe(banner);if(banner?.getClientRects().length)bottom=Math.max(bottom,banner.getBoundingClientRect().bottom);}
    const factor=window.StudyScale?.get()||1;
    if(nav.inCourse){const frame=document.getElementById('belre-course-frame');bottom=frame.getBoundingClientRect().top+bottom*(frame.getBoundingClientRect().width/(course?.defaultView.innerWidth||frame.clientWidth));}
    const viewport=window.visualViewport,visibleTop=viewport?.offsetTop||0,visibleBottom=visibleTop+(viewport?.height||innerHeight);
    let top=Math.max(visibleTop,Math.min(visibleBottom,bottom));
    let pageBottom=visibleBottom;
    if(nav.inCourse&&!panel.hidden&&innerWidth>760&&course?.body){
      const page=course.body.classList.contains('exam-running')
        ?course.querySelector('#exam-app:not([hidden]) .frame')
        :course.querySelector('#mc-app:not([hidden]) .belre-mc-question');
      observe(page);
      if(page?.getClientRects().length){
        const frame=document.getElementById('belre-course-frame'),rect=frame.getBoundingClientRect();
        const pageRect=page.getBoundingClientRect(),scale=rect.width/course.defaultView.innerWidth;
        const start=rect.top+pageRect.top*scale,end=rect.top+pageRect.bottom*scale;
        top=Math.max(top,Math.min(visibleBottom,start));
        if(end>top)pageBottom=Math.min(visibleBottom,end);
      }
    }
    const height=Math.max(0,pageBottom-top);
    const root=document.documentElement;
    root.style.setProperty('--belre-assistant-top',top/factor+'px');
    root.style.setProperty('--belre-assistant-height',height/factor+'px');
    const available=height/factor;
    panel.classList.toggle('is-compact',available<500);
    panel.classList.toggle('is-short',available<360);
    panel.classList.toggle('is-tiny',available<260);
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  schedule();
  return {sync,schedule};
}
