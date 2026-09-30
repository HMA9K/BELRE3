import {contentBase} from '../config.mjs';
import {initPractice} from './mc.mjs?v=belre3-20260930-5';
import {initSources} from './sources.mjs';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function data(name) {
  const response = await fetch(new URL(name + '.json', contentBase));
  if (!response.ok) throw new Error('De lokale vragenbank is nog niet beschikbaar.');
  return response.json();
}
async function script(name) {
  await new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = new URL(name + '.js?v=belre3-20260930-5', import.meta.url); el.onload = resolve; el.onerror = reject;
    document.body.append(el);
  });
}
try {
  const [mc, exams, sources] = await Promise.all([data('mc'), data('exams'), data('sources')]);
  window.CAFA2_EXAMS = exams;
  window.CourseCalculatorOptions = {storageKey:'belre3-calculator-history-v1',legacyKey:'belre3-calculator-v1'};
  for (const name of ['answer-editor','tinymce-answer-editor','exam-engine','journal-table','answer-widgets','model-policy','mc-core','calculator-input','calculator']) await script(name);
  window.CafaExamDocument = {
    render(exam, kind, html, plain) {
      return '<div class="exam-source-document exam-document ' + (kind === 'question' ? 'exam-source-question' : '') + '">' +
        (html ? CafaAnswerEditor.sanitize(html) : '<p class="source-prose">' + escapeHtml(plain || '') + '</p>') + '</div>';
    }
  };
  initPractice(mc, sources, exams);
  await script('exams');
  initSources(sources, exams);
  await script('exam-cirrus-layout');
  await script('input-table-layout');
  window.dispatchEvent(new Event('cafa:ready'));
} catch (error) {
  document.getElementById('start').innerHTML = '<div class="home-body"><h1>Oefenomgeving nog niet geladen</h1><p role="alert">' +
    escapeHtml(error.message || 'Een onderdeel kon niet worden geladen. Ververs de pagina.') +
    '</p><p>De bronnen en vragen worden lokaal geïmporteerd voordat je kunt oefenen.</p><a class="btn" href="../index.html">BELRE3 leeromgeving</a></div>';
}
let size = 14;
document.addEventListener('click', event => {
  const control = event.target.closest('[data-font]');
  if (!control) return;
  const delta = Number(control.dataset.font);
  size = delta ? Math.max(12, Math.min(20, size + delta)) : 14;
  document.documentElement.style.setProperty('--base', size + 'px');
});
