const labels={condition:'Voorwaarden controleren',exception:'Let op',example:'Voorbeeld'};
const coreBlockSections=new Set(['c3-lening-route','c3-lening-deelnemerschap','c45-dvs-meesleep','c45-dvs-toetsen','c45-fusie-vormen','c67-alg-afwegen','c67-voeg-waardering','c67-verlies-volgorde','c8-tp-methoden','c8-hyb-aanvullend','c8-int-beginselen','c8-int-methodes','c9-ht-voordelen','c9-eth-visies']);

// The original explanation stays intact. Editorial metadata supplies headings
// and short, reviewed phrases; emphasis never depends on a legal keyword guess.
export function presentationParts(section,doc=document,outline){
  const template=doc.createElement('template');
  template.innerHTML=section.bodyHtml;
  const output=doc.createElement('div');output.className='summary-prose';
  let block=output,index=0,coreBlockClaimed=false;
  for(const node of [...template.content.childNodes]){
    if(node.nodeType===1&&node.tagName==='P'){
      const guide=section.readingGuide?.paragraphs[index++];
      if(guide){
        block=doc.createElement('section');
        block.className='summary-reading-block summary-reading-'+guide.tone;
        if(labels[guide.tone]){
          const label=doc.createElement('span');label.className='summary-reading-label';
          label.textContent=labels[guide.tone];
          const entry=outline?.paragraphs[index-1];
          if(guide.tone==='example'&&entry?.parentId){
            label.append(' · ');const link=doc.createElement('button');link.type='button';link.className='summary-example-parent';link.dataset.readingOrder=entry.parentId;link.textContent='bij paragraaf '+entry.parentNumber;label.append(link);
          }
          block.append(label);
        }
        const heading=doc.createElement('h4');heading.textContent=guide.heading;
        const entry=outline?.paragraphs[index-1];
        if(entry){
          heading.id=entry.id;if(entry.number)heading.dataset.number=entry.number;
          heading.dataset.summaryLocation=(entry.example?'Voorbeeld bij '+entry.parentNumber+' · ':entry.number+' ')+guide.heading;
          heading.dataset.readingSection=section.id;heading.tabIndex=-1;heading.setAttribute('aria-label',heading.dataset.summaryLocation);
        }
        block.append(heading);output.append(block);
        emphasize(node,guide.emphasis||[],doc);
      }
    }
    if(node.nodeType===1&&node.tagName!=='P'&&coreBlockSections.has(section.id)&&!coreBlockClaimed){
      output.append(node);coreBlockClaimed=true;
    }else block.append(node);
  }
  const examples=doc.createElement('div');examples.className='summary-prose summary-applications';
  for(const child of [...output.children])if(child.classList.contains('summary-reading-example'))examples.append(child);
  return {explanationHtml:output.outerHTML,examplesHtml:examples.outerHTML,hasExamples:examples.children.length>0};
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
