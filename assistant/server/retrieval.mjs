/** Local retrieval over the exact, approved PDF corpus. No external search. */
const stop=new Set('de het een en van voor met aan op in is zijn als bij om te dat dit die wat hoe waarom ik je mijn deze welke wordt worden uit ook of dan niet wel kan geef leg over naar door er'.split(' '));
export function terms(text){return [...new Set(String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[])].filter(t=>t.length>1&&!stop.has(t)).slice(0,100);}
export function createSearch(corpus){
  const docs=corpus.pages.filter(p=>p.text.trim()).map(p=>{const source=corpus.sources[p.sourceId];const words=terms(p.text+' '+source.title);return {...p,title:source.title,url:'/oefenen/content/'+source.url+'#page='+p.page,words:new Set(words),allWords:new Set(String(p.text+' '+source.title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[])};});
  const frequencies=new Map();for(const p of docs)for(const word of p.allWords)frequencies.set(word,(frequencies.get(word)||0)+1);
  const view=p=>({id:p.sourceId+':'+p.page,sourceId:p.sourceId,title:p.title,page:p.page,url:p.url,text:p.text.slice(0,12000)});
  function search(query,{sourceId='',page=0,limit=6}={}){
    const words=terms(query),selected=sourceId?docs.filter(p=>p.sourceId===sourceId):docs;
    if(page&&sourceId)return selected.filter(p=>p.page===page).map(view);
    const scored=selected.map(p=>({p,score:words.reduce((s,t)=>s+(p.allWords.has(t)?Math.log(1+docs.length/(frequencies.get(t)||1))*(p.title.toLowerCase().includes(t)?1.7:1):0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.p.page-b.p.page);
    const perSource=new Map();return scored.filter(({p})=>{const n=perSource.get(p.sourceId)||0;if(n>=3&&!sourceId)return false;perSource.set(p.sourceId,n+1);return true;}).slice(0,Math.max(1,Math.min(8,limit))).map(({p})=>view(p));
  }
  function referenced(refs,query){const out=[];for(const ref of refs||[])for(const page of ref.pdfPages||[])out.push(...search(query,{sourceId:ref.sourceId,page}));const words=terms(query);return [...new Map(out.map(p=>[p.id,p])).values()].sort((a,b)=>words.reduce((n,t)=>n+(b.text.toLowerCase().includes(t)?1:0)-(a.text.toLowerCase().includes(t)?1:0),0)).slice(0,7);}
  return {search,referenced,documents:Object.values(corpus.sources).map(s=>({id:s.id,title:s.title,pages:s.pages}))};
}
