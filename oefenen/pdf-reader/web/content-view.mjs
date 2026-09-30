// Focus the viewport on text without changing the PDF page or annotation coordinates.
import {installPageLayout} from './page-layout.mjs?v=20260928-navigation2';
export function installContentView(app,{key,restored=false}){
  const viewer=app.pdfViewer,container=viewer.container,select=document.getElementById('scaleSelect');
  const choice=document.createElement('option');choice.value='content-width';choice.textContent='Inhoudsbreedte';
  select.insertBefore(choice,select.querySelector('[value="page-width"]'));
  const button=document.createElement('button');button.type='button';button.id='cafa-content-width';button.textContent='Inhoud';button.title='Toon de inhoud op vensterbreedte';
  document.querySelector('.cafa-mark-toolbar').append(button);
  const storage='learning-pdf-content-width-v1:'+key,cache=new Map();
  let active=true,applying=false,request=0,resizeTimer;
  // Every document opens at content width; manual zoom applies while reading.
  const remember=()=>{button.setAttribute('aria-pressed',String(active));try{localStorage.setItem(storage,String(active));}catch{}};
  button.setAttribute('aria-pressed',String(active));
  async function bounds(pageView){
    const page=pageView.pdfPage;if(!page)return null;
    const rotation=pageView.viewport.rotation,cacheKey=page.pageNumber+':'+rotation;
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const promise=(async()=>{
      const viewport=page.getViewport({scale:1,rotation}),text=await page.getTextContent();
      const points=[];
      for(const item of text.items){if(!item.str?.trim()||!item.width)continue;
        const [a,b,,,x,y]=item.transform,length=Math.hypot(a,b)||1,ux=a/length,uy=b/length,h=item.height||length;
        for(const w of [0,item.width])for(const v of [-.2*h,.9*h])points.push(viewport.convertToViewportPoint(x+w*ux-v*uy,y+w*uy+v*ux));
      }
      if(points.length<12)return {left:0,top:0,width:viewport.width};
      const left=Math.max(0,Math.min(...points.map(p=>p[0]))-8),right=Math.min(viewport.width,Math.max(...points.map(p=>p[0]))+8);
      return {left,top:Math.max(0,Math.min(...points.map(p=>p[1]))-8),width:Math.max(viewport.width*.25,right-left)};
    })();cache.set(cacheKey,promise);return promise;
  }
  async function focus({fit=false,top=false}={}){
    const token=++request,pageView=viewer.getPageView(viewer.currentPageNumber-1);if(!pageView)return;
    const box=await bounds(pageView);if(!box||token!==request)return;
    if(fit){const units=pageView.viewport.scale/viewer.currentScale;applying=true;viewer.currentScale=Math.min(10,Math.max(.1,(container.clientWidth-16)/(box.width*units)));applying=false;select.value='content-width';}
    // Wait for the scale/layout to be applied. Keep vertical reading position on zoom.
    requestAnimationFrame(()=>{if(token!==request||!pageView.div.isConnected)return;
      if(fit)select.value='content-width';
      const page=pageView.div.getBoundingClientRect(),frame=container.getBoundingClientRect(),scale=pageView.viewport.scale;
      container.scrollLeft+=page.left-frame.left+box.left*scale-8;
      if(top)container.scrollTop+=page.top-frame.top+box.top*scale-8;
    });
  }
  select.addEventListener('change',event=>{
    active=select.value==='content-width';remember();
    if(active){event.stopImmediatePropagation();void focus({fit:true,top:true});}
  },true);
  button.addEventListener('click',()=>{active=true;remember();void focus({fit:true,top:true});});
  const manualZoom=()=>{active=false;remember();};
  document.addEventListener('click',event=>{if(event.target.closest('#zoomIn,#zoomOut'))manualZoom();},true);
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['+','-','=','0'].includes(event.key))manualZoom();},true);
  container.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)manualZoom();},{capture:true,passive:true});
  app.eventBus.on('scalechanging',()=>{if(!applying)void focus({fit:active});});
  app.eventBus.on('pagesinit',()=>{void focus({fit:active,top:active&&!restored});});
  app.eventBus.on('documentinit',()=>{if(active)void focus({fit:true,top:!restored});});
  app.eventBus.on('pagesloaded',()=>{if(active)void focus({fit:true,top:!restored});});
  app.eventBus.on('pagechanging',()=>{if(active&&!applying)void focus({fit:true});});
  app.eventBus.on('rotationchanging',()=>{void focus({fit:active});});
  new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(active)void focus({fit:true});},80);}).observe(container);
  window.CafaPdfContentView={focus,get active(){return active;}};
  installPageLayout(app,({top})=>{void focus({fit:active,top:active&&top});});
}
