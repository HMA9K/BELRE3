/* Non-modal calculator with persistent history. Bounded parser; no code execution. */
(function(){'use strict';if(window.CafaCalculator){document.querySelectorAll('dialog#calculator-dialog').forEach(function(legacy){legacy.remove();});return;}
  function normalized(s) {
    return s.replace(/,/g, '.').replace(/[×x]/g, '*').replace(/[÷:]/g, '/').replace(/−/g, '-').replace(/\s/g, '');
  }
  function lex(s) {
    // Do not normalize the x in exp: recognize function names before single symbols.
    s = s.replace(/exp/gi, 'EXP');
    s = normalized(s).replace(/EXP/g, 'exp').toLowerCase();
    if (s.length > 180) throw Error('Berekening te lang');
    var ts = s.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|ln|exp|[()+\-*/%^]/g) || [];
    if (ts.join('') !== s) throw Error('Ongeldige invoer');
    return ts;
  }
  function evaluate(s) {
    var ts = lex(String(s)), i = 0;
    function atom() {
      var t = ts[i++], v;
      if (t === '(') {
        v = expr();
        if (ts[i++] !== ')') throw Error('Haakje ontbreekt');
      } else if (t === 'sqrt' || t === 'ln' || t === 'exp') {
        if (ts[i++] !== '(') throw Error('Gebruik haakjes bij ' + t);
        v = expr();
        if (ts[i++] !== ')') throw Error('Haakje ontbreekt');
        if (t === 'sqrt' && v < 0) throw Error('Geen reële wortel');
        if (t === 'ln' && v <= 0) throw Error('ln vereist een positief getal');
        v = t === 'sqrt' ? Math.sqrt(v) : t === 'ln' ? Math.log(v) : Math.exp(v);
      } else {
        if (!t || !/^(?:\d|\.)/.test(t)) throw Error('Vul een getal in');
        v = Number(t);
      }
      while (ts[i] === '%') { i++; v /= 100; }
      return v;
    }
    function power() {
      var v = atom();
      if (ts[i] === '^') { i++; v = Math.pow(v, unary()); }
      return v;
    }
    function unary() {
      if (ts[i] === '+') { i++; return unary(); }
      if (ts[i] === '-') { i++; return -unary(); }
      return power();
    }
    function term() {
      var v = unary();
      while (ts[i] === '*' || ts[i] === '/') {
        var op = ts[i++], rhs = unary();
        if (op === '/' && rhs === 0) throw Error('Delen door nul');
        v = op === '*' ? v * rhs : v / rhs;
      }
      return v;
    }
    function expr() {
      var v = term();
      while (ts[i] === '+' || ts[i] === '-') {
        var op = ts[i++], rhs = term();
        v = op === '+' ? v + rhs : v - rhs;
      }
      return v;
    }
    if (!ts.length) return 0;
    var v = expr();
    if (i !== ts.length || !Number.isFinite(v)) throw Error('Ongeldige berekening');
    return v;
  }

function setupHistoryCalculator(panel, opener, evaluate, options) {
  const find = selector => panel.querySelector(selector);
  const input=find('[data-calc-input]'), output=find('[data-calc-output]'), body=find('[data-calc-body]');
  const historyBox=find('.calc-history'), historyList=find('.calc-history-list'), handle=find('[data-calc-move]');
  const minimize=find('[data-calc-minimize]'), resizer=find('[data-calc-resize]'), compact=find('[data-calc-compact]');
  const fmt=value=>Number(value.toPrecision(13)).toLocaleString('nl-NL',{maximumFractionDigits:12});
  const raw=value=>String(Number(value.toPrecision(13))).replace('.',',');
  let entries=[], memory=0, lastValue=0, position=null, size=null, expandedSize=null, drag=null, sizing=null, returnFocus=opener;
  let errorShown=false, storageOK=true, continueFromResult=false, firstOpen=true;
  const baseEvaluate=evaluate; evaluate=value=>baseEvaluate(window.CirrusCalcInput.normalize(value,lastValue,continueFromResult));
  const scale=()=>window.StudyScale?.get()||1;
  const bounds=()=>{const r=panel.getBoundingClientRect(),z=scale();return {left:r.left/z,top:r.top/z,width:r.width/z,height:r.height/z};};
  const viewport=()=>{const v=window.visualViewport,z=scale();return {x:(v?.offsetLeft||0)/z,y:(v?.offsetTop||0)/z,w:(v?.width||document.documentElement.clientWidth)/z,h:(v?.height||innerHeight)/z};};
  const currentValue=()=>input.value.trim()?evaluate(input.value):lastValue;
  let copyControls=find('.calc-copy');
  if(!copyControls){copyControls=document.createElement('div');copyControls.className='calc-copy';const status=document.createElement('span');status.className='calc-copy-result';status.setAttribute('role','status');const button=document.createElement('button');button.type='button';button.setAttribute('data-copy-calc','');button.textContent='Kopieer uitkomst';copyControls.append(status,button);}
  input.after(copyControls);
  async function copyValue(value){
    const text=raw(value),status=find('.calc-copy-result');
    try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(text);status.textContent='Gekopieerd';}
    catch(_){status.textContent='Uitkomst: '+text;}
  }
  try {
    const stored=localStorage.getItem(options.storageKey);
    const saved=JSON.parse(stored||'null');
    if(saved){
      entries=Array.isArray(saved.entries)?saved.entries.filter(e=>e&&typeof e.id==='string'&&typeof e.expression==='string'&&e.expression.length<=180&&Number.isFinite(e.value)):[];
      memory=Number.isFinite(saved.memory)?saved.memory:0;
      lastValue=Number.isFinite(saved.lastValue)?saved.lastValue:0;
      continueFromResult=typeof saved.continueFromResult==='boolean'?saved.continueFromResult:entries.length>0||lastValue!==0;
      input.value=typeof saved.formula==='string'?saved.formula.slice(0,180):'';
      if(saved.size&&Number.isFinite(saved.size.w)&&Number.isFinite(saved.size.h))size={w:saved.size.w,h:saved.size.h};
    } else if(options.legacyKey){
      const old=JSON.parse(sessionStorage.getItem(options.legacyKey)||'{}');
      input.value=typeof old.formula==='string'?old.formula.slice(0,180):'';
      memory=Number.isFinite(old.memory)?old.memory:0;
      if(old.justResult&&input.value){lastValue=evaluate(input.value);continueFromResult=true;}
    }
  } catch (_) {storageOK=false;}
  function save(){
    try{localStorage.setItem(options.storageKey,JSON.stringify({version:1,entries,memory,lastValue,continueFromResult,formula:input.value,size}));storageOK=true;}
    catch(_){storageOK=false;}
    find('.calc-storage-note').textContent=storageOK?'Bewaard in deze browser':'Browseropslag niet beschikbaar';
  }
  function clearError(){errorShown=false;output.hidden=true;output.textContent='';input.removeAttribute('aria-invalid');}
  function showError(message){errorShown=true;output.hidden=false;output.textContent=message;input.setAttribute('aria-invalid','true');}
  function renderHistory(toEnd=false){
    const previous=historyBox.scrollTop;
    historyList.replaceChildren();
    for(const entry of entries){
      const row=document.createElement('li');row.dataset.calcHistoryId=entry.id;
      const reuse=document.createElement('button');reuse.type='button';reuse.className='calc-history-reuse';reuse.dataset.calcHistoryReuse='';
      reuse.setAttribute('aria-label','Hergebruik '+entry.expression+', uitkomst '+fmt(entry.value));reuse.title=entry.expression;
      const expression=document.createElement('span');expression.className='calc-history-expression';expression.textContent=entry.displayExpression||entry.expression;
      const result=document.createElement('span');result.className='calc-history-value';result.textContent='= '+fmt(entry.value);
      reuse.append(expression);
      result.tabIndex=0;result.title='Selecteer de uitkomst of dubbelklik om te kopiëren';
      result.setAttribute('aria-label','Uitkomst '+fmt(entry.value)+'. Dubbelklik of druk Enter om te kopiëren.');
      result.ondblclick=()=>copyValue(entry.value);
      result.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();copyValue(entry.value);}};
      reuse.onclick=()=>{input.value=entry.expression;clearError();save();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);};
      const remove=document.createElement('button');remove.type='button';remove.className='calc-history-remove';remove.dataset.calcHistoryRemove='';remove.textContent='×';
      remove.setAttribute('aria-label','Verwijder berekening '+entry.expression);remove.title='Deze berekening verwijderen';
      remove.onclick=()=>{const index=entries.findIndex(e=>e.id===entry.id);entries=entries.filter(e=>e.id!==entry.id);renderHistory();save();const next=historyList.children[Math.min(index,entries.length-1)];(next?.querySelector('.calc-history-remove')||historyBox).focus({preventScroll:true});};
      row.append(reuse,result,remove);historyList.append(row);
    }
    find('.calc-history-count').textContent=entries.length+' '+(entries.length===1?'regel':'regels');
    find('.calc-history-empty').hidden=entries.length>0;
    find('[data-calc-clear-history]').disabled=entries.length===0;
    find('.calc-history-older').textContent=entries.length>4?'↑ Scroll voor oudere regels':'Laatste berekeningen';
    historyBox.scrollTop=toEnd?historyBox.scrollHeight:previous;
  }
  find('[data-calc-clear-history]').onclick=()=>{entries=[];renderHistory();save();historyBox.focus({preventScroll:true});};
  function paint(){
    const memoryLabel=find('.calc-memory');memoryLabel.textContent='M: '+fmt(memory);memoryLabel.title='Geheugen: '+fmt(memory);
    const flag=find('.calc-memory-flag');if(flag)flag.hidden=memory===0;
  }
  function insert(text){
    let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
    if(!input.value&&continueFromResult&&/^(?:sqrt|ln|exp)\($/.test(text))text+='Ans)';
    if(!input.value){const prefix=window.CirrusCalcInput.label(text,continueFromResult);if(prefix!==text){input.value='Ans';start=end=input.value.length;}}
    if(input.value.length-(end-start)+text.length>180)throw Error('Berekening te lang');
    input.setRangeText(text,start,end,'end');
  }
  function calculate(){
    if(!input.value.trim())return;
    const typed=input.value,expression=window.CirrusCalcInput.history(typed,lastValue,continueFromResult),value=evaluate(typed),displayExpression=window.CirrusCalcInput.label(typed,continueFromResult);
    entries.push({id:typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now()+'-'+Math.random(),expression,displayExpression,value});
    lastValue=value;continueFromResult=true;input.value='';renderHistory(true);
  }
  function finishDeletion(){
    continueFromResult=false;
    if(/^[−-]$/.test(input.value))input.setSelectionRange(1,1);
  }
  function perform(key){
    clearError();const copy=find('.calc-copy-result');if(copy)copy.textContent='';
    try{
      if(key==='=')calculate();
      else if(key==='C'){input.value='';lastValue=0;continueFromResult=false;}
      else if(key==='Ans')insert('Ans');
      else if(key==='negative'){
        if(!input.value.trim()){input.value='-';continueFromResult=false;input.setSelectionRange(1,1);}
        else{insert('(-)');const caret=input.selectionStart-1;input.setSelectionRange(caret,caret);}
      }
      else if(key==='CE'){input.value=input.value.replace(/(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?%?$/,'');finishDeletion();}
      else if(key==='back'||key==='⌫'){let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;if(start===end)start=Math.max(0,start-1);input.setRangeText('',start,end,'end');finishDeletion();}
      else if(key==='MC')memory=0;
      else if(key==='MR')insert(memory<0?'('+raw(memory)+')':raw(memory));
      else if(key==='MS')memory=currentValue();
      else if(key==='M+'||key==='M-'){const next=memory+(key==='M+'?1:-1)*currentValue();if(!Number.isFinite(next))throw Error('Geheugen buiten bereik');memory=next;}
      else if(['sqrt','square','reciprocal','sign'].includes(key)){
        let value=currentValue();if(key==='sqrt'){if(value<0)throw Error('Geen reële wortel');value=Math.sqrt(value);}else if(key==='square')value*=value;else if(key==='reciprocal'){if(value===0)throw Error('Delen door nul');value=1/value;}else value=-value;
        if(!Number.isFinite(value))throw Error('Ongeldige berekening');input.value=raw(value);lastValue=value;continueFromResult=false;
      }else if(/^(?:[0-9.,()+\-*/%^]|sqrt\(|ln\(|exp\()$/.test(key))insert(key);
    }catch(error){showError(error.message);}
    paint();save();
  }
  function applySize(){
    const v=viewport();panel.style.maxWidth=Math.max(1,v.w-16)+'px';panel.style.maxHeight=Math.max(44,v.h-16)+'px';
    if(size){panel.style.width=Math.min(Math.max(220,size.w),Math.max(1,v.w-16))+'px';panel.style.height=body.hidden?'auto':Math.min(Math.max(380,size.h),Math.max(44,v.h-16))+'px';}
    else{panel.style.width='';panel.style.height='';}
  }
  function place(next=position){
    if(panel.hidden)return;
    const atHistoryEnd=historyBox.scrollHeight-historyBox.clientHeight-historyBox.scrollTop<2;applySize();panel.classList.toggle('calc-small',!body.hidden&&panel.offsetHeight<=480);panel.style['--calc-history-height']=(Math.max(1,Math.min(4,Math.floor((panel.offsetHeight-350)/26)))*26+2)+'px';window.ExamCirrusLayout?.updateCalculator(panel,panel.offsetWidth,panel.offsetHeight);if(atHistoryEnd)historyBox.scrollTop=historyBox.scrollHeight;const v=viewport(),r=bounds();
    const maxX=Math.max(v.x+8,v.x+v.w-r.width-8),maxY=Math.max(v.y+8,v.y+v.h-r.height-8);
    if(!next){const header=document.querySelector('.topbar,.reader-topbar,.study-header');next={x:maxX,y:Math.max(v.y+8,header?header.getBoundingClientRect().bottom/scale()+12:v.y+104)};}
    position={x:Math.max(v.x+8,Math.min(maxX,next.x)),y:Math.max(v.y+8,Math.min(maxY,next.y))};
    panel.style.left=position.x+'px';panel.style.top=position.y+'px';panel.style.right='auto';panel.style.bottom='auto';
  }
  function expand(value){panel.classList.toggle('calc-collapsed',!value);body.hidden=!value;find('.calc-window-footer').hidden=!value;minimize.textContent=value?'−':'+';minimize.setAttribute('aria-expanded',String(value));minimize.setAttribute('aria-label',value?'Rekenmachine inklappen':'Rekenmachine uitklappen');place();}
  function open(from=opener){returnFocus=from;panel.hidden=false;expand(true);opener.setAttribute('aria-expanded','true');place();renderHistory(true);if(window.matchMedia('(pointer: fine)').matches)input.focus({preventScroll:true});else panel.focus({preventScroll:true});if(firstOpen){input.setSelectionRange(input.value.length,input.value.length);firstOpen=false;}}
  function close(){const hadFocus=panel.contains(document.activeElement);if(drag&&handle.hasPointerCapture(drag.id))handle.releasePointerCapture(drag.id);if(sizing&&resizer.hasPointerCapture(sizing.id))resizer.releasePointerCapture(sizing.id);drag=null;sizing=null;panel.hidden=true;opener.setAttribute('aria-expanded','false');save();if(hadFocus)(returnFocus?.isConnected?returnFocus:opener).focus({preventScroll:true});}
  find('[data-calc-close]').onclick=close;minimize.onclick=()=>expand(body.hidden);
  compact.onclick=()=>{if(!expandedSize){const r=bounds();expandedSize={w:r.width,h:r.height};size={w:240,h:380};compact.setAttribute('aria-label','Rekenmachine normale grootte');compact.title='Normale grootte';}else{size=expandedSize;expandedSize=null;compact.setAttribute('aria-label','Rekenmachine verkleinen');compact.title='Verkleinen';}expand(true);place();save();};
  panel.querySelectorAll('[data-calc-key],[data-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{if(e.button===0)e.preventDefault();});button.onclick=()=>perform(button.dataset.calcKey??button.dataset.key);});
  // Editing existing input is explicit: never reinsert Ans while it is being erased.
  input.onbeforeinput=event=>{if(input.value.trim()||/^delete/.test(event.inputType||''))continueFromResult=false;};
  input.oninput=event=>{
    clearError();
    if(/^delete/.test(event.inputType||'')){finishDeletion();save();return;}
    const value=input.value,prefixed=window.CirrusCalcInput.label(value,continueFromResult);
    if(prefixed!==value&&prefixed.length<=180){
      const start=input.selectionStart,end=input.selectionEnd,shift=prefixed.length-value.length;
      input.value=prefixed;input.setSelectionRange(start+shift,end+shift);
    }
    save();
  };
  panel.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('[data-calc-move],[data-calc-resize],.calc-history'))return;
    if(event.target===input){if(event.key==='Enter'||event.key==='='){event.preventDefault();perform('=');}return;}
    if(event.key==='Enter'&&event.target.tagName==='BUTTON')return;
    if(event.key==='Enter'||event.key==='='){event.preventDefault();perform('=');}else if(event.key==='Backspace'){event.preventDefault();perform('back');}else if(event.key==='Delete'){event.preventDefault();perform('C');}else if(/^[0-9()+\-*/%^,.]$/.test(event.key)){event.preventDefault();perform(event.key);}
  });
  handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;const r=bounds();drag={id:event.pointerId,x:event.clientX/scale()-r.left,y:event.clientY/scale()-r.top};handle.setPointerCapture(event.pointerId);event.preventDefault();});
  handle.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)place({x:event.clientX/scale()-drag.x,y:event.clientY/scale()-drag.y});});
  const endDrag=event=>{if(drag?.id!==event.pointerId)return;drag=null;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);};handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);handle.addEventListener('lostpointercapture',endDrag);
  handle.addEventListener('keydown',event=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];if(event.key==='Home'){event.preventDefault();position=null;place();}else if(delta){event.preventDefault();const r=bounds();place({x:r.left+delta[0]*(event.shiftKey?4:1),y:r.top+delta[1]*(event.shiftKey?4:1)});}});
  function resize(w,h){const v=viewport();size={w:Math.min(Math.max(220,w),Math.max(1,v.w-16)),h:Math.min(Math.max(380,h),Math.max(44,v.h-16))};expandedSize=null;compact.setAttribute('aria-label','Rekenmachine verkleinen');compact.title='Verkleinen';place();save();}
  resizer.addEventListener('pointerdown',event=>{if(event.button!==0)return;const r=bounds();sizing={id:event.pointerId,x:event.clientX/scale(),y:event.clientY/scale(),w:r.width,h:r.height};resizer.setPointerCapture(event.pointerId);event.preventDefault();});
  resizer.addEventListener('pointermove',event=>{if(sizing?.id===event.pointerId)resize(sizing.w+event.clientX/scale()-sizing.x,sizing.h+event.clientY/scale()-sizing.y);});
  const endResize=event=>{if(sizing?.id!==event.pointerId)return;sizing=null;if(resizer.hasPointerCapture(event.pointerId))resizer.releasePointerCapture(event.pointerId);};resizer.addEventListener('pointerup',endResize);resizer.addEventListener('pointercancel',endResize);resizer.addEventListener('lostpointercapture',endResize);
  resizer.addEventListener('keydown',event=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];if(delta){event.preventDefault();const r=bounds();resize(r.width+delta[0],r.height+delta[1]);}});
  find('[data-copy-calc]').onclick=()=>{try{copyValue(currentValue());}catch(error){showError(error.message);}};
  document.addEventListener('focusin',event=>{if(!panel.hidden&&!panel.contains(event.target))returnFocus=event.target;});
  window.addEventListener('resize',()=>place());window.visualViewport?.addEventListener('resize',()=>place());window.visualViewport?.addEventListener('scroll',()=>place());window.addEventListener('pagehide',save);
  renderHistory();paint();save();
  return {open,close,perform,getState:()=>({formula:input.value,memory,history:entries.map(e=>({...e})),size,lastValue,errorShown})};
}

