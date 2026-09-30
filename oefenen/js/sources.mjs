const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sourceButtons(refs,sources,label='Bron') {
  return refs.map(ref=>{
    const source=sources[ref.sourceId];if(!source)return '';
    return '<button class="btn" type="button" data-source-id="'+esc(ref.sourceId)+'" data-source-page="'+(ref.pdfPages?.[0]||1)+'">'+esc(label)+': '+esc(source.title.split('/').pop())+(ref.pdfPages?.length?' · p. '+ref.pdfPages.join(', '):'')+'</button>';
  }).join('');
}
export function initSources(sources,exams){
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-source-id]');if(!button)return;
    event.preventDefault();
    const {openSource}=await import('./exam-original-pdfs.mjs?v=belre3-sources-wide-1');
    await openSource(button.dataset.sourceId,button.dataset.sourcePage,button);
  });
}
