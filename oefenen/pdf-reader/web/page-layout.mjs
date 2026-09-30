// Reader layout preferences do not change the PDF or its annotation coordinates.
export function installPageLayout(app,onLayoutChange){
  const viewer=app.pdfViewer,toolbar=document.querySelector('.cafa-mark-toolbar');
  const storage='learning-pdf-layout-v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(storage)||'{}')||{};}catch{}
  const layout={pageEnds:saved.pageEnds!==false,singlePage:saved.singlePage===true};
  const controls={};
  for(const [name,id,text,title] of [
    ['pageEnds','cafa-page-ends','Pagina-einden','Toon de scheiding tussen PDF-pagina’s'],
    ['singlePage','cafa-single-page','Eén pagina','Toon één pagina tegelijk; blader met de paginaknoppen']
  ]){
    const button=document.createElement('button');button.type='button';button.id=id;button.textContent=text;button.title=title;
    toolbar.append(button);controls[name]=button;
    button.addEventListener('click',()=>{
      layout[name]=!layout[name];try{localStorage.setItem(storage,JSON.stringify(layout));}catch{}
      apply();
    });
  }
  const navigation=document.createElement('div');navigation.className='cafa-page-nav';navigation.setAttribute('role','group');navigation.setAttribute('aria-label','Bladeren door PDF-pagina’s');
  const previous=document.createElement('button'),next=document.createElement('button');
  for(const [button,id,label,text,step] of [[previous,'cafa-previous-page','Vorige pagina','‹',-1],[next,'cafa-next-page','Volgende pagina','›',1]]){
    button.type='button';button.id=id;button.title=label;button.setAttribute('aria-label',label);
    const arrow=document.createElement('span'),caption=document.createElement('span');
    arrow.className='cafa-page-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=text;caption.textContent=label;
    button.append(...(step<0?[arrow,caption]:[caption,arrow]));
    button.addEventListener('click',()=>{
      app.page=Math.min(viewer.pagesCount,Math.max(1,viewer.currentPageNumber+step));
      onLayoutChange({top:true});
    });navigation.append(button);
  }
  toolbar.append(navigation);
  function updateNavigation(){previous.disabled=viewer.currentPageNumber<=1;next.disabled=!viewer.pagesCount||viewer.currentPageNumber>=viewer.pagesCount;}
  function apply(){
    viewer.viewer.classList.toggle('showPageEnds',layout.pageEnds);
    viewer.viewer.classList.toggle('singlePage',layout.singlePage);
    for(const name of Object.keys(controls))controls[name].setAttribute('aria-pressed',String(layout[name]));
    updateNavigation();
    if(viewer.pagesCount){
      const {ScrollMode,SpreadMode}=window.PDFViewerApplicationConstants;
      const mode=layout.singlePage?ScrollMode.PAGE:ScrollMode.VERTICAL,changed=viewer.scrollMode!==mode;
      if(layout.singlePage)viewer.spreadMode=SpreadMode.NONE;
      viewer.scrollMode=mode;
      onLayoutChange({top:changed});
    }
  }
  new ResizeObserver(()=>{
    document.documentElement.style.setProperty('--cafa-mark-toolbar-height',Math.ceil(toolbar.getBoundingClientRect().height)+'px');
  }).observe(toolbar);
  app.eventBus.on('pagesinit',apply);
  app.eventBus.on('documentinit',apply);
  app.eventBus.on('pagechanging',updateNavigation);
  apply();
}
