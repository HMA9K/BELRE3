import {contentBase} from '../config.mjs';
const [sourceResponse,examResponse]=await Promise.all(['sources','exams'].map(name=>fetch(new URL(name+'.json',contentBase))));
if(!sourceResponse.ok||!examResponse.ok)throw new Error('PDF-bronnen konden niet worden geladen.');
const [sources,exams]=await Promise.all([sourceResponse.json(),examResponse.json()]);
const file=source=>({...source,url:new URL(source.url,contentBase).href});
// Source aliases stay first, preserving the annotation store keys resolved by URL.
export const originalPdfs=Object.fromEntries(Object.values(sources).map(source=>[source.id,{documentOnly:true,questions:file(source),solutions:file(source)}]));
for(const exam of exams){
  const find=role=>{const ref=exam.pdfReferences.find(ref=>ref.role===role),source=ref&&sources[ref.sourceId];return source?file(source):{url:null,reason:'Deze bron-PDF is niet beschikbaar.'};};
  originalPdfs[exam.id]={date:exam.date,questions:find('questions'),solutions:find('model_solution')};
}
