import {contentBase} from '../config.mjs';
import {initPractice} from './mc.mjs?v=belre3-20261002-exercise-scope1';
import {initSources} from './sources.mjs?v=belre3-20261001-pdf-actions1';
import {createAnswerModels} from './answer-models.mjs?v=belre3-20261002-model-scoring1';
import {createCasePresentations} from './case-presentation.mjs?v=belre3-20261002-question-cases1';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function data(name) {
  const url = new URL(name + '.json', contentBase);
  if (name === 'mc') url.searchParams.set('v', 'belre3-20261002-exercise-scope1');
  if (name === 'exams') url.searchParams.set('v', 'belre3-20261002-full-case1');
  const response = await fetch(url);
  if (!response.ok) throw new Error('De lokale vragenbank is nog niet beschikbaar.');
  return response.json();
}
async function script(name) {
  await new Promise((resolve, reject) => {
    const el = document.createElement('script');
    // Fetch together while preserving execution order for dependent classic scripts.
    el.async = false;
    const version = name==='answer-input-tools'?'belre3-20261002-year1969':name==='mc-core'?'belre3-20261002-exercise-scope1':name==='exams'?'belre3-20261001-chooser1':name==='input-table-layout'||name==='journal-table'?'belre3-20261001-mobile1':name==='topic-practice'?'belre3-20261001-topics2':'belre3-20261001-exam7';
    el.src = new URL(name + '.js?v=' + version, import.meta.url); el.onload = resolve; el.onerror = reject;
    document.body.append(el);
  });
}
try {
  window.CourseCalculatorOptions = {storageKey:'belre3-calculator-history-v1',legacyKey:'belre3-calculator-v1'};
  const dependencies=Promise.all(['answer-editor','answer-input-tools','tinymce-answer-editor','exam-engine','journal-table','answer-widgets','model-policy','mc-core','calculator-input','calculator'].map(script));
  const [mc, exams, sources, courseMap] = await Promise.all([data('mc'), data('exams'), data('sources'), data('course-map'),dependencies]);
  window.CAFA2_EXAMS = exams;
  window.BELRE3_COURSE_MAP=courseMap;
  window.BELRE3_MC=mc;
  const answerModels=createAnswerModels(exams,html=>CafaAnswerEditor.sanitize(html),sources);
  const casePresentations=createCasePresentations(exams,html=>CafaAnswerEditor.sanitize(html));
  window.CafaExamDocument = {
    render(exam, kind, html, plain, questionId) {
      if(kind==='solution')return answerModels.render(questionId,html,plain);
      if(kind==='case')return casePresentations.render(questionId,html,plain);
      return '<div class="exam-source-document exam-document ' + (kind === 'question' ? 'exam-source-question' : '') + '">' +
        (html ? CafaAnswerEditor.sanitize(html) : '<p class="source-prose">' + escapeHtml(plain || '') + '</p>') + '</div>';
    }
  };
  initPractice(mc, sources, exams, courseMap);
  await script('topic-practice');
  await script('exams');
  initSources(sources, exams);
  await script('exam-cirrus-layout');
  await import('./exam-original-pdfs.mjs?v=belre3-20261001-pdf-actions1');
  await import('./course-ui.mjs?v=belre3-20261001-exam7');
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
