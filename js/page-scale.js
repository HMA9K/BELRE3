/* Shared by CAFA2 and SRA. Scale layout as well as text, preserving viewport space. */
(function () {
  'use strict';
  if (window.StudyScale) return;
  var root = document.documentElement, factor = 1, sheets = new WeakSet();
  function compactHeader(){root.classList.toggle('study-scale-compact',window.innerWidth/factor<1100);}
  function adaptRules(rules) {
    Array.from(rules || []).forEach(function (rule) {
      if (rule.style) Array.from(rule.style).forEach(function (property) {
        var value = rule.style.getPropertyValue(property);
        // Media-query breakpoints stay unchanged. Only layout lengths are adjusted.
        if (!/\b\d*\.?\d+(?:[dsl]?vh|[dsl]?vw)\b/.test(value)) return;
        rule.style.setProperty(property, value.replace(/\b(\d*\.?\d+)([dsl]?v[hw])\b/g,
          'calc($1$2 / var(--study-page-scale, 1))'), rule.style.getPropertyPriority(property));
      });
      if (rule.cssRules) adaptRules(rule.cssRules);
    });
  }
  function adaptSheets() {
    Array.from(document.styleSheets).forEach(function (sheet) {
      if (sheets.has(sheet)) return;
      try { adaptRules(sheet.cssRules); sheets.add(sheet); } catch (_) { /* External styles stay untouched. */ }
    });
  }
  function controls(size, base, min, max) {
    document.querySelectorAll('[data-font]').forEach(function (button) {
      var step = Number(button.dataset.font), percent = Math.round(size / base * 100);
      var label = step < 0 ? 'Hele pagina verkleinen' : step > 0 ? 'Hele pagina vergroten' : 'Standaardgrootte herstellen';
      button.setAttribute('aria-label', label);
      button.title = label + ' · ' + percent + '%';
      button.hidden = step === 0 && size === base;
      button.disabled = step < 0 && size <= min || step > 0 && size >= max;
    });
  }
  function set(size, base, min, max) {
    size = Math.max(min, Math.min(max, Math.round(Number(size) || base)));
    factor = size / base;
    adaptSheets();
    root.style.setProperty('--study-page-scale', String(factor));
    root.style.zoom = String(factor);
    compactHeader();
    controls(size, base, min, max);
    window.dispatchEvent(new CustomEvent('study:scale', {detail:{factor:factor}}));
    // Recalculate sticky headers and floating tools in their existing controllers.
    window.dispatchEvent(new Event('resize'));
    return size;
  }
  var printStyle = document.createElement('style');
  printStyle.textContent = '@media print{html{zoom:1!important;--study-page-scale:1!important}}';
  document.head.appendChild(printStyle);
  window.StudyScale = {set:set, get:function () { return factor; }};
  window.addEventListener('resize',compactHeader);
  document.addEventListener('DOMContentLoaded', adaptSheets, {once:true});
})();
