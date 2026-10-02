// Presentation decisions use the reviewed paragraph order, never a guess from
// words in the legal text. Indices refer to the existing source paragraphs.
const mainParagraphs={
  'c12-bp-stelsel':[5], 'c12-bp-stichting':[5], 'c12-winst-aftrek':[6],
  'c3-lening-deelnemerschap':[3], 'c3-lening-onzakelijk':[4],
  'c3-drain-heffing':[5], 'c3-earn-berekening':[6],
  'c45-dvs-kosten':[3,5], 'c45-dvs-omzetting':[3], 'c45-liq-concern':[3],
  'c67-voeg-liquidatie':[3], 'c67-anti-uitzonderingen':[3],
  'c67-verlies-volgorde':[3], 'c8-tp-methoden':[2],
  'c8-tp-mismatch':[3,5], 'c9-ht-convenanten':[3,4,5]
};
const noteParents={
  'c12-bp-stichting':{2:6,3:6,7:6},
  'c12-bp-overheid':{4:1},
  'c12-winst-vv':{2:4,3:8,6:5,7:9},
  'c12-winst-aftrek':{3:5},
  'c12-winst-vpb-commissaris':{2:4,3:4},
  'c12-verlies-carryback-herwaardering':{2:4},
  'c12-inno-administratie':{2:4,5:4},
  'c3-lening-deelnemerschap':{2:3},
  'c3-drain-verbonden':{2:4,5:4,6:4},
  'c3-drain-heffing':{2:5,6:3},
  'c3-earn-berekening':{2:6},
  'c3-earn-geactiveerd':{2:4},
  'c45-dvs-heffing':{2:5},
  'c45-liq-formule':{2:5},
  'c45-liq-tijdstip':{2:4},
  'c45-liq-concern':{2:1,4:1},
  'c45-fusie-voorwaarden':{2:5},
  'c45-fusie-rekenen':{2:4,5:4,6:3},
  'c67-voeg-ontvoegbalans':{2:6},
  'c67-anti-uitzonderingen':{2:4,5:4},
  'c67-verlies-soorten':{2:5},
  'c8-tp-methoden':{15:10,16:10,17:9},
  'c8-tp-rekenen':{3:6,4:1,5:1},
  'c8-tp-mismatch':{2:8,10:7},
  'c8-hyb-secundair':{6:4},
  'c8-int-belastingplicht':{2:5,6:1,7:4},
  'c8-int-vi':{6:5,8:4},
  'c8-int-bronbelasting':{4:1,6:1},
  'c9-ht-tcf':{2:4,3:5},
  'c9-ht-voordelen':{3:5,4:1},
  'c9-eth-juridisch':{2:3,7:6},
  'c9-eth-casus':{2:4,3:4}
};

export function displayReadingTitle(title){return title.replace(/^\d+[.)]\s*/, '').trim();}

export function readingLayout(section){
  const paragraphs=section.readingGuide?.paragraphs||[];
  const main=new Set(paragraphs.flatMap((paragraph,index)=>['explanation','condition'].includes(paragraph.tone)?[index+1]:[]));
  for(const index of mainParagraphs[section.id]||[])main.add(index);
  // A page devoted to a worked calculation keeps its calculation as main text.
  if(!main.size)for(const [index,paragraph] of paragraphs.entries())if(paragraph.tone==='example')main.add(index+1);
  if(!main.size&&paragraphs.length)main.add(1);
  let previous=[...main].sort((a,b)=>a-b)[0];
  return paragraphs.map((paragraph,index)=>{
    const position=index+1,note=!main.has(position);
    if(!note)previous=position;
    const parent=note?(noteParents[section.id]?.[position]||previous):position;
    if(!main.has(parent))throw Error('Leerkader heeft geen hoofdparagraaf: '+section.id+'/'+position);
    return {position,note,parent,title:displayReadingTitle(paragraph.heading)};
  });
}
