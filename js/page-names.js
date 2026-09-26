(function () {
  'use strict';
  var counter = document.querySelector('script[data-goatcounter]');
  if (!counter) return;
  var endpoint = counter.getAttribute('data-goatcounter');
  var course = endpoint.indexOf('cafa2.') >= 0 ? 'CAFA2' : endpoint.indexOf('sra.') >= 0 ? 'SRA' : 'BELRE3';
  var hosts = { CAFA2: ['cafa2.pages.dev'], SRA: ['sra-2xt.pages.dev'], BELRE3: ['belre3.pages.dev', 'hma9k.github.io'] };
  var production = hosts[course].indexOf(location.hostname.toLowerCase()) >= 0;
  var lastPage = '', pending = null, originalTitle = document.title, activityQueue = [], ledger = {};
  var ledgerKey = 'study-measure-actions-v1-' + course;
  try { ledger = JSON.parse(localStorage.getItem(ledgerKey) || '{}'); } catch (_) {}
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function text(node) { return node ? clean(node.textContent) : ''; }
  function withoutCourse(value) { return clean(value).replace(/^(?:CAFA2|SRA|BELRE3)\s*[·:]?\s*/i, '').replace(/\s*·\s*SRA$/i, ''); }
  function status(value) { document.documentElement.setAttribute('data-study-analytics-state', value); }
  function parts() { try { return decodeURIComponent(location.hash.slice(1)).split('/'); } catch (_) { return []; } }
  function heading(host) { return withoutCourse(text(host && host.querySelector('h1, h2'))); }
  function examName(exam) {
    if (exam.demo || exam.practiceKind) return withoutCourse(exam.title);
    if (exam.date && /^\d{4}-\d{2}-\d{2}$/.test(exam.date)) return 'Tentamen ' + exam.date.split('-').reverse().join('-');
    return withoutCourse(exam.title) || 'Tentamen';
  }
  function hostFor(route) {
    if (course === 'BELRE3') return document.querySelector('.pg.vis');
    if (/leesversie/i.test(location.pathname)) return document.body;
    if (document.body.classList.contains('exam-surface')) return document.querySelector('#exam-app');
    if (course === 'SRA') return document.querySelector('#main') || document.querySelector('main');
    var target = document.getElementById(route.join('/'));
    if (document.querySelector('#reader-main')) return (target && target.closest('[data-view]')) || document.querySelector('[data-view]:not([hidden])');
    return (target && target.closest('.screen')) || document.querySelector('#start') || document.querySelector('main');
  }
  function examPage(route, host) {
    var api = course === 'CAFA2' ? window.CafaExams : window.SRACirrus;
    if (!api) return null;
    var kind = route[0], isRunner = kind === (course === 'CAFA2' ? 'tentamen' : 'toets');
    if (!['welkom', 'tentamen', 'toets', 'inzage'].includes(kind) || !route[1]) return null;
    var attempts = api.getAttempts ? api.getAttempts() : [];
    var attempt = attempts.find(function (a) { return a.id === route[1]; });
    var exam = attempt ? attempt.exam : (api.catalog || []).find(function (e) { return e.id === route[1]; });
    if (!exam) return null;
    var result = { host: host, names: ['Tentamens', examName(exam)] };
    if (isRunner && attempt) {
      var q = exam.questions[attempt.currentIndex || 0], section = q && (exam.sections || []).find(function (s) { return s.id === q.sectionId; });
      if (section) result.names.push(clean(section.title));
      result.names.push('Vraag ' + (q ? (q.displayNumber || q.number || attempt.currentIndex + 1) : 1));
    } else if (kind === 'inzage') {
      result.names.push('Resultaten');
      if (route[2] === 'vraag' && /^\d+$/.test(route[3])) result.names.push('Vraag ' + (Number(route[3]) + 1));
    } else result.names.push('Start');
    return result;
  }
  function belPage(host) {
    var id = host.id.slice(3), labels = { home: 'Home', sam: 'Interactieve Samenvatting', kleur: 'Kleurcodering in Collegeslides vs. Tentamenvragen', art: 'Wet op de Vennootschapsbelasting 1969', paars: 'Paarse Tekst in Collegeslides vs. Tentamenvragen', tent: 'Tentamenindeling per Opgave', exam: 'Tentamenvragen & Antwoorden', oef: 'Oefenbundel' };
    var names = [labels[id] || heading(host)];
    if (id === 'sam') {
      var college = host.querySelector('.college-panel.visible');
      if (college) {
        names.push(text(college.querySelector('.college-title')));
        var topic = college.querySelector('.topic-panel.visible');
        if (topic) names.push(text(topic.querySelector('.topic-intro h4')) || text(college.querySelector('.topic-btn.active')));
      }
    } else if (id === 'exam') {
      if (host.querySelector('#vp-bytopic.vis')) names.push('Per onderwerp', text(host.querySelector('#topicGrid .tbtn.active')));
      else names.push('Tentamen ' + text(host.querySelector('#examSel .esbtn.active')));
    } else if (id === 'oef') {
      names.push(text(host.querySelector('.oef-tab.active')));
      if (host.querySelector('#oef-c8.vis')) names.push(text(host.querySelector('.oef-c8-btn.active')));
    }
    var current = host.querySelector('[data-study-current]');
    if (current && !current.classList.contains('collapsed') && !current.closest('.epanel:not(.vis),.oef-panel:not(.vis)')) {
      names.push(text(current.querySelector('.t-nr,.oef-nr')) || (current.dataset.opg ? 'Opgave '+current.dataset.opg.split('-o')[1] : text(current.querySelector('.oef-hdr')).replace(/\s*College[\s\S]*/,'') || 'Opgave'));
      if (current.dataset.studyQuestion) names.push('Vraag ' + current.dataset.studyQuestion);
    }
    return { host: host, names: names };
  }
  function describe() {
    var route = parts(), kind = route[0] || (course === 'CAFA2' ? 'start' : 'home'), host = hostFor(route);
    if (!host || document.querySelector('#app-content #load-status')) return null;
    if (course === 'BELRE3') return belPage(host);
    var exam = examPage(route, host); if (exam) return exam;
    var title = heading(host), names;
    if (course === 'CAFA2' && /samenvatting/i.test(location.pathname)) {
      names = ['Samenvatting', kind === 'start' ? 'Vakoverzicht' : title];
      var anchor = document.getElementById(route.join('/'));
      if (anchor && anchor !== host) {
        var sub = text(anchor.matches('h2, h3, h4, summary') ? anchor : anchor.querySelector('summary, h2, h3, h4'));
        if (sub && sub !== title) names.push(sub);
      }
    } else if (course === 'CAFA2') {
      var question = /^(kap|val|nvw|hk)-(\d+)$/.exec(kind);
      if (question) {
        names = ['Oefenvragen maken', title, 'Vraag ' + (text(host.querySelector('.qnum')) || question[2])];
      } else if (kind.indexOf('onderwerp-') === 0 || /^(overzicht|resultaat)-(kap|val|nvw|hk)$/.test(kind)) names = ['Oefenvragen maken', title, kind.indexOf('resultaat') >= 0 ? 'Resultaten' : 'Vragenoverzicht'];
      else if (kind === 'dashboard') names = ['Dashboard', route[1] === 'voltooid' ? 'Voltooid' : 'Beschikbaar'];
      else names = [{ start: 'Home', oefenen: 'Oefenvragen maken', resultaten: 'Resultaten' }[kind] || title];
    } else {
      var lessons = window.SRA && window.SRA.lessons || [], lesson = lessons.find(function (l) { return l.id === route[1]; });
      if (kind === 'les') {
        names = ['Leren', lesson ? lesson.title : title];
        if (route[2] && lesson && lesson.questions) {
          var index = lesson.questions.findIndex(function (q) { return q.id === route[2]; });
          if (index >= 0) names.push('Kennischeck ' + (index + 1));
        }
      } else if (kind === 'formules') names = ['Formules', lesson ? lesson.title : title];
      else if (kind === 'oefenen' && route[1]) names = ['Oefenvragen maken', text(host.querySelector('.sra-practice-heading h2, .sra-breadcrumb [aria-current]')) || title, route[2] === 'resultaat' ? 'Resultaten' : 'Vraag ' + (text(host.querySelector('.sra-question-number')) || '1')];
      else if (kind === 'tentamen' && route[1] === 'mc') {
        names = ['Oefenvragen maken'];
        if (route[2]) {
          var topic = (window.SRAMCData && window.SRAMCData.topics || []).find(function (t) { return t.id === route[2]; });
          names.push(topic ? topic.title : title.replace(/^oefenvragen\s*·\s*/i, ''));
          if (/^\d+$/.test(route[3])) names.push('Vraag ' + route[3]);
          else if (route[3] || route[2] === 'resultaten') names.push('Resultaten');
        }
      } else if (kind === 'tentamen' && /^\d{8}$/.test(route[1] || '')) {
        var legacy = (window.SRAExamData && window.SRAExamData.exams || []).find(function (e) { return e.id === route[1]; });
        names = ['Tentamens', legacy ? examName(legacy) : 'Tentamen ' + route[1].slice(6) + '-' + route[1].slice(4, 6) + '-' + route[1].slice(0, 4), /^\d+$/.test(route[2]) ? 'Vraag ' + route[2] : route[2] === 'resultaat' ? 'Resultaten' : route[2] === 'afronden' ? 'Afronden' : 'Start'];
      } else if (kind === 'tentamen') names = ['Tentamens', route[1] === 'voltooid' ? 'Voltooid' : 'Beschikbaar'];
      else names = [{ home: 'Home', dashboard: 'Home', leren: 'Leren', begrippen: 'Begrippen', voortgang: 'Voortgang', bronnen: 'Bronnen' }[kind] || title];
      if (kind === 'tentamen' && route[1] === 'analyse') {
        var analysis = host.querySelector('#analysis-exam');
        names = ['Tentamenanalyse', analysis && analysis.value ? text(analysis.options[analysis.selectedIndex]) : 'Algemeen patroon'];
      }
    }
    if (/leesversie/i.test(location.pathname)) {var section=document.getElementById(kind);names=['Leesversie', section?text(section.querySelector('h1,h2,h3')):'Vakoverzicht'];}
    if (/tentamenfrequentie/i.test(location.pathname)) names=['Tentamenfrequentie per onderwerp'];
    if (/\/fallback\//.test(location.pathname) && kind==='start') names=['Oefenvragen maken',title,'Vragenoverzicht'];
    if (!names.some(Boolean)) names = [withoutCourse(originalTitle) || 'Home'];
    return { host: host, names: names };
  }
  function nameFor(page) { return [course].concat(page.names.filter(Boolean).map(clean)).join(' / '); }
  function showName(page, name) {
    var label = page.host.querySelector(':scope > .study-page-name');
    if (!label) { label = document.createElement('nav'); label.className = 'study-page-name'; label.setAttribute('aria-label', 'Huidige pagina'); page.host.prepend(label); }
    if (label.textContent !== name) label.textContent = name;
    if (document.title !== name) document.title = name;
    if (document.body.getAttribute('data-study-page-name') !== name) document.body.setAttribute('data-study-page-name', name);
  }
  function send(name, event) {
    if (!production || location.hash === '#toggle-goatcounter' || document.visibilityState === 'hidden') return false;
    var gc = window.goatcounter;
    if (!gc || typeof gc.count !== 'function') { status('waiting for GoatCounter'); return false; }
    try {
      var reason = gc.filter && gc.filter();
      if (reason) { status('excluded: ' + reason); return false; }
      gc.count({ path: name, title: name, event: !!event, no_session: event === true });
      status('sent: ' + name); return true;
    } catch (_) { status('browser storage unavailable'); return false; }
  }
  function update() {
    pending = null;
    if (document.readyState === 'loading') return;
    var page = describe(); if (!page) { status('waiting for route'); return; }
    var name = nameFor(page); showName(page, name);
    if (!production) { status('preview'); return; }
    if (name !== lastPage && send(name, false)) {
      lastPage = name;
      send(name + (page.names.some(function (n) { return /^(Vraag |Kennischeck )/.test(n); }) ? ' / Vraag geopend' : ' / Onderdeel geopend'), 'reach');
    }
    if (window.goatcounter && window.goatcounter.count) {
      var queued = activityQueue.splice(0);
      queued.forEach(function (name) { send(name, true); });
    }
  }
  function activity(action, names) {
    if (!production || location.hash === '#toggle-goatcounter') return;
    var page = describe(), name = names ? [course].concat(names.filter(Boolean).map(clean)).join(' / ') : page && nameFor(page);
    if (!name) return;
    if (!window.goatcounter || !window.goatcounter.count) { activityQueue.push(name + ' / ' + action); return; }
    send(name + ' / ' + action, true);
  }
  function fingerprint(value) {
    var input = JSON.stringify(value), hash = 2166136261;
    for (var i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(36);
  }
  function saveLedger() { try { localStorage.setItem(ledgerKey, JSON.stringify(ledger)); } catch (_) {} }
  function answer(key, value, names, checked) {
    if (!production) return;
    var signature = fingerprint(value), entry = ledger[key] || {}, fresh = entry.answer !== signature;
    if (fresh) { activity('Vraag beantwoord', names); activity('Vraag geoefend', names); entry.answer = signature; }
    if (checked && entry.checked !== signature) { activity('Antwoord nagekeken', names); entry.checked = signature; }
    ledger[key] = entry; saveLedger();
  }
  function examNames(exam, question) {
    var source = question && question.sourceExamId && (window.CAFA2_EXAMS || []).find(function (e) { return e.id === question.sourceExamId; });
    var names = ['Tentamens', examName(source || exam)];
    if (question) {
      var section = (exam.sections || []).find(function (s) { return s.id === question.sectionId; });
      if (section) names.push(clean(section.title));
      names.push('Vraag ' + (question.displayNumber || question.number || exam.questions.indexOf(question) + 1));
    }
    return names;
  }
  window.StudyMeasure = { activity: activity, answer: answer, examNames: examNames, forget: function (key) { delete ledger[key]; saveLedger(); }, describe: function () { var page = describe(); return page && page.names; } };
  function schedule() { if (pending !== null) clearTimeout(pending); pending = setTimeout(update, 0); }
  function ready() {
    if (!document.getElementById('study-page-name-style')) {
      var style = document.createElement('style'); style.id = 'study-page-name-style';
      style.textContent = '.study-page-name{display:block;flex:0 0 auto;box-sizing:border-box;max-width:100%;padding:8px 14px;margin:0 0 12px;font-weight:600;line-height:1.5;font-size:12px;overflow-wrap:anywhere;color:inherit;border-bottom:1px solid #8885;text-align:left}.reader-layout .study-page-name{padding-left:0}.pg>.study-page-name{max-width:980px;margin:12px auto;padding:8px 18px}@media print{.study-page-name{display:none}}';
      document.head.appendChild(style);
    }
    var root = document.querySelector('#app-content') || document.querySelector('#main') || document.querySelector('#reader-main') || document.body;
    var observer = new MutationObserver(function (changes) {
      if (changes.some(function (change) { var el = change.target.nodeType === 1 ? change.target : change.target.parentElement; return el && !el.closest('.study-page-name, #study-page-name-style, .exam-time-badge, [contenteditable], textarea'); })) schedule();
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    if (course === 'CAFA2') { var examRoot = document.querySelector('#exam-app'); if (examRoot && !root.contains(examRoot)) observer.observe(examRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] }); }
    schedule();
  }
  document.addEventListener('click', function (event) {
    var el = event.target.closest('a, button, summary, .t-hdr, .oef-hdr, .t-atog, .oef-at, .art-clik, .sh');
    if (!el) return;
    var page = describe();
    if (course === 'SRA' && page && el.matches('a[href^="#"]')) {
      var destination = el.getAttribute('href'), label = text(el);
      if ((/^(Start|Begin|Toets starten|Start deze fase|Alle \d+ vragen)$/.test(label) || el.closest('.sra-practice-phase li')) && /^#(?:tentamen\/mc\/|oefenen\/)/.test(destination)) {
        var newParts = destination.slice(1).split('/');
        var title = text(el.closest('[data-topic], .mc-part-card, .mc-main-card, .study-card, .sra-practice-phase')?.querySelector('h2,h3,h4'));
        if(el.closest('.sra-practice-phase li')) title=text(el.querySelector('span'));
        if(newParts[2]==='alles') title='Alle oefenvragen';
        activity('Oefenreeks gestart', ['Oefenvragen maken', title || newParts[2] || newParts[1]]);
      }
      if (/^(Oefenreeks afronden|Reeks afronden)$/.test(label)) {
        var context = page.names.filter(function (n) { return !/^Vraag /.test(n); });
        activity('Oefenreeks afgerond', context);
      }
    }
    if (page && el.matches('summary') && /uitwerking|antwoordmodel|waarom|nakijken|oplossing/i.test(text(el))) {
      setTimeout(function () { if (el.parentElement.open) activity('Uitwerking bekeken', page.names); }, 0);
    }
    if (page && el.matches('a[href]')) {
      var url; try { url = new URL(el.href, location.href); } catch (_) {}
      if (url && url.origin === location.origin && /\.(pdf|zip)$/i.test(url.pathname)) {
        var file = url.pathname.split('/').pop();
        send(nameFor(page) + ' / Document / ' + clean(el.textContent || file) + ' (' + file + ')', true);
      }
    }
    if (course === 'BELRE3' && page) {
      var card = el.closest('.t-card, .oef-card');
      if (card && el.matches('.t-hdr, .oef-hdr, .t-atog, .oef-at')) {
        setTimeout(function () {
          if (el.matches('.t-hdr, .oef-hdr') && card.classList.contains('collapsed')) return;
          page.host.querySelectorAll('[data-study-current]').forEach(function(other){delete other.dataset.studyCurrent;delete other.dataset.studyQuestion;});
          card.dataset.studyCurrent='true';
          if (el.matches('.t-atog,.oef-at')) card.dataset.studyQuestion=Array.from(card.querySelectorAll('.t-atog,.oef-at')).indexOf(el)+1;
          schedule();
          var exam = card.getAttribute('data-exam'), opgave = text(card.querySelector('.t-nr, .oef-nr')) || (card.dataset.opg ? 'Opgave ' + card.dataset.opg.split('-o')[1] : 'Opgave');
          var context = exam ? [course, 'Tentamenvragen & Antwoorden', 'Tentamen ' + exam, opgave].join(' / ') : nameFor(page) + ' / ' + opgave;
          if (el.matches('.t-atog, .oef-at')) {
            if (!el.nextElementSibling || !(el.classList.contains('open') || el.nextElementSibling.classList.contains('open') || el.nextElementSibling.style.display === 'block')) return;
            var list = Array.from(card.querySelectorAll('.t-atog, .oef-at'));
            context += ' / Vraag ' + (list.indexOf(el) + 1) + ' / Uitwerking bekeken';
          } else context += ' / Opgave geopend';
          send(context, el.matches('.t-atog,.oef-at') ? true : 'reach');
        }, 0);
      }
    }
    schedule();
  }, true);
  counter.addEventListener('load', schedule);
  counter.addEventListener('error', function () { status('GoatCounter could not load'); });
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('change', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('cafa:ready', schedule);
  window.addEventListener('cafa:exam-route', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
