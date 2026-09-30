/** Align the persistent panel with the active page banner, including iframe routes. */
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
        const r=floating.getBoundingClientRect(),right=innerWidth-parseFloat(width)-12;
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
      :[document.querySelector('#belre-main .mhdr')];
    let bottom=0;
    for(const banner of banners){observe(banner);if(banner?.getClientRects().length)bottom=Math.max(bottom,banner.getBoundingClientRect().bottom);}
    const viewport=window.visualViewport,visibleTop=viewport?.offsetTop||0,visibleBottom=visibleTop+(viewport?.height||innerHeight);
    const top=Math.max(visibleTop,Math.min(visibleBottom,bottom)),height=Math.max(0,visibleBottom-top);
    const root=document.documentElement;
    root.style.setProperty('--belre-assistant-top',top+'px');
    root.style.setProperty('--belre-assistant-height',height+'px');
    panel.classList.toggle('is-compact',height<500);
    panel.classList.toggle('is-short',height<360);
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  schedule();
  return {sync,schedule};
}
