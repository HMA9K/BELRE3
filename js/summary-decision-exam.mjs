const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateLabel=date=>date.split('-').reverse().join('-');
export const decisionExamMeaning='De tag geeft aan dat het onderwerp of de toets eerder is gevraagd. Niet iedere stap of uitzondering hoeft te zijn getoetst. Beslisbomen zonder tag kunnen ook tot de leerstof behoren.';

export function decisionExamBadge(tree){
  if(!tree.examEvidence?.length)return '';
  const dates=[...new Set(tree.examEvidence.map(example=>dateLabel(example.date)))].join(', ');
  return '<span class="decision-exam-tag" data-decision-exam-tag title="Dit onderwerp of deze toets is gevraagd op '+esc(dates)+'. Het bronvoorbeeld staat bij de bronnen van de beslisboom.">Gevraagd in tentamen</span>';
}

export function decisionExamSourcesHtml(tree){
  if(!tree.examEvidence?.length)return '';
  return '<div class="decision-exam-sources"><h5>Tentamenvoorbeeld</h5><p>'+decisionExamMeaning+'</p><ul>'+tree.examEvidence.map(example=>'<li><a href="/oefenen/content/'+esc(example.url)+'#page='+example.pdfPage+'" target="_blank" rel="noopener">Tentamen '+dateLabel(example.date)+' · bronpagina '+example.pdfPage+'</a><span>'+esc(example.scope)+'</span></li>').join('')+'</ul></div>';
}
