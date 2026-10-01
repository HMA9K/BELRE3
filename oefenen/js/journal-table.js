(function(){
  'use strict';
  var columns=['Omschrijving grootboekrekening','Debet','Credit','Ruimte voor eventuele toelichting'];
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function supports(q){return !!q && q.answerPresentation==='journal_table';}
  function normalize(rows){return Array.from({length:Math.max(8,Math.min(100,Array.isArray(rows)?rows.length:0))},function(_,i){return columns.map(function(_,j){return rows&&Array.isArray(rows[i])&&typeof rows[i][j]==='string'?rows[i][j]:'';});});}
  // Identify journal columns by their headings, never by the amounts or caption.
  // A balance with Debet/Bedrag/Credit/Bedrag is a different table.
  function enhance(root){
    root.querySelectorAll('table:not(.journal-table)').forEach(function(table){
      var heads=table.tHead&&table.tHead.rows[0];if(!heads)return;
      var labels=Array.from(heads.cells,function(c){return c.textContent.trim();});
      var currency=labels.length===5&&/^(USD|GBP|CHF|JPY|Valuta)$/i.test(labels[1])&&/^Koers$/i.test(labels[2]);
      var debit=currency?3:1,credit=currency?4:2;
      if(!currency&&labels.length!==3&&labels.length!==4)return;
      if(!/^(Omschrijving(?: grootboekrekening)?|Rekening(?: \/ toelichting)?|Grootboekrekening|Post)$/i.test(labels[0])||!/^Debet(?:\s*\(€\))?$/i.test(labels[debit])||!/^Credit(?:\s*\(€\))?$/i.test(labels[credit]))return;
      if(!currency&&labels.length===4&&!/^(Punten|Puntentoekenning|Score|Normering)$/i.test(labels[3]))return;
      if(table.classList.contains('journal-display-table'))return;
      table.classList.add('journal-display-table');
      if(labels.length===4)table.classList.add('journal-display-with-points');
      if(currency)table.classList.add('journal-display-with-currency');
      var classes=currency?['journal-account-column','journal-currency-column','journal-rate-column','journal-debit-column','journal-credit-column']:['journal-account-column','journal-debit-column','journal-credit-column','journal-points-column'];
      var cols=document.createElement('colgroup');labels.forEach(function(_,i){var col=document.createElement('col');col.className=classes[i];cols.appendChild(col);});
      Array.from(table.children).filter(function(c){return c.tagName==='COLGROUP';}).forEach(function(c){c.remove();});
      if(table.caption)table.caption.after(cols);else table.prepend(cols);
      // Older transcriptions hid these headers as if this were a calculation.
      table.tHead.classList.remove('exam-accessible-head');
      var wrap=table.parentElement;
      if(!wrap.matches('.table-wrap,.journal-display-scroll,.exam-model-table-scroll')){wrap=document.createElement('div');table.before(wrap);wrap.appendChild(table);}
      wrap.classList.add('journal-display-scroll');wrap.tabIndex=0;wrap.setAttribute('aria-label','Journaalpost, horizontaal schuifbaar');
    });
  }
  function render(rows,readonly){rows=normalize(rows);return '<div class="journal-scroll" tabindex="0" aria-label="Journaalpostentabel, horizontaal schuifbaar"><table class="journal-table"><thead><tr>'+columns.map(function(c){return '<th scope="col">'+c.replace('grootboekrekening','grootboek<wbr>rekening')+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row,i){return '<tr>'+row.map(function(cell,j){return '<td>'+(readonly?'<span>'+esc(cell)+'</span>':'<input type="text" '+(j===1||j===2?'inputmode="decimal" ':'')+'aria-label="Rij '+(i+1)+', '+columns[j]+'" data-journal-row="'+i+'" data-journal-col="'+j+'" value="'+esc(cell)+'">')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>'+(readonly?'':'<button type="button" class="btn journal-add">+ Rij toevoegen</button>');}
  function mount(host,rows,onChange){
    var current=normalize(rows),selected=null;host.innerHTML=render(current,false);
    host.addEventListener('focusin',function(e){
      if(e.target.matches('[data-journal-row]'))selected={row:Number(e.target.dataset.journalRow),col:Number(e.target.dataset.journalCol)};
      else if(!e.target.closest('.journal-add'))selected=null;
    });
    host.addEventListener('focusout',function(e){
      if(!e.relatedTarget||!host.contains(e.relatedTarget)||!e.relatedTarget.matches('[data-journal-row],.journal-add'))selected=null;
    });
    host.addEventListener('input',function(e){if(!e.target.matches('[data-journal-row]'))return;current[Number(e.target.dataset.journalRow)][Number(e.target.dataset.journalCol)]=e.target.value;onChange(current.map(function(r){return r.slice();}));});
    host.addEventListener('click',function(e){
      if(!e.target.closest('.journal-add')||current.length>=100)return;
      var index=selected?selected.row+1:current.length,col=selected?selected.col:0;
      current.splice(index,0,['','','','']);host.innerHTML=render(current,false);
      onChange(current.map(function(r){return r.slice();}));
      host.querySelector('[data-journal-row="'+index+'"][data-journal-col="'+col+'"]').focus();
    });
  }
  window.CafaJournalTable={supports:supports,normalize:normalize,render:render,mount:mount,enhance:enhance};
}());
