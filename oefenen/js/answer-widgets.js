(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const headings = ['Activa','Bedrag','Passiva','Bedrag'];
  function strokes(value) {
    return Array.isArray(value) ? value.slice(0,500).filter(s=>Array.isArray(s)&&s.length>1).map(s=>s.slice(0,5000).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(p=>[Math.max(0,Math.min(1000,p[0])),Math.max(0,Math.min(500,p[1]))])) : [];
  }
  function balance(cells, readonly, rows=12, prefix='', caption='Fiscale balans') {
    return '<div class="belre-balance-scroll"><table class="belre-balance"><caption>'+esc(caption)+'</caption><thead><tr>'+headings.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:rows},(_,r)=>'<tr>'+headings.map((h,c)=>{
      const key=prefix+'r'+r+'c'+c,value=esc(cells[key]||''),label=['Activa','Bedrag activa','Passiva','Bedrag passiva'][c];
      return '<td>'+(readonly?value:'<input data-balance-cell="'+key+'" aria-label="'+esc(caption)+', '+label+', rij '+(r+1)+'" value="'+value+'" autocomplete="off">')+'</td>';
    }).join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function rowCount(cells,prefix=''){return Math.min(100,Math.max(12,...Object.keys(cells).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length)).map(k=>/^r(\d+)c[0-3]$/.test(k)?Number(k.match(/^r(\d+)/)[1])+1:0)));}
  function balanceGroups(q,cells){return Array.from({length:q.balanceCount===2?2:1},(_,i)=>{const prefix=q.balanceCount===2?'b'+i+'-':'';return {prefix,caption:q.balanceCount===2?'Fiscale balans vennootschap '+(i+1):'Fiscale balans',rows:rowCount(cells,prefix)};});}
  function render(q,answer) {
    if(q.answerPresentation==='balance_table')return balanceGroups(q,answer.stockCells||{}).map(g=>balance(answer.stockCells||{},true,g.rows,g.prefix,g.caption)).join('');
    if(q.answerPresentation==='drawing')return '<svg class="belre-drawing-review" viewBox="0 0 1000 500" role="img" aria-label="Je getekende schema">'+strokes(answer.drawing).map(s=>'<polyline fill="none" stroke="#273c50" stroke-width="3" points="'+s.map(p=>p.join(',')).join(' ')+'"/>').join('')+'</svg>';
    return '';
  }
  function mount(host,q,answer,onChange) {
    if(!['balance_table','drawing'].includes(q.answerPresentation))return host;
    const widget=document.createElement('div');host.append(widget);
    if(q.answerPresentation==='balance_table'){
      const cells={...(answer.stockCells||{})},groups=balanceGroups(q,cells);
      function paint(){widget.innerHTML=groups.map((g,i)=>balance(cells,false,g.rows,g.prefix,g.caption)+'<button type="button" class="btn" data-balance-row="'+i+'">Rij toevoegen</button>').join('');}
      paint();
      widget.addEventListener('input',e=>{if(e.target.matches('[data-balance-cell]')){cells[e.target.dataset.balanceCell]=e.target.value;onChange({stockCells:{...cells}});}});
      widget.addEventListener('click',e=>{const button=e.target.closest('[data-balance-row]');if(!button)return;const g=groups[Number(button.dataset.balanceRow)];if(g&&g.rows<100){g.rows++;paint();widget.querySelector('[data-balance-cell="'+g.prefix+'r'+(g.rows-1)+'c0"]').focus();}});
    }else{
      let drawing=strokes(answer.drawing),active=null;
      widget.innerHTML='<p class="small">Teken het gevraagde schema. Gebruik de toelichting voor namen, percentages of een beschrijving in tekst.</p><canvas class="belre-drawing" width="1000" height="500" tabindex="0" aria-label="Tekenruimte voor het schema. Een tekstuele beschrijving kan in de toelichting hieronder."></canvas><div class="actions"><button type="button" class="btn" data-draw-undo>Laatste lijn verwijderen</button><button type="button" class="btn" data-draw-clear>Tekening wissen</button></div>';
      const canvas=widget.querySelector('canvas'),ctx=canvas.getContext('2d');
      function paint(){ctx.clearRect(0,0,1000,500);ctx.strokeStyle='#273c50';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';for(const s of drawing){ctx.beginPath();s.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}}
      function point(e){const b=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1000,(e.clientX-b.left)*1000/b.width)),Math.max(0,Math.min(500,(e.clientY-b.top)*500/b.height))];}
      canvas.onpointerdown=e=>{if(e.button!==0||drawing.length>=500)return;active=[point(e)];drawing.push(active);canvas.setPointerCapture(e.pointerId);e.preventDefault();};
      canvas.onpointermove=e=>{if(active&&active.length<5000){active.push(point(e));paint();}};
      const finish=()=>{if(!active)return;if(active.length===1)active.push([active[0][0]+.1,active[0][1]]);active=null;paint();onChange({drawing:strokes(drawing)});};
      canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onlostpointercapture=finish;
      widget.addEventListener('click',e=>{if(e.target.closest('[data-draw-undo]'))drawing.pop();else if(e.target.closest('[data-draw-clear]'))drawing=[];else return;paint();onChange({drawing:strokes(drawing)});});paint();
    }
    const notes=document.createElement('details');notes.className='stock-notes';notes.open=!!answer.html;
    notes.innerHTML='<summary>Toelichting of berekening toevoegen</summary><div></div>';host.append(notes);
    return notes.querySelector('div');
  }
  window.BelreAnswerWidgets={mount,render};
})();
