import {summaryStudyParts} from './course-links.mjs?v=20261001-progress1';

export const studyStorageKey='belre3-study-progress-v1';
export const browserProgressStorage={getItem:key=>globalThis.localStorage.getItem(key),setItem:(key,value)=>globalThis.localStorage.setItem(key,value)};
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const safeId=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const failure=()=>({ok:false,store:null,error:'Je markeringen voor de leerstof konden niet worden gelezen. De opgeslagen gegevens blijven behouden.'});

export function readStudyProgress(storage){
  try{
    const raw=storage.getItem(studyStorageKey);
    if(raw===null)return {ok:true,store:{version:1,topics:{}}};
    const store=JSON.parse(raw);
    if(!record(store)||store.version!==1||!record(store.topics))return failure();
    for(const [topic,parts] of Object.entries(store.topics)){
      if(!safeId(topic)||!record(parts))return failure();
      for(const [id,part] of Object.entries(parts)){
        if(!safeId(id)||!record(part)||typeof part.studied!=='boolean'||!Number.isSafeInteger(part.updatedAt)||part.updatedAt<0)return failure();
      }
    }
    return {ok:true,store};
  }catch{return failure();}
}

export function studyStatus(store,topic){
  const parts=summaryStudyParts(topic);
  const completed=parts.filter(id=>store?.topics?.[topic]?.[id]?.studied===true).length;
  return {completed,total:parts.length,studied:parts.length>0&&completed===parts.length};
}

export function setStudied(storage,topic,parts,studied,now=Date.now()){
  const allowed=summaryStudyParts(topic);
  if(!allowed.length||!Array.isArray(parts)||!parts.length||!parts.every(id=>allowed.includes(id))||typeof studied!=='boolean'||!Number.isSafeInteger(now)||now<0)return {ok:false,error:'Deze studiemarkering is niet beschikbaar.'};
  const result=readStudyProgress(storage);
  if(!result.ok)return result;
  const previous=result.store.topics[topic]||{};
  const updated={...previous,...Object.fromEntries(parts.map(id=>[id,{studied,updatedAt:now}]))};
  const store={...result.store,topics:{...result.store.topics,[topic]:updated}};
  try{storage.setItem(studyStorageKey,JSON.stringify(store));return {ok:true,store};}
  catch{return {ok:false,error:'Deze markering kon niet worden opgeslagen. Probeer het opnieuw; je eerdere voortgang blijft behouden.'};}
}
