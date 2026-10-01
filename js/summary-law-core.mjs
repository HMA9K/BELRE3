import {quoteRanges,normalized} from './summary-core.mjs';

const number='\\d+[a-z]*(?:[.:]\\d+[a-z]*)?';
const memberList='\\d+(?:\\s*(?:,|en|of|tot en met|t/m)\\s*(?:(?:lid|leden)\\s+)?\\d+)*';
const letterList='[a-z]\\b(?:\\s*(?:,|en|of)\\s*(?:(?:onderdeel|onderdelen|sub)\\s+)?[a-z]\\b)*';
const clause='(?:(?:lid|leden)\\s+'+memberList+'(?:\\s*,?\\s*(?:onderdeel|onderdelen|sub)\\s+'+letterList+')?|(?:onderdeel|onderdelen|sub)\\s+'+letterList+')';
const pattern=new RegExp('\\b(?:artikelen|artikel|artt|art)\\.?\\s*('+number+')'+
  '(?:(?:\\s+(?:tot en met|t/m)\\s+|\\s*[-–]\\s*)('+number+'))?'+
  '((?:\\s*(?:,|en|of|/)\\s*'+number+'(?![a-z0-9]|\\s*%))*)'+
  '(\\s*,?\\s*'+clause+'(?:\\s*(?:,|en|of)\\s*'+clause+')*)?'+
  '(?:\\s+(Wet\\s+(?:Vpb(?:\\s+1969)?|IB(?:\\s+2001)?)|Besluit\\s+(?:FE(?:\\s+2003)?|fiscale eenheid(?:\\s+2003)?)|AWR|Awb|BW|VWEU))?', 'giu');

