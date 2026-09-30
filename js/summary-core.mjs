/** Exact source matching: ignore PDF line wraps, never replace statutory wording. */
export const normalized=text=>String(text).replace(/\s+/gu,' ').trim().toLocaleLowerCase('nl');
/** A historical example needs its own explicit Vpb attribution, not a nearby article of another law. */
export function mentionsVpbArticle(text,number){
  const article=String(number).toLocaleLowerCase('nl');
  if(!/^\d+[a-z]*$/u.test(article))return false;
  const source=normalized(text);
  const references=[...source.matchAll(/\b(?:artikelen|artikel|art)\.?\s*(\d+[a-z]*(?:\s*\.\s*\d+[a-z]*)?)(?![a-z0-9]|\s*\.\s*\d)/gu)];
  for(let i=0;i<references.length;i++){
    const reference=references[i];if(reference[1]!==article)continue;
    const start=reference.index+reference[0].length;
    const context=source.slice(start,Math.min(start+180,references[i+1]?.index??source.length));
    // Recognize the first law name. A generic/foreign law marker is deliberately inconclusive.
    const statute=context.match(/\b(?:w\s*et(?:\s+op\s+de)?\s+(?:vpb|vennootschapsbelasting)|vpb|vennootschapsbelasting|[a-z]*wet|w\s+et|awr|ib|lb|ob|bw|awb|vweu|bvdb|besluit|verdrag|wetboek)\b/u);
    if(statute&&/^(?:w\s*et(?:\s+op\s+de)?\s+)?(?:vpb|vennootschapsbelasting)$/u.test(statute[0]))return true;
  }
  return false;
}
export function quoteRanges(text,quotes){
  let flat='',positions=[];
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(/\s/u.test(char)){
      if(flat&&!flat.endsWith(' ')){flat+=' ';positions.push(i);}
    }else{flat+=char.toLocaleLowerCase('nl');positions.push(i);}
  }
  const ranges=[];
  for(const quote of quotes){
    const needle=normalized(quote),start=flat.indexOf(needle);
    if(!needle||start<0)throw Error('Kernpassage ontbreekt in de aangeleverde wettekst: '+quote);
    ranges.push([positions[start],positions[start+needle.length-1]+1]);
  }
  return ranges.sort((a,b)=>a[0]-b[0]).reduce((all,range)=>{
    const last=all.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else all.push([...range]);return all;
  },[]);
}
export const textOnly=html=>String(html).replace(/<[^>]+>/g,' ').replace(/&(?:amp|nbsp);/g,' ').replace(/\s+/g,' ').trim();
export function matchingSections(colleges,query){
  const words=normalized(query).split(' ').filter(Boolean);if(!words.length)return [];
  return colleges.flatMap(college=>college.topics.flatMap(topic=>topic.sections.map(section=>({college,topic,section}))))
    .map(item=>({...item,haystack:normalized([item.college.label,item.topic.title,item.section.title,textOnly(item.section.bodyHtml),item.section.examTip,...item.section.articles.map(a=>a.label)].join(' '))}))
    .filter(item=>words.every(word=>item.haystack.includes(word))).slice(0,30);
}
