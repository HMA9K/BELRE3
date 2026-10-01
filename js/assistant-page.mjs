import {pageTitles,plain,questionRecord,revision} from './assistant-context.mjs';
export async function readContext(w=window){
  const d=w.document,parts=w.location.hash.slice(1).split('/');
  const mc=w.BelrePractice?.current();
  if(parts[0]==='mc'&&mc){
    const record=questionRecord('mc',mc.question);
    const studentAnswer={optionId:d.querySelector('[name="mc-choice"]:checked')?.value||null,text:d.querySelector('[data-mc-own]')?.value||''};
    return {context:{kind:'mc',id:record.id,revision:await revision(record)},label:'MC · '+record.title,preview:record.prompt,studentAnswer};
  }
  if(['tentamen','inzage'].includes(parts[0])&&parts[1]){
    const attempt=w.CafaExams?.getAttempt(parts[1]);
    const index=parts[0]==='inzage'?Number(parts[3]):attempt?.currentIndex;
    const q=attempt?.exam.questions[index];
    if(q){
      const sourceExam=q.sourceExamId?w.CafaExams.catalog.find(e=>e.id===q.sourceExamId):attempt.exam;
      const sourceQuestion=sourceExam?.questions.find(item=>item.id===(q.sourceQuestionId||q.id))||q;
      const record=questionRecord('exam',sourceQuestion,sourceExam?.sections.find(s=>s.id===sourceQuestion.sectionId),sourceExam);
      const saved=attempt.answers[q.id]||{};
      // Rich editors may have a pending debounce: read their current content, never change it.
      const editor=w.tinymce?.editors?.find(e=>e.getContainer?.()?.closest('#exam-app'));
      const text=plain(editor?.getContent?.()??saved.html??'');
      const tables=[...d.querySelectorAll('#exam-app table input')].map(n=>({label:n.getAttribute('aria-label')||'Tabelcel',value:n.value})).filter(n=>n.value);
      return {context:{kind:'exam',id:q.id,revision:await revision(record)},label:record.title,preview:record.prompt,studentAnswer:{...saved,text,tables,drawingPresent:!!saved.drawing?.length,drawing:undefined}};
    }
  }
  const active=d.querySelector('.pg.vis'),id=active?.id.replace('pg-','')||(pageTitles[parts[0]]?parts[0]:'dashboard');
  const host=active||(['start'].includes(id)?d.getElementById('start'):d.getElementById('mc-app')?.hidden===false?d.getElementById('mc-app'):d.getElementById('exam-app'));
  const selection=w.getSelection()?.toString().slice(0,4000)||'';
  const sections=host?[...host.querySelectorAll('h1,h2,h3,p,li,table,.art-pop,.t-body,.oef-body,.summary-law-core,.summary-law-text')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<w.innerHeight;}):[];
  const visible=sections.length?[...new Set(sections.map(n=>n.innerText?.trim()).filter(Boolean))].join('\n'):host?.innerText||'';
  const law=d.querySelector('#belre-law-popover:not([hidden])');
  const text=(law?'Geopend wetsartikel:\n'+law.innerText+'\n\n':'')+visible;
  return {context:{kind:'page',id,visibleText:text.slice(0,12000),selection},label:pageTitles[id]||'BELRE3',preview:selection?'Geselecteerde tekst: '+selection.slice(0,160):'Deze pagina en alle BELRE3-bronnen',studentAnswer:{}};
}
