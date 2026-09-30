/** Small safe Markdown renderer: text nodes only, no remote images or executable HTML. */
function inline(target,text,doc) {
  const pattern=/(\\[\\`*_]|`[^`\n]+`|\*\*[^\n]+?\*\*(?!\*)|__[^\n]+?__(?!_)|\*[^*\n]+\*|_[^_\n]+_)/g;let cursor=0;
  for(const match of text.matchAll(pattern)) {
    target.append(doc.createTextNode(text.slice(cursor,match.index)));
    const token=match[0];
    if(token.startsWith('\\'))target.append(doc.createTextNode(token.slice(1)));
    else {
      const isCode=token.startsWith('`'),isBold=token.startsWith('**')||token.startsWith('__'),size=isBold?2:1;
      const el=doc.createElement(isCode?'code':isBold?'strong':'em'),body=token.slice(size,-size);
      if(isCode)el.textContent=body;else inline(el,body,doc);
      target.append(el);
    }
    cursor=match.index+token.length;
  }
  target.append(doc.createTextNode(text.slice(cursor)));
}
// Only explicit review labels receive a status; ordinary prose stays neutral.
function reviewColors(target) {
  for(const node of target.querySelectorAll('p,li,th,td,h3,h4')) {
    if(node.firstElementChild?.tagName==='CODE'&&node.textContent===node.firstElementChild.textContent)continue;
    const label=node.textContent.match(/^\s*(goed|correct|juist|fout|onjuist|incorrect|ontbreekt|onvolledig|deels goed|verbetering)\s*:/i)?.[1].toLowerCase();
    if(!label)continue;
    const status=['goed','correct','juist'].includes(label)?'good':['fout','onjuist','incorrect'].includes(label)?'wrong':'missing';
    node.classList.add('study-review-status',`is-${status}`);
  }
}
export function renderMarkdown(target,text,doc=document,{feedback=false}={}) {
  target.replaceChildren();const lines=String(text).replace(/\r/g,'').split('\n');
  const cells=s=>s.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(x=>x.trim().replace(/\\\|/g,'|'));
  for(let i=0;i<lines.length;) {
    if(!lines[i].trim()){i++;continue;}
    if(lines[i].startsWith('```')){const pre=doc.createElement('pre');let body=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))body.push(lines[i++]);i++;pre.textContent=body.join('\n');target.append(pre);continue;}
    const standardTable=i+1<lines.length && lines[i].includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i+1]) && cells(lines[i+1]).every(x=>/^:?-{3,}:?$/.test(x));
    // Some real answers omit Markdown's separator row. Recognize only our two
    // explicit accounting/calculation headers, keeping ordinary pipe text intact.
    const plainTable=i+1<lines.length && lines[i+1].includes('|') &&
      ['rekening|debet|credit','stap|berekening|uitkomst'].includes(cells(lines[i]).map(x=>x.replaceAll('**','').toLowerCase()).join('|'));
    if(standardTable||plainTable) {
      const wrap=doc.createElement('div');wrap.className='study-table-scroll';wrap.tabIndex=0;
      const table=doc.createElement('table'),head=doc.createElement('thead'),tr=doc.createElement('tr');
      const width=cells(lines[i]).length;
      for(const value of cells(lines[i])){const th=doc.createElement('th');th.scope='col';inline(th,value,doc);tr.append(th);}head.append(tr);table.append(head);i+=standardTable?2:1;
      const body=doc.createElement('tbody');while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()) {
        const row=doc.createElement('tr'),values=cells(lines[i++]);while(values.length<width)values.push('');
        for(const value of values){const td=doc.createElement('td');inline(td,value,doc);row.append(td);}body.append(row);
      }table.append(body);wrap.append(table);target.append(wrap);continue;
    }
    const heading=lines[i].match(/^(#{1,4})\s+(.+?)\s*#*$/);
    if(heading){const h=doc.createElement(heading[1].length===1?'h3':'h4');inline(h,heading[2],doc);target.append(h);i++;continue;}
    const listItem=s=>s.match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.+)$/);
    const bullet=listItem(lines[i]);
    if(bullet){
      const ordered=!!bullet[2],list=doc.createElement(ordered?'ol':'ul');
      if(ordered&&Number(bullet[2])!==1)list.start=Number(bullet[2]);
      while(i<lines.length){const item=listItem(lines[i]);if(!item||!!item[2]!==ordered)break;
        const li=doc.createElement('li');inline(li,item[3],doc);list.append(li);i++;
      }target.append(list);continue;
    }
    if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])){target.append(doc.createElement('hr'));i++;continue;}
    if(/^\s*>\s?/.test(lines[i])){
      const quote=doc.createElement('blockquote');
      while(i<lines.length&&/^\s*>/.test(lines[i])){const p=doc.createElement('p');inline(p,lines[i++].replace(/^\s*>\s?/,''),doc);quote.append(p);}
      target.append(quote);continue;
    }
    const p=doc.createElement('p');inline(p,lines[i++],doc);target.append(p);
  }
  if(feedback)reviewColors(target);
}
