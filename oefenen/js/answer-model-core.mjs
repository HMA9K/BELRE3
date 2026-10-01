// Scoring notation is separate from legal paragraph numbers and monetary amounts.
const units=/(?<![\p{L}\p{N}.,])(?:\d+(?:[.,]\d+)?(?:\s*[½¼¾]|\s*\/\s*\d+)?|[½¼¾])\s*(?:punt(?:en)?|ptn?|pl?|g\s*\/\s*f)(?:\s+g\s*\/\s*f)?(?![\p{L}\p{N}])/giu;
const bare=/\((?:\d{1,2}(?:[.,]\d+)?|[½¼¾])\)/gu;
export function scoringRanges(text,{pointsColumn=false}={}){
  const ranges=[...text.matchAll(units)].map(m=>({start:m.index,end:m.index+m[0].length,text:m[0]}));
  for(const m of text.matchAll(bare)){
    const before=text.slice(0,m.index),after=text.slice(m.index+m[0].length);
    // A leading (1), (2), etc. is a condition number, not a score.
    if(pointsColumn||(/(?:€|£|\$|[%=×+])/.test(before)&&/[\d%)]\s*$/.test(before)&&
      (!/[\p{L}\p{N}]/u.test(after)||/^\s*[+−×÷=]/.test(after)))){
      ranges.push({start:m.index,end:m.index+m[0].length,text:m[0]});
    }
  }
  return ranges.sort((a,b)=>a.start-b.start).filter((r,i,all)=>!i||r.start>=all[i-1].end);
}
