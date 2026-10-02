// Percentages refer to the untouched source slide. Keep parties, arrows and
// boundary lines together; the complete source remains available separately.
const crops={
 'c12-bp-vestiging':[[9,23,79,59],[7,30,89,56],[7,32,81,54]],
 'c12-bp-stichting':[[22,22,71,34]],
 'c12-bp-overheid':[[4,21,94,63],[10,24,88,62]],
 'c12-bp-hybride':[[23,52,43,37]],
 'c12-winst-uitdeling':[[5,19,88,65]],
 'c3-lening-mismatch':[[13,43,59,43]],
 'c3-drain-toegang':[[59,38,34,44],[61,36,37,48],[55,30,42,55]],
 'c3-drain-laagrentend':[[0,0,73,63]],
 'c45-dvs-basis':[[5,18,65,66],[6,15,89,55]],
 'c45-dvs-meesleep':[[54,28,45,60],[59,24,39,65]],
 'c45-dvs-kosten':[[4,17,91,59]],
 'c45-dvs-omzetting':[[4,23,79,58]],
 'c45-liq-formule':[[4,20,92,69]],
 'c45-liq-concern':[[39,26,49,58],[37,26,57,60]],
 'c45-fusie-vormen':[[10,23,74,61],[3,18,86,62]],
 'c45-fusie-voorwaarden':[[5,30,91,57]],
 'c45-fusie-splitsing':[[4,20,84,37],[4,19,85,42],[4,19,69,42],[4,19,65,51]],
 'c67-alg-papillon':[[15,47,53,40],[5,37,67,52]],
 'c67-voeg-rekenvoorbeeld':[[5,21,92,60]],
 'c67-anti-trigger':[[7,18,76,61]],
 'c67-verlies-soorten':[[50,10,49,79]],
 'c67-verlies-winstsplitsing':[[50,0,49,89]],
 'c67-verlies-miljoenen':[[9,22,60,39]],
 'c67-verlies-herverdeling':[[10,22,63,42]],
 'c8-hyb-primair':[[3,41,93,45]],
 'c8-hyb-secundair':[[3,34,93,52]],
 'c8-int-belastingplicht':[[7,19,80,70]],
 'c9-tp-afbakening':[[16,2,77,84]],
 'c3-lening-route':[[5,12,91,72]],
 'c12-winst-vv':[[5,18,89,70]],
 'c12-winst-boekingen':[[0,4,96,84]],
 'c45-dvs-toetsen':[[5,12,89,77]],
 'c67-alg-werking':[[9,22,86,64]],
 'c9-ht-tcf':[[14,20,73,67],[21,24,58,58]]
};
export function figureCrop(section){
 const match=section.id.match(/^(.*?)(?:--(\d+))?$/);
 return crops[match[1]]?.[Number(match[2]||0)]||[4,12,92,77];
}
export function validateFigureCrop(section){
 const [x,y,w,h]=figureCrop(section);
 if(x<0||y<0||w<=0||h<=0||x+w>100||y+h>100)throw Error('Ongeldige schemauitsnede: '+section.id);
}

// This heading belongs to the omitted prose column, outside the diagram.
export function figureMasks(section){
 return section.id==='c67-verlies-winstsplitsing'?[[50,5,19,13]]:[];
}
