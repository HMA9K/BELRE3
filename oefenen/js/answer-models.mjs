import {scoringRanges} from './answer-model-core.mjs';

const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();
function readText(node){
  if(node.nodeType===3)return node.data;
  if(node.nodeType!==1&&node.nodeType!==11)return '';
  if(node.nodeName==='BR')return ' ';
  return [...node.childNodes].map(readText).join('')+(/^(?:P|DIV|LI|H[2-4]|TR)$/.test(node.nodeName)?' ':'');
}
function fragment(html){const template=document.createElement('template');template.innerHTML=html;return template.content;}
function pointColumn(node){
  const cell=node.parentElement?.closest('td'),table=cell?.closest('table');
  return !!table&&/punten|score|normering/i.test(table.querySelector('thead tr')?.children[cell.cellIndex]?.textContent||'');
}
function markScoring(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(node.parentElement?.closest('.exam-source-points'))continue;
    const ranges=scoringRanges(node.data,{pointsColumn:pointColumn(node)});if(!ranges.length)continue;
    const out=document.createDocumentFragment();let cursor=0;
    for(const r of ranges){
      out.append(document.createTextNode(node.data.slice(cursor,r.start)));
      const span=document.createElement('span');span.className='exam-source-points';span.textContent=r.text;out.append(span);cursor=r.end;
    }
    out.append(document.createTextNode(node.data.slice(cursor)));node.replaceWith(out);
  }
}
function enhance(root){
  for(const table of root.querySelectorAll('table')){
    const wrapper=document.createElement('div');wrapper.className='exam-model-table-scroll';wrapper.tabIndex=0;
    wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Tabel in het antwoordmodel');
    table.before(wrapper);wrapper.append(table);table.classList.add('exam-model-table');table.dataset.tableStatic='true';
    const headings=[...table.querySelectorAll('thead th')].map(h=>h.textContent);
    if(headings.includes('Debet')&&headings.includes('Credit')){
      table.classList.add('exam-model-journal');
      table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].slice(1).forEach(cell=>cell.classList.add('exam-model-amount')));
    }else if(headings.length===2&&/Bedrag/.test(headings[1])&&!/Berekening/.test(headings[1])){
      table.querySelectorAll('tbody tr').forEach(row=>row.cells[1]?.classList.add('exam-model-amount'));
    }
    table.querySelectorAll('tbody tr').forEach(row=>{if(/^(?:totaal|belastbaar|fiscale winst)/i.test(row.cells[0]?.textContent||''))row.classList.add('exam-model-total');});
  }
  for(const p of root.querySelectorAll('p')){
    if(/^(?:Oefenactualisatie|2026-oefenactualisatie)/.test(p.textContent))p.classList.add('exam-model-context');
  }
  const drawing=[...root.querySelectorAll('h3')].find(h=>h.textContent==='Aandelenstructuur na de bedrijfsfusie');
  drawing?.nextElementSibling?.classList.add('exam-model-ownership');
  markScoring(root);
}

export function createAnswerModels(exams,sanitize){
  const registry=new Map(exams.flatMap(exam=>exam.questions).map(q=>[q.id,{q}]));
  return {
    render(id,html,plain){
      const safe=sanitize(html||'<p>'+String(plain||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</p>');
      const entry=registry.get(id);
      // Validate the original model on its first use rather than parsing every model at startup.
      if(entry&&entry.text===undefined)entry.text=normalize(readText(fragment(sanitize(entry.q.solutionHtml))));
      const same=entry&&entry.text===normalize(readText(fragment(safe)));
      const root=document.createElement('div');root.className='exam-source-document exam-source-solution';
      root.innerHTML=same&&entry.q.solutionPresentationHtml?sanitize(entry.q.solutionPresentationHtml):safe;
      if(same){
        const total=document.createElement('p');total.className='exam-model-max-points';
        total.append('Maximaal ');const points=document.createElement('span');points.className='exam-source-points';points.textContent=entry.q.points+(Number(entry.q.points)===1?' punt':' punten');total.append(points);root.prepend(total);
      }
      enhance(root);return root.outerHTML;
    }
  };
}
