(function () {
  'use strict';
  const mounted=new WeakMap(), states=new Set(), storageKey='learning-input-table-layout-v2';
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{}
  if(!saved||Array.isArray(saved)||typeof saved!=='object')saved={};
  const scale=()=>window.StudyScale?.get?.()||Number.parseFloat(getComputedStyle(document.documentElement).zoom)||1;
  const resizeObserver=window.ResizeObserver?new ResizeObserver(queuePlace):null;
  const waiting=new Set(),visibilityObserver=window.IntersectionObserver?new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)mount(entry.target);});
  }):null;
  function persist(key,value){
    delete saved[key];saved[key]=value;
    Object.keys(saved).slice(0,Math.max(0,Object.keys(saved).length-100)).forEach(k=>delete saved[k]);
    try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}
  }
  function mount(table){
    if(mounted.has(table)||!table.rows.length)return;
    if(!table.getClientRects().length){if(visibilityObserver&&!waiting.has(table)){waiting.add(table);visibilityObserver.observe(table);}return;}
    if(waiting.delete(table))visibilityObserver.unobserve(table);
    const editor=table.closest('.cae-content[contenteditable="true"]');
    if(!editor&&!table.querySelector('input:not([readonly]),textarea:not([readonly]),[contenteditable="true"]'))return;
    const row=table.rows[0],count=row.cells.length;
    if(count<2||Array.from(table.querySelectorAll('td,th')).some(c=>c.colSpan>1||c.rowSpan>1))return;
    const scope=table.closest('.exam-question-body,.question')||document.body;
    const candidates=Array.from(scope.querySelectorAll('table')).filter(t=>t.closest('.cae-content[contenteditable="true"]')||t.querySelector('input,textarea'));
    const position=(window.CafaExams||window.SRACirrus)?.getPosition?.();
    const questionKey=position?position.examId+':'+position.index:location.hash+':'+(document.querySelector('.exam-question-identity .qnum')?.textContent||'');
    const key=location.pathname+':'+questionKey+':'+candidates.indexOf(table);
    const initial=Array.from(row.cells,c=>c.getBoundingClientRect().width),sum=initial.reduce((a,b)=>a+b,0);
    const stock=table.classList.contains('stock-matrix');
    const defaults=stock?Array(count).fill(100/count):initial.map(n=>sum?n*100/sum:100/count);
    const defaultTableWidth=stock?Math.min(count*135,Math.max(count*110,table.parentElement.clientWidth)):editor&&table.style.width.endsWith('px')?Number.parseFloat(table.style.width):null;
    const prior=saved[key];
    let widths=prior&&Array.isArray(prior.widths)&&prior.widths.length===count&&prior.widths.every(n=>Number.isFinite(n)&&n>0&&n<100)&&Math.abs(prior.widths.reduce((a,b)=>a+b,0)-100)<1?prior.widths.slice():defaults.slice();
    const inlineHeight=Number.parseFloat(table.style.getPropertyValue('--input-table-row-height'));
    const defaultHeight=Math.max(36,Math.min(120,table.rows[Math.min(1,table.rows.length-1)].getBoundingClientRect().height/scale()));
    let height=prior&&Number.isFinite(prior.height)&&prior.height>=28&&prior.height<=120?prior.height:Number.isFinite(inlineHeight)?Math.max(28,Math.min(120,inlineHeight)):defaultHeight;
    let tableWidth=prior&&Number.isFinite(prior.tableWidth)&&prior.tableWidth>=280&&prior.tableWidth<=2400?prior.tableWidth:defaultTableWidth;
    const overlay=document.createElement('div');overlay.className='input-table-handles';overlay.setAttribute('role','group');overlay.setAttribute('aria-label','Sleepgrepen van de invoertabel');
    const grips=[];
    function apply(reposition=true){
      table.classList.add('input-table-adjustable');table.style.setProperty('table-layout','fixed','important');
      Array.from(table.rows[0]?.cells||[]).forEach((cell,i)=>cell.style.setProperty('width',widths[i]+'%','important'));
      table.style.setProperty('--input-table-row-height',height+'px');
      if(tableWidth!==null){table.style.setProperty('width',tableWidth+'px','important');table.style.setProperty('min-width',Math.max(280,count*55)+'px','important');}
      else{table.style.removeProperty('width');table.style.removeProperty('min-width');}
      grips.forEach((grip,i)=>grip.setAttribute('aria-valuenow',String(Math.round(widths[i]))));
      if(reposition)queuePlace();
    }
    function commit(){apply();persist(key,{widths,height,tableWidth});}
    function drag(grip,update){
      let start=null,pending=null,frame=0;
      function paint(){frame=0;if(!start||!pending)return;update(start,...pending);pending=null;apply(false);place();}
      grip.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;event.preventDefault();event.stopPropagation();
        start={x:event.clientX,y:event.clientY,width:table.getBoundingClientRect().width,widths:widths.slice(),height:Math.max(height,table.rows[Math.min(1,table.rows.length-1)].getBoundingClientRect().height/scale()),scale:scale()};
        grip.setPointerCapture(event.pointerId);document.body.classList.add('input-table-dragging');
      });
      grip.addEventListener('pointermove',event=>{if(!start)return;pending=[event.clientX-start.x,event.clientY-start.y];if(!frame)frame=requestAnimationFrame(paint);});
      function finish(){if(!start)return;if(frame){cancelAnimationFrame(frame);frame=0;}paint();start=null;document.body.classList.remove('input-table-dragging');commit();}
      grip.addEventListener('pointerup',finish);grip.addEventListener('pointercancel',finish);grip.addEventListener('lostpointercapture',finish);
    }
    function boundary(i,original,delta,totalWidth){
      const pair=original[i]+original[i+1],minimum=Math.min(pair/3,48/totalWidth*100);
      widths=original.slice();widths[i]=Math.max(minimum,Math.min(pair-minimum,original[i]+delta/totalWidth*100));widths[i+1]=pair-widths[i];
    }
    function lastColumn(start,dx){
      const oldLast=start.width*start.widths[count-1]/100;
      const delta=Math.max(55*start.scale-oldLast,Math.min(2400*start.scale-start.width,dx));
      const total=start.width+delta;
      widths=start.widths.map((n,i)=>(start.width*n/100+(i===count-1?delta:0))/total*100);
      tableWidth=total/start.scale;
    }
    for(let i=0;i<count;i++){
      const grip=document.createElement('button');grip.type='button';grip.className='input-table-column-grip';
      grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','vertical');grip.setAttribute('aria-valuemin','1');grip.setAttribute('aria-valuemax','99');
      grip.setAttribute('aria-label','Breedte van kolom '+(i+1)+' verslepen');grip.title='Sleep om de kolombreedte te wijzigen';
      if(i===count-1){grip.classList.add('input-table-last-grip');drag(grip,lastColumn);}
      else drag(grip,(start,dx)=>boundary(i,start.widths,dx,start.width));
      grip.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const delta=(event.key==='ArrowRight'?1:-1)*(event.shiftKey?30:10),width=table.getBoundingClientRect().width;
        if(i===count-1)lastColumn({width,widths:widths.slice(),scale:scale()},delta);else boundary(i,widths,delta,width);commit();});
      grips.push(grip);overlay.append(grip);
    }
    const corner=document.createElement('button');corner.type='button';corner.className='input-table-corner-grip';corner.setAttribute('aria-label','Tabel vanuit de rechteronderhoek vergroten of verkleinen');corner.title='Sleep om de tabel te vergroten of verkleinen. Dubbelklik om te herstellen.';
    function cornerSize(start,dx,dy){
      tableWidth=Math.max(Math.max(280,count*55),Math.min(2400,(start.width+dx)/start.scale));
      height=Math.max(28,Math.min(120,start.height+dy/start.scale/Math.max(1,table.rows.length-1)));
    }
    drag(corner,cornerSize);
    corner.addEventListener('dblclick',()=>{widths=defaults.slice();height=defaultHeight;tableWidth=defaultTableWidth;commit();});
    corner.addEventListener('keydown',event=>{
      const direction={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];
      if(event.key==='Home'){event.preventDefault();widths=defaults.slice();height=defaultHeight;tableWidth=defaultTableWidth;commit();}
      else if(direction){event.preventDefault();cornerSize({width:table.getBoundingClientRect().width,height:Math.max(height,table.rows[Math.min(1,table.rows.length-1)].getBoundingClientRect().height/scale()),scale:scale()},...direction);commit();}
    });
    overlay.append(corner);document.body.append(overlay);
    function place(){
      const rect=table.getBoundingClientRect(),s=scale();
      let left=Math.max(0,rect.left),top=Math.max(0,rect.top),right=Math.min(innerWidth,rect.right),bottom=Math.min(innerHeight,rect.bottom);
      for(let parent=table.parentElement;parent;parent=parent.parentElement){
        const style=getComputedStyle(parent),r=parent.getBoundingClientRect();
        if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,r.left);right=Math.min(right,r.right);}
        if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);}
      }
      overlay.hidden=!table.getClientRects().length||right<=left||bottom<=top||!!table.closest('[inert]');
      if(overlay.hidden)return;
      Object.assign(overlay.style,{left:rect.left/s+'px',top:rect.top/s+'px',width:rect.width/s+'px',height:rect.height/s+'px',clipPath:`inset(${Math.max(0,top-rect.top)/s}px ${Math.max(0,rect.right-right)/s}px ${Math.max(0,rect.bottom-bottom)/s}px ${Math.max(0,left-rect.left)/s}px)`});
      const header=table.rows[0].getBoundingClientRect();
      grips.forEach((grip,i)=>Object.assign(grip.style,{left:((i===count-1?rect.right-3*s:table.rows[0].cells[i].getBoundingClientRect().right)-rect.left)/s+'px',top:(header.top-rect.top)/s+'px',height:(rect.bottom-header.top)/s+'px'}));
    }
    const state={table,overlay,count,key,apply,place};states.add(state);mounted.set(table,state);resizeObserver?.observe(table);apply();place();
  }
  function remove(state){resizeObserver?.unobserve(state.table);state.overlay.remove();mounted.delete(state.table);states.delete(state);}
  function scan(){
    waiting.forEach(table=>{if(!table.isConnected){visibilityObserver.unobserve(table);waiting.delete(table);}});
    states.forEach(state=>{if(!state.table.isConnected)remove(state);});
    document.querySelectorAll('table:has(input:not([readonly]),textarea:not([readonly]),[contenteditable="true"]),.cae-content[contenteditable="true"] table').forEach(table=>{
      const state=mounted.get(table);
      if(state){if(!table.rows.length||table.rows[0].cells.length!==state.count){remove(state);mount(table);}else state.apply();}
      else mount(table);
    });
  }
  let queued=false,placementQueued=false;
  function queue(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;scan();});}}
  function queuePlace(){if(!placementQueued){placementQueued=true;requestAnimationFrame(()=>{placementQueued=false;states.forEach(state=>state.place());});}}
  new MutationObserver(records=>{
    if(records.some(record=>record.target.closest?.('table')||Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(node=>node.nodeType===1&&(node.tagName==='TABLE'||node.querySelector('table')))))queue();
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('learning:table-structure',event=>{
    const table=event.detail?.table,state=mounted.get(table);if(!table)return;
    if(state){delete saved[state.key];remove(state);}
    mount(table);
  });
  window.addEventListener('hashchange',queue);window.addEventListener('resize',queue);document.addEventListener('change',queue);document.addEventListener('scroll',queuePlace,true);
  scan();
})();