/** Dotted article numbers belong to IB; an explicit AWR label must never open Vpb 4. */
export function articleReferences(text){
  return [...String(text).matchAll(pattern)].map(m=>({start:m.index,end:m.index+m[0].length,label:m[0],article:m[1].toLowerCase(),
    last:m[2]?.toLowerCase(),more:(m[3].match(new RegExp(number,'gi'))||[]).map(x=>x.toLowerCase()),part:(m[4]||'').trim().replace(/^,\s*/,''),
    law:/besluit/i.test(m[5]||'')?'Besluit FE 2003':/awr/i.test(m[5]||'')?'AWR':/awb/i.test(m[5]||'')?'Awb':/bw/i.test(m[5]||'')||m[1].includes(':')?'BW':/vweu/i.test(m[5]||'')?'VWEU':/\bIB\b/i.test(m[5]||'')||m[1].includes('.')?'IB':'Vpb'}));
}
export function articleNumbers(ref,catalog){
  const compare=(a,b)=>{const x=/^(\d+)([a-z]*)$/.exec(a),y=/^(\d+)([a-z]*)$/.exec(b);return x&&y?Number(x[1])-Number(y[1])||x[2].localeCompare(y[2]):a.localeCompare(b);};
  const range=ref.last?Object.keys(catalog).filter(n=>compare(n,ref.article)>=0&&compare(n,ref.last)<=0).sort(compare):[ref.article];
  return [...new Set([ref.article,...range,...(ref.last?[ref.last]:[]),...ref.more])];
}
export function lawMembers(text){
  const starts=[...text.matchAll(/^(\d+)\.?(?=\s*(?:\n|$))/gm)];
  if(!starts.length)return [{member:'0',start:0,end:text.length,text}];
  return starts.map((m,i)=>{const start=i?m.index:0,end=starts[i+1]?.index??text.length;return {member:m[1],start,end,text:text.slice(start,end)};});
}
export function requestedTargets(part){
  const text=String(part).replace(/^\s*(?:art(?:ikel)?\.?\s*)\d+[a-z]*(?:[.:]\d+)?/i,'').replace(/\s+(?:Wet|Besluit|AWR|Awb|BW|VWEU)\b.*$/i,'');
  const targetPattern=new RegExp('(?:lid|leden)\\s+('+memberList+')(?:\\s*,?\\s*(?:onderdeel|onderdelen|sub)\\s+('+letterList+'))?|(?:onderdeel|onderdelen|sub)\\s+('+letterList+')','gi');
  return [...text.matchAll(targetPattern)].flatMap(m=>{
    const letters=(m[2]||m[3]||'').match(/\b[a-z]\b/gi)||[];
    if(!m[1])return [{member:null,letters:letters.map(x=>x.toLowerCase())}];
    const members=m[1].match(/\d+/g)||[];
    for(const range of m[1].matchAll(/(\d+)\s*(?:tot en met|t\/m)\s*(\d+)/g))for(let n=Number(range[1]);n<=Number(range[2])&&n<100;n++)members.push(String(n));
    return [...new Set(members)].map(member=>({member,letters:letters.map(x=>x.toLowerCase())}));
  });
}
export const requestedMembers=part=>[...new Set(requestedTargets(part).map(target=>target.member).filter(Boolean))];
/** Split an explicit reference into its actual source members and lettered parts. */
export function lawSegments(text,part){
  const rows=lawMembers(text),targets=requestedTargets(part),explicit=targets.length>0;
  return rows.flatMap(r=>{
    const matches=targets.filter(target=>target.member===null||target.member===r.member);
    if(explicit&&!matches.length)return [];
    if(!explicit||matches.some(target=>!target.letters.length))return [r];
    const letters=[...new Set(matches.flatMap(target=>target.letters))],starts=[...r.text.matchAll(/^([a-z])\.\s/gm)];
    if(!starts.length)return [];
    const slices=[{...r,letter:null,end:r.start+starts[0].index,text:r.text.slice(0,starts[0].index)}];
    starts.forEach((m,i)=>{if(letters.includes(m[1])){const end=starts[i+1]?.index??r.text.length;slices.push({...r,letter:m[1],start:r.start+m.index,end:r.start+end,text:r.text.slice(m.index,end)});}});return slices;
  });
}
const mergeRanges=ranges=>ranges.sort((a,b)=>a[0]-b[0]).reduce((all,r)=>{const last=all.at(-1);if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else all.push([...r]);return all;},[]);
const focusCache=new WeakMap();
/** Keep a short phrase in its reviewed source passage, even if it occurs elsewhere. */
export function focusRanges(text,reference){
  const cached=focusCache.get(reference);if(cached?.text===text)return cached.ranges;
  const ranges=reference.part?reviewedPart(text,reference):reference.focusPassages?.length?reviewedFocus(text,reference):quoteRanges(text,reference.quotes);
  focusCache.set(reference,{text,ranges});return ranges;
}
function reviewedPart(text,reference){
  const segments=lawSegments(text,reference.part),ranges=[];
  for(const quote of reference.quotes){
    const segment=segments.find(s=>normalized(s.text).includes(normalized(quote)));
    if(!segment)throw Error('Kernfragment ontbreekt in het genoemde lid of onderdeel: '+reference.part+' / '+quote);
    ranges.push(...quoteRanges(segment.text,[quote]).map(([a,b])=>[a+segment.start,b+segment.start]));
  }
  return mergeRanges(ranges);
}
function reviewedFocus(text,reference){
  const passages=quoteRanges(text,reference.focusPassages),ranges=[];
  for(const quote of reference.quotes){
    const passage=passages.find(([a,b])=>normalized(text.slice(a,b)).includes(normalized(quote)));
    if(!passage)throw Error('Kernfragment ontbreekt in de beoordeelde passage: '+quote);
    ranges.push(...quoteRanges(text.slice(...passage),[quote]).map(([a,b])=>[a+passage[0],b+passage[0]]));
  }
  return mergeRanges(ranges);
}
/** No automatic sentence highlighting. Only verified editorial phrases may be marked. */
export function selectLaw(law,part,references=[],context='',fallback=[]){
  const explicit=requestedTargets(part).length>0,segments=lawSegments(law.text,part);
  const within=ranges=>mergeRanges(segments.flatMap(s=>ranges.filter(([a,b])=>a<s.end&&b>s.start).map(([a,b])=>[Math.max(a,s.start),Math.min(b,s.end)])));
  let ranges=within(references.flatMap(r=>focusRanges(law.text,r)));
  const missing=segments.filter(s=>!ranges.some(([a,b])=>a<s.end&&b>s.start));
  const extra=missing.length?fallback.flatMap(r=>focusRanges(law.text,r)):[];
  ranges=within([...ranges,...extra.filter(([a,b])=>!references.length||missing.some(s=>a<s.end&&b>s.start))]);
  const selected=segments.map(r=>({...r,ranges:ranges.filter(([a,b])=>a<r.end&&b>r.start).map(([a,b])=>[Math.max(0,a-r.start),Math.min(r.text.length,b-r.start)])}));
  return {rows:selected,ranges,contextual:explicit||ranges.length>0};
}
