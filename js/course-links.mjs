export const colleges=[
  ['c12','1 en 2','Belastingplicht en winst'],
  ['c3','3','Leningen en renteaftrek'],
  ['c45','4 en 5','Deelnemingen en reorganisaties'],
  ['c67','6 en 7','Fiscale eenheid'],
  ['c8','8','Internationaal en verrekenprijzen'],
  ['c9','9','Toezicht, strategie en ethiek']
];
export const pages={home:'Home',sam:'Leerstof en uitleg',beslisbomen:'Beslisbomen',kleur:'Kleur & tentamenanalyse',art:'Wet op de vennootschapsbelasting 1969',paars:'Kleur & tentamenanalyse',tent:'Tentamenindeling',exam:'Tentamens (oude weergave)',oef:'Oefenbundel'};
export const summaryTopics={
  belastingplicht:'c12-bp',winstbegrip:'c12-winst',zakelijkheidsbeginsel:'c12-winst',vermogensvergelijking:'c12-winst',verliesverrekening:'c12-verlies',innovatiebox:'c12-inno',
  leningen:'c3-lening',renteaftrek:'c3-drain',earningsstripping:'c3-earn',deelnemingsvrijstelling:'c45-dvs',liquidatieverlies:'c45-liq','fusie-splitsing':'c45-fusie',
  'fiscale-eenheid':'c67-alg','voeging-ontvoeging':'c67-voeg','fe-verliesverrekening':'c67-verlies','transfer-pricing':'c8-tp','mismatches-cfc':'c8-hyb','internationaal-europees':'c8-int','fiscale-strategie-toezicht-ethiek':'c9-ht'
};
export const summaryUrl=topic=>'/index.html#pagina/sam/'+(summaryTopics[topic]||'');

// Some subjects span several reading tabs. All parts must be marked explicitly.
export function summaryStudyParts(topic){
  if(topic==='voeging-ontvoeging')return ['c67-voeg','c67-anti'];
  if(topic==='fiscale-strategie-toezicht-ethiek')return ['c9-ht','c9-tp','c9-eth'];
  return summaryTopics[topic]?[summaryTopics[topic]]:[];
}
