import {contentBase} from '../config.mjs';
import {initPractice} from './mc.mjs?v=belre3-sources-wide-1';
import {initSources} from './sources.mjs?v=belre3-sources-wide-1';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function data(name) {
  const response = await fetch(new URL(name + '.json', contentBase));
  if (!response.ok) throw new Error('De lokale vragenbank is nog niet beschikbaar.');
  return response.json();
}
async function script(name) {
  await new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = new URL(name + '.js?v=belre3-20260930-uniform1', import.meta.url); el.onload = resolve; el.onerror = reject;
    document.body.append(el);
  });
}
try {
  const [mc, exams, sources, courseMap] = await Promise.all([data('mc'), data('exams'), data('sources'), data('course-map')]);
  window.CAFA2_EXAMS = exams;
  window.BELRE3_COURSE_MAP=courseMap;
  window.BELRE3_MC=mc;
  window.CourseCalculatorOptions = {storageKey:'belre3-calculator-history-v1',legacyKey:'belre3-calculator-v1'};
  for (const name of ['answer-editor','tinymce-answer-editor','exam-engine','journal-table','answer-widgets','model-policy','mc-core','calculator-input','calculator']) await script(name);
  window.CafaExamDocument = {
    render(exam, kind, html, plain) {
      return '<div class="exam-source-document exam-document ' + (kind === 'question' ? 'exam-source-question' : '') + '">' +
        (html ? CafaAnswerEditor.sanitize(html) : '<p class="source-prose">' + escapeHtml(plain || '') + '</p>') + '</div>';
    }
  };
  initPractice(mc, sources, exams, courseMap);
  await script('topic-practice');
  await script('exams');
  initSources(sources, exams);
  await script('exam-cirrus-layout');
  await import('./exam-original-pdfs.mjs?v=belre3-sources-wide-1');
  await import('./course-ui.mjs?v=belre3-20260930-ui2');
  await script('input-table-layout');
  window.dispatchEvent(new Event('cafa:ready'));
} catch (error) {
  document.getElementById('start').hidden = false;
  document.getElementById('mc-app').hidden = true;
  document.getElementById('exam-app').hidden = true;
  document.body.classList.remove('practice-surface');
  document.getElementById('start').innerHTML = '<div class="home-body"><h1>Oefenomgeving nog niet geladen</h1><p role="alert">' +
    escapeHtml(error.message || 'Een onderdeel kon niet worden geladen. Ververs de pagina.') +
    '</p><p>De bronnen en vragen worden lokaal geïmporteerd voordat je kunt oefenen.</p><a class="btn" href="../index.html">BELRE3 leeromgeving</a></div>';
}
let size = 14;
document.addEventListener('click', event => {
  const control = event.target.closest('[data-font]');
  if (!control) return;
  const delta = Number(control.dataset.font);
  if(window.parent!==window&&window.parent.BelreDisplay){window.parent.BelreDisplay.adjust(delta);return;}
  size = delta ? Math.max(12, Math.min(20, size + delta)) : 14;
  document.documentElement.style.setProperty('--base', size + 'px');
});
