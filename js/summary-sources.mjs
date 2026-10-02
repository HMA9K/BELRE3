export function bundledSectionSources(sections){
 const groups=new Map();
 for(const section of sections){
  const figures=[section.figure,...(section.additionalFigures||[])].filter(Boolean);
  const refs=[...(section.sourceRefs||[]),...(section.foundation?.sourceRefs||[]),...(section.examAnswer?.sourceRefs||[]),...figures.flatMap(figure=>[figure,...(figure.interactive?.sourceRefs||[])])];
  for(const ref of refs){
   const group=groups.get(ref.sourceId)||{sourceId:ref.sourceId,pages:new Set(),locators:new Set()};
   for(const page of ref.pdfPages||[])group.pages.add(page);
   if(ref.locator)group.locators.add(ref.locator);
   groups.set(ref.sourceId,group);
  }
 }
 return [...groups.values()].map(group=>({sourceId:group.sourceId,pdfPages:[...group.pages].sort((a,b)=>a-b),locator:[...group.locators].join('; ')}));
}