const original=document.getElementById('calculator-dialog'),panel=document.createElement('section');panel.id='calculator-dialog';panel.className='calculator-float';panel.hidden=true;panel.tabIndex=-1;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','calculator-title');panel.innerHTML="<header class=\"calculator-float-head\"><button type=\"button\" class=\"calculator-handle\" data-calc-move aria-label=\"Rekenmachine verplaatsen. Sleep of gebruik de pijltoetsen.\"><span aria-hidden=\"true\">⠿</span><b id=\"calculator-title\">Rekenmachine</b></button><button type=\"button\" data-calc-compact title=\"Verkleinen\" aria-label=\"Rekenmachine verkleinen\">↙</button><button type=\"button\"  data-calc-minimize aria-label=\"Rekenmachine inklappen\" aria-expanded=\"true\">−</button><button type=\"button\"  data-calc-close aria-label=\"Rekenmachine sluiten\">×</button></header>\n<div  class=\"calculator-float-body\" data-calc-body><div class=\"calc-history-heading\"><span>Berekeningen</span><span class=\"calc-history-count\">0 regels</span><button type=\"button\" data-calc-clear-history>Alle regels wissen</button></div><div class=\"calc-history\" tabindex=\"0\" role=\"region\" aria-label=\"Berekeningshistorie, scroll voor oudere regels\"><ol class=\"calc-history-list\"></ol><p class=\"calc-history-empty\">Je berekeningen verschijnen hier.</p></div><p class=\"calc-history-help\"><span class=\"calc-history-older\">Laatste berekeningen</span><span>Klik op de berekening om te hergebruiken</span></p><label class=\"calc-input-label\" for=\"calc-expression\">Nieuwe berekening</label><input id=\"calc-expression\" class=\"calc-input\" data-calc-input inputmode=\"text\" autocomplete=\"off\" spellcheck=\"false\" maxlength=\"180\" aria-describedby=\"calc-input-help\" placeholder=\"Typ hier je volgende berekening\"><p id=\"calc-input-help\" class=\"calc-help\">Duizendtallen met punten mogelijk; decimalen met komma of punt mogelijk; spaties worden genegeerd. Kopiëren en plakken mogelijk.</p><output  class=\"calc-output calc-error\" data-calc-output aria-live=\"polite\" hidden></output><div class=\"calc-controls\"><div class=\"calc-memory-row\"><div class=\"calc-memory-keys\"><button type=\"button\" data-calc-key=\"MC\" aria-label=\"Geheugen wissen\">MC</button><button type=\"button\" data-calc-key=\"MR\" aria-label=\"Geheugen oproepen\">MR</button><button type=\"button\" data-calc-key=\"M+\" aria-label=\"Bij geheugen optellen\">M+</button><button type=\"button\" data-calc-key=\"M-\" aria-label=\"Van geheugen aftrekken\">M−</button></div><span class=\"calc-memory\" aria-live=\"polite\">M: 0</span></div><div  class=\"calc-keys\"><button type=\"button\" data-calc-key=\"7\">7</button><button type=\"button\" data-calc-key=\"8\">8</button><button type=\"button\" data-calc-key=\"9\">9</button><button type=\"button\" data-calc-key=\"/\">÷</button><button type=\"button\" data-calc-key=\"4\">4</button><button type=\"button\" data-calc-key=\"5\">5</button><button type=\"button\" data-calc-key=\"6\">6</button><button type=\"button\" data-calc-key=\"*\">×</button><button type=\"button\" data-calc-key=\"1\">1</button><button type=\"button\" data-calc-key=\"2\">2</button><button type=\"button\" data-calc-key=\"3\">3</button><button type=\"button\" data-calc-key=\"-\">−</button><button type=\"button\" data-calc-key=\"0\">0</button><button type=\"button\" data-calc-key=\".\">.</button><button type=\"button\" data-calc-key=\"(\">(</button><button type=\"button\" data-calc-key=\")\">)</button><button type=\"button\" data-calc-key=\"sqrt(\" aria-label=\"Vierkantswortel\">√</button><button type=\"button\" data-calc-key=\"Ans\" aria-label=\"Vorige uitkomst invoegen\" title=\"Vorige uitkomst invoegen\">Ans</button><button type=\"button\" data-calc-key=\"negative\" aria-label=\"Negatief getal invoeren\" title=\"Nieuw negatief getal, zonder automatisch Ans\">(−)</button><button type=\"button\" data-calc-key=\"^\">^</button><button type=\"button\" data-calc-key=\"C\" aria-label=\"Nieuwe berekening wissen\">C</button><button type=\"button\" data-calc-key=\"back\" aria-label=\"Laatste teken wissen\">⌫</button><button type=\"button\" data-calc-key=\"=\" aria-label=\"Berekenen en nieuwe regel beginnen\">=</button><button type=\"button\" data-calc-key=\"+\">+</button></div><details class=\"calc-extra\"><summary>Extra functies</summary><div class=\"calc-extra-keys\"><button type=\"button\" data-calc-key=\"CE\">CE</button><button type=\"button\" data-calc-key=\"%\">%</button><button type=\"button\" data-calc-key=\"ln(\" aria-label=\"Natuurlijke logaritme\">ln</button><button type=\"button\" data-calc-key=\"exp(\" aria-label=\"Exponentiële functie\">exp</button><button type=\"button\" data-calc-key=\"reciprocal\">1/x</button></div><p class=\"calc-extra-help\">% deelt door 100. MC wist het geheugen; MR haalt het op. M+ en M− gebruiken je invoer of de laatste uitkomst.</p><div class=\"calc-copy\"><span class=\"calc-copy-result\" role=\"status\"></span><button type=\"button\" data-copy-calc>Kopieer uitkomst</button></div></details></div></div><footer class=\"calc-window-footer\"><span class=\"calc-storage-note\" role=\"status\">Bewaard in deze browser</span><button type=\"button\" data-calc-resize title=\"Sleep om te vergroten of verkleinen\" aria-label=\"Rekenmachineformaat wijzigen. Sleep of gebruik de pijltoetsen.\">◢</button></footer>";if(original)original.replaceWith(panel);else document.body.append(panel);
const icon='<svg class="calc-icon" aria-hidden="true" viewBox="0 0 20 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="1" width="14" height="21" rx="1"/><path d="M6 5h8v4H6zM6 12h2m2 0h2m2 0h1M6 15h2m2 0h2m2 0h1M6 18h2m2 0h2m2 0h1"/></svg>';
let toolbar=document.querySelector('.top-controls,.reader-top-tools'),trigger=toolbar&&toolbar.querySelector('[data-calc]');if(!trigger){trigger=document.createElement('button');trigger.type='button';trigger.setAttribute('data-calc','');trigger.innerHTML=icon;if(toolbar)toolbar.prepend(trigger);else{toolbar=document.createElement('div');toolbar.className='calculator-standalone-tools';toolbar.append(trigger);document.body.prepend(toolbar);}}
trigger.classList.add('calculator-toolbar-trigger');trigger.title='Rekenmachine';trigger.setAttribute('aria-label','Rekenmachine openen');trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
const courseOptions=window.CourseCalculatorOptions||{};
const api=setupHistoryCalculator(panel,trigger,evaluate,{storageKey:courseOptions.storageKey||'cafa2-calculator-history-v1',legacyKey:courseOptions.legacyKey||'cafa2-calculator-v2'});document.addEventListener('click',event=>{const from=event.target.closest('[data-calc]');if(from){event.preventDefault();api.open(from);}});window.CafaCalculator=api;if(courseOptions.apiName)window[courseOptions.apiName]=api;window.cafaCalculatorTest={evaluate};})();
