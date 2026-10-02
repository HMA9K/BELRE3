import {readingLayout} from './summary-layout.mjs';

// The original explanation stays intact. Editorial metadata supplies headings
// and short, reviewed phrases; emphasis never depends on a legal keyword guess.
export function presentationParts(section,doc=document,outline){
  const template=doc.createElement('template');
  template.innerHTML=section.bodyHtml;
  const output=doc.createElement('div');output.className='summary-prose summary-reading-flow';
  const layout=readingLayout(section),blocks=[];
  let block,index=0;
  for(const node of [...template.content.childNodes]){
    if(node.nodeType===1&&node.tagName==='P'){
      const guide=section.readingGuide?.paragraphs[index++];
      if(guide){
        const placement=layout[index-1];
        block=doc.createElement(placement.note?'aside':'section');
        block.className='summary-reading-block summary-reading-'+guide.tone+(placement.note?' summary-reading-note':' summary-reading-main-block');
        const heading=doc.createElement(placement.note?'h5':'h4');
        const alreadyLabelled=/^(?:(?:Uitgewerkt\s+|Oefen|Tentamen|College|Slide|Reken)?voorbeeld|Casus|Oefencasus)\b/i.test(placement.title);
        heading.textContent=(placement.note?(guide.tone==='exception'?'Let op: ':alreadyLabelled?'':'Voorbeeld: '):'')+placement.title;
        const entry=outline?.paragraphs[index-1];
        if(entry){
          heading.id=entry.id;if(entry.number)heading.dataset.number=entry.number;
          heading.dataset.summaryLocation=(entry.note?(guide.tone==='exception'?'Let op':'Voorbeeld')+' bij '+entry.parentNumber+' · ':entry.number+' ')+placement.title;
          heading.dataset.readingSection=section.id;heading.tabIndex=-1;heading.setAttribute('aria-label',heading.dataset.summaryLocation);
        }
        block.append(heading);blocks.push({block,placement});
        node.dataset.readingParagraph=String(index);
        emphasize(node,guide.emphasis||[],doc);
      }
    }
    (block||output).append(node);
  }
  const units=new Map();
  for(const item of blocks.filter(item=>!item.placement.note)){
    const unit=doc.createElement('div');unit.className='summary-reading-unit';unit.dataset.readingUnit=String(item.placement.position);
    const main=doc.createElement('div');main.className='summary-reading-main';main.append(item.block);unit.append(main);output.append(unit);
    units.set(item.placement.position,unit);
  }
  for(const item of blocks.filter(item=>item.placement.note)){
    const unit=units.get(item.placement.parent);
    const wide=Boolean(item.block.querySelector('table'))||item.block.textContent.length>1250||Boolean(unit.querySelector('.summary-reading-wide'));
    let notes=unit.querySelector(wide?'.summary-reading-wide':'.summary-reading-side');
    if(!notes){notes=doc.createElement('div');notes.className=wide?'summary-reading-wide':'summary-reading-side';unit.append(notes);}
    notes.append(item.block);if(!wide)unit.classList.add('summary-reading-with-notes');
    const entry=outline?.paragraphs[item.placement.position-1];
    if(entry?.parentId){const reference=doc.createElement('button');reference.type='button';reference.className='summary-example-parent summary-note-reference';reference.dataset.readingOrder=entry.parentId;reference.textContent='Bij '+entry.parentNumber;item.block.append(reference);}
  }
  // Keep a long stack of notes from creating an empty column. The first note
  // stays beside its rule; the remaining short notes can share the next row.
  for(const unit of units.values()){
    const side=unit.querySelector('.summary-reading-side');
    if(side&&(side.children.length>2||side.textContent.length>1100)){
      let wide=unit.querySelector('.summary-reading-wide');
      if(!wide){wide=doc.createElement('div');wide.className='summary-reading-wide';unit.append(wide);}
      const overflow=[...side.children].slice(1);
      for(const note of overflow)note.classList.add('summary-reading-wide-card');
      wide.prepend(...overflow);
    }
  }
  let previousUnit;
  for(const unit of [...output.children].filter(node=>node.classList.contains('summary-reading-unit'))){
    if(previousUnit&&!unit.querySelector('.summary-reading-side,.summary-reading-wide')&&!previousUnit.querySelector('.summary-reading-side,.summary-reading-wide')){
      previousUnit.querySelector('.summary-reading-main').append(...unit.querySelector('.summary-reading-main').children);unit.remove();
    }else previousUnit=unit;
    if(previousUnit.querySelector('.summary-reading-main table'))previousUnit.classList.add('summary-reading-full');
  }
  // Let the next prose paragraphs use the space beside a taller note. The
  // original paragraph and note order is retained for narrow screens.
  let group;
  for(const unit of [...output.children]){
    if(!unit.classList.contains('summary-reading-unit')||unit.querySelector('.summary-reading-wide,.summary-reading-main :is(table,ul,ol)')){group=null;continue;}
    if(unit.querySelector('.summary-reading-side')){
      group=doc.createElement('div');group.className='summary-reading-group';
      unit.before(group);group.append(unit);
    }else if(group)group.append(unit);
  }
  return {explanationHtml:output.outerHTML,hasExamples:blocks.some(item=>section.readingGuide.paragraphs[item.placement.position-1].tone==='example')};
}

function emphasize(paragraph,phrases,doc){
  // Apply each phrase once, without changing whitespace or splitting links.
  for(const phrase of phrases){
    const walker=doc.createTreeWalker(paragraph,4),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement.closest('strong,em,a,button,mark'))continue;
      const at=node.data.toLocaleLowerCase('nl').indexOf(phrase.toLocaleLowerCase('nl'));
      if(at<0)continue;
      const range=doc.createRange();range.setStart(node,at);range.setEnd(node,at+phrase.length);
      const strong=doc.createElement('strong');strong.className='summary-key-term';
      if(/[€%]/.test(phrase))strong.classList.add('summary-key-number');
      range.surroundContents(strong);break;
    }
  }
}
