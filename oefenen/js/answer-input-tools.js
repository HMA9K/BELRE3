/* Shared answer entry: optional Dutch thousands grouping and cell-edge navigation. */
(function () {
  'use strict';
  if (window.StudyAnswerInput) return;
  const groups=new WeakMap(),previous=new WeakMap(),registrations=new Set(), storage='belre3-answer-thousands-v2';
  let preferences={};try{preferences=JSON.parse(localStorage.getItem(storage)||'{}');}catch{}
  if(!preferences||typeof preferences!=='object'||Array.isArray(preferences))preferences={};
  preferences={default:preferences.default!==false,questions:preferences.questions&&typeof preferences.questions==='object'&&!Array.isArray(preferences.questions)?preferences.questions:{}};
  function questionKey(host){
    const question=host.closest('.question');if(question)return 'practice:'+question.id;
    const app=window.CafaExams||window.SRACirrus,attemptId=location.hash.match(/^#(?:toets|tentamen)\/([^/]+)/)?.[1];
    if(app?.getQuestionContext){const ctx=attemptId&&app.getQuestionContext(attemptId),q=ctx?.question;
      return q?'exam:'+(q.sourceExamId||ctx.exam.id)+':'+(q.sourceQuestionId||q.id):location.pathname+location.hash;
    }
    const attempts=app?.getAttempts?.()||[],current=attempts.find(a=>a.id===attemptId);
    const position=app?.getPosition?.()||(current?{attempt:current.id,index:current.currentIndex}:null);
    if(position){const attempt=attempts.find(a=>a.id===position.attempt),q=attempt?.exam.questions[position.index];
      if(q)return 'exam:'+(q.sourceExamId||attempt.exam.id)+':'+(q.sourceQuestionId||q.id);
    }
    return location.pathname+location.hash+':'+(document.querySelector('.exam-question-identity .qnum')?.textContent.trim()||'');
  }
  const save=()=>{try{localStorage.setItem(storage,JSON.stringify(preferences));}catch{}};
  function refresh(g,format=false){
    const override=Object.hasOwn(preferences.questions,g.key);
    g.check.checked=override?preferences.questions[g.key]:preferences.default;g.all.checked=!override;
    if(!format||!g.check.checked)return;
    if(g.editor){g.editor.undoManager.transact(()=>formatRich(g.editor.getBody()));g.editor.dispatch('change');}
    else if(g.kind==='editor'){const content=g.host.querySelector('.cae-content');if(content&&formatRich(content))content.dispatchEvent(new Event('input',{bubbles:true}));}
    else (g.kind==='table'?g.host.querySelectorAll('input,textarea'):[g.host]).forEach(f=>formatField(f,true));
  }
  function updateAll(format=true){for(const g of registrations)if(g.host.isConnected)refresh(g,format);}
  function formatted(text,caret=text.length,partial=false){
    let position=caret;
    const dates=Array.from(text.matchAll(/\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g),m=>({start:m.index,end:m.index+m[0].length}));
    const value=text.replace(/(?<![\p{L}\p{N}_.,])[-+−]?\d(?:[\d.]*\d)?(?:,\d*)?(?![\p{L}\p{N}_,]|\.\d)/gu,(token,start)=>{
      const after=text.slice(start+token.length);
      // Dates, scientific notation, percentages and decimal points are not amounts.
      if(/^\s*%/.test(after)||dates.some(d=>start>=d.start&&start<d.end))return token;
      const year=token.replaceAll('.','');
      const yearToken=token.replace(/,$/,'');
      const groupedYear=!yearToken.includes('.')||(partial?/^\+?\d{1,3}(?:\.\d{1,3})+$/:/^\+?\d{1,3}(?:\.\d{3})+$/).test(yearToken);
      if(groupedYear&&/^\+?(?:1969|201[5-9]|202\d|2030),?$/.test(year)){
        if(start+token.length<=caret)position+=year.length-token.length;
        else if(start<caret)position-=token.slice(0,caret-start).split('.').length-1;
        return year;
      }
      const parts=token.split(','),integer=parts[0],digits=integer.replace(/\D/g,'');
      if(digits.length<4||integer.includes('.')&&!(partial?/^[+−-]?\d{1,4}(?:\.\d{1,4})+$/:/^[+−-]?\d{1,4}(?:\.\d{3,4})+$/).test(integer))return token;
      const sign=integer.match(/^[+−-]/)?.[0]||'';
      const next=sign+digits.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(parts.length>1?','+parts[1]:'');
      if(start+token.length<=caret)position+=next.length-token.length;
      else if(start<caret){
        const count=token.slice(0,caret-start).replace(/\./g,'').length;
        let offset=0,seen=0;while(offset<next.length&&seen<count){if(next[offset]!=='.')seen++;offset++;}
        position=start+offset+(position-caret);
      }
      return next;
    });
    return {value,caret:position};
  }
  function amountField(field){
    return field.matches('textarea,input[type="text"],input:not([type])')&&!field.readOnly&&!field.disabled&&
      !/percentage|datum|naam/i.test(field.getAttribute('aria-label')||'')&&!/%|^Naam$/i.test(field.placeholder||'')&&
      !/^h-/.test(field.dataset.stockCell||'')&&!field.matches('[data-journal-col="0"]');
  }
  function formatField(field,notify=false,editing=false){
    if(!amountField(field))return;
    const partial=editing&&/^[+−-]?\d{1,3}(?:\.\d{3})+(?:,\d*)?$/.test(previous.get(field)||''),next=formatted(field.value,field.selectionStart??field.value.length,partial),end=formatted(field.value,field.selectionEnd??field.value.length,partial).caret;
    previous.set(field,next.value);
    if(next.value===field.value)return;
    field.value=next.value;try{field.setSelectionRange(next.caret,end);}catch{}
    if(notify)field.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function formatRich(body,editing=false){
    const doc=body.ownerDocument,selection=doc.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
    const endpoints=range?[{node:range.startContainer,offset:range.startOffset},{node:range.endContainer,offset:range.endOffset}]:[];
    const walker=doc.createTreeWalker(body,NodeFilter.SHOW_TEXT),nodes=[];let node;
    while((node=walker.nextNode()))nodes.push(node);
    let changed=false;
    for(const n of nodes){const partial=editing&&/^[+−-]?\d{1,3}(?:\.\d{3})+(?:,\d*)?$/.test(previous.get(n)||''),result=formatted(n.data,n.data.length,partial);previous.set(n,result.value);if(result.value===n.data)continue;
      endpoints.forEach(p=>{if(p.node===n)p.offset=formatted(n.data,p.offset,partial).caret;});n.data=result.value;changed=true;
    }
    if(changed&&range){try{range.setStart(endpoints[0].node,endpoints[0].offset);range.setEnd(endpoints[1].node,endpoints[1].offset);selection.removeAllRanges();selection.addRange(range);}catch{}}
    return changed;
  }
  function group(host,kind){
    if(groups.has(host))return groups.get(host);
    const key=questionKey(host),label=document.createElement('div');label.className='answer-thousands-toggle';
    const amountLabel=document.createElement('label'),allLabel=document.createElement('label');
    const check=document.createElement('input');check.type='checkbox';check.dataset.answerThousands='';
    const all=document.createElement('input');all.type='checkbox';all.dataset.answerThousandsAll='';
    all.title='Aangevinkt: onthouden voor alle vragen. Uitgevinkt: alleen deze vraag, voor alle invoervelden.';
    amountLabel.append(check,document.createTextNode('Duizendtallen met punt (5.000)'));
    allLabel.append(all,document.createTextNode('Voor alle vragen'));label.append(amountLabel,allLabel);
    if(kind==='table'){
      const wrap=host.closest('.journal-scroll,.stock-scroll,.table-scroll,.table-wrap');(wrap||host).after(label);
    }else host.after(label);
    const g={host,check,all,label,key,kind,editor:null};groups.set(host,g);registrations.add(g);refresh(g);
    host.querySelectorAll('input,textarea').forEach(f=>previous.set(f,f.value));
    check.addEventListener('change',()=>{
      if(all.checked){preferences.default=check.checked;preferences.questions={};}
      else preferences.questions[key]=check.checked;
      save();updateAll();
    });
    all.addEventListener('change',()=>{
      if(all.checked){preferences.default=check.checked;preferences.questions={};}
      else preferences.questions[key]=check.checked;
      save();updateAll();
    });
    return g;
  }
  function scan(){
    for(const g of registrations){if(!g.host.isConnected||g.kind!=='editor'&&g.host.closest('[hidden]')||g.kind==='text'&&(g.host.hidden||g.host.closest('.cafa-answer-editor,table'))){g.label.remove();groups.delete(g.host);registrations.delete(g);}}
    document.querySelectorAll('.cafa-answer-editor:has(.cae-content[contenteditable="true"])').forEach(h=>group(h,'editor'));
    document.querySelectorAll('.question table,.exam-question-body table,#main table').forEach(t=>{
      if(t.closest('.cafa-answer-editor,[hidden]')||!Array.from(t.querySelectorAll('input,textarea')).some(amountField))return;
      group(t,'table');
    });
    document.querySelectorAll('.question textarea,.sra-exam-answer textarea,#main textarea').forEach(t=>{
      if(t.hidden||t.closest('.cafa-answer-editor,table')||t.id==='study-message'||!t.getClientRects().length)return;
      group(t,'text');
    });
  }
  function owner(field){return groups.get(field.closest('.cafa-answer-editor')||field.closest('table')||field);}
  function cellGrid(table){
    const rows=[],positions=new Map();
    Array.from(table.rows).forEach((row,r)=>{rows[r]||=[];let c=0;
      Array.from(row.cells).forEach(cell=>{while(rows[r][c])c++;positions.set(cell,{r,c});
        for(let y=r;y<r+cell.rowSpan;y++){rows[y]||=[];for(let x=c;x<c+cell.colSpan;x++)rows[y][x]=cell;}c+=cell.colSpan;
      });
    });return {rows,positions};
  }
  function navigate(event,richBody){
    if(!/^Arrow(?:Left|Right|Up|Down)$/.test(event.key)||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
    const doc=event.target.ownerDocument,selection=doc.getSelection();
    let field=event.target.closest?.('input,textarea'),cell,atStart,atEnd;
    if(field){if(!amountField(field)&&!field.matches('input[type="text"],textarea'))return;
      if(field.selectionStart!==field.selectionEnd)return;cell=field.closest('td,th');if(!cell)return;
      atStart=field.selectionStart===0;atEnd=field.selectionEnd===field.value.length;
    }else{
      if(!richBody||!selection?.isCollapsed||!selection.rangeCount)return;
      const range=selection.getRangeAt(0),node=range.startContainer;
      cell=(node.nodeType===1?node:node.parentElement).closest('td,th');if(!cell||!richBody.contains(cell))return;
      const before=range.cloneRange();before.selectNodeContents(cell);before.setEnd(range.startContainer,range.startOffset);
      const after=range.cloneRange();after.selectNodeContents(cell);after.setStart(range.endContainer,range.endOffset);
      atStart=!before.toString().length;atEnd=!after.toString().length;
    }
    const backwards=event.key==='ArrowLeft'||event.key==='ArrowUp';if(backwards?!atStart:!atEnd)return;
    const table=cell.closest('table'),grid=cellGrid(table),pos=grid.positions.get(cell);if(!pos)return;
    const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',step=backwards?-1:1;
    let r=pos.r,c=pos.c;if(horizontal)c+=backwards?-1:cell.colSpan;else r+=backwards?-1:cell.rowSpan;
    let target=null,input=null;
    while(r>=0&&r<grid.rows.length&&c>=0&&c<(grid.rows[r]?.length||0)){
      const candidate=grid.rows[r][c];
      if(candidate&&candidate!==cell){
        input=Array.from(candidate.querySelectorAll('input,textarea')).find(f=>!f.disabled&&!f.readOnly&&f.closest('table')===table);
        if(input||richBody&&candidate.closest('table')===table){target=candidate;break;}
      }
      if(horizontal)c+=step;else r+=step;
    }
    if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(input){input.focus();const offset=backwards?input.value.length:0;try{input.setSelectionRange(offset,offset);}catch{}}
    else{const range=doc.createRange();range.selectNodeContents(target);range.collapse(!backwards);selection.removeAllRanges();selection.addRange(range);richBody.focus();}
    target.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  document.addEventListener('input',event=>{
    if(event.isComposing)return;let g=owner(event.target);if(!g){scan();g=owner(event.target);}if(!g?.check.checked)return;
    const editing=event.inputType?.startsWith('delete')||event.data?.length===1;
    if(event.target.matches('input,textarea'))formatField(event.target,false,editing);
    else if(event.target.matches('.cae-content')&&!g.editor)formatRich(event.target,editing);
  },true);
  document.addEventListener('keydown',e=>navigate(e,e.target.closest?.('.cae-content[contenteditable="true"]')),true);
  window.addEventListener('storage',event=>{if(event.key!==storage)return;
    try{const p=JSON.parse(event.newValue||'{}');preferences={default:p.default!==false,questions:p.questions||{}};updateAll(false);}catch{}
  });
  function attachEditor(editor,host){
    const g=group(host,'editor');g.editor=editor;
    const doc=editor.getDoc(),body=editor.getBody();
    doc.addEventListener('input',event=>{if(!g.check.checked||event.isComposing)return;
      let changed=false;editor.undoManager.transact(()=>{changed=formatRich(body,event.inputType?.startsWith('delete')||event.data?.length===1);});if(changed)editor.dispatch('change');
    },true);
    doc.addEventListener('keydown',e=>navigate(e,body),true);
  }
  let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  const start=()=>{scan();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.StudyAnswerInput={formatted,scan,attachEditor};
})();
