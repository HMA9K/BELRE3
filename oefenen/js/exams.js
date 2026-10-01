(function () {
  'use strict';
  var Engine = window.CafaExamEngine, Editor = window.CafaAnswerEditor, Opgave = window.CafaOpgavePractice;
  var host = document.getElementById('exam-app');
  if (!Engine || !Editor || !host) throw new Error('De tentamenomgeving kon niet worden geladen.');
  var KEY = 'belre3-full-exams-v1', store = {version:1, attempts:[]};
  var storageRefs = Object.create(null), splitStorage = false, migrationBlocked = false;
  var editor = null, saveOK = true, corrupt = false, selectedAttempt = null, renderedHash = null;
  var submitDialog = document.getElementById('exam-submit-dialog');
  var announcedTen = new Set(), catalogErrors = [];
  var reviewTab = 'results', reviewWidth = 38;
  var caseSettingsKey = 'belre3-case-panel-v1', caseOpen = true, caseWidth = 100 / 3;
  var caseScrollPositions = Object.create(null);
  try {
    var caseSettings = JSON.parse(sessionStorage.getItem(caseSettingsKey) || '{}');
    if(typeof caseSettings.open === 'boolean')caseOpen = caseSettings.open;
    if(typeof caseSettings.width === 'number' && Number.isFinite(caseSettings.width))caseWidth = Math.max(25,Math.min(60,caseSettings.width));
  } catch (_) {}
  var completedType = 'all', completedAttempts = 'all';
  var catalog = (window.CAFA2_EXAMS || []).filter(function (exam) {
    var result = Engine.validateExam(exam);
    if (!result.valid) catalogErrors.push((exam && exam.id || 'Onbekend') + ': ' + result.errors.join(' '));
    return result.valid;
  });
  var demo = window.CAFA2_EXAM_DEMO;
  catalog.sort(function(a,b){return b.date.localeCompare(a.date);});
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g,function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function rich(html, plain) { return html ? Editor.sanitize(html) : '<p class="exam-prose">' + esc(plain || '') + '</p>'; }
  function date(value) { return value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('nl-NL',{day:'2-digit',month:'2-digit',year:'numeric'}) : 'Niet vastgelegd'; }
  function datetime(value) { return value ? new Date(value).toLocaleString('nl-NL',{dateStyle:'short',timeStyle:'short'}) : 'Niet vastgelegd'; }
  function legacyOpgave(exam) { return exam.practiceKind === 'opgave' && exam.selectionBasis !== 'topic'; }
  function label(exam) { return legacyOpgave(exam) ? 'Oude indeling · bronopgave ' + exam.opgaveNumber + ' uit elk tentamen' : (exam.demo || exam.practiceKind === 'opgave' ? exam.title : exam.title + ' · ' + date(exam.date)); }
  function codeLabel(exam) { return exam.practiceKind === 'opgave' ? 'OPG' + exam.opgaveNumber + (legacyOpgave(exam) ? '-OUD' : '') : exam.date.replace(/-/g,''); }
  function link(hash) { return '#' + hash; }
  function announce(message) { document.getElementById('exam-announcement').textContent = message; }
  function attempts() { return store.attempts; }
  function active() { return attempts().find(function (attempt) { return attempt.status === 'active'; }); }
  function running(examId) { return attempts().filter(function(a){return a.status==='active' && (!examId || a.exam.id===examId);}); }
  function documentHtml(exam,kind,html,plain,sourceExamId,questionId) { var original=sourceExamId&&catalog.find(function(e){return e.id===sourceExamId;});return window.CafaExamDocument ? window.CafaExamDocument.render(original||exam,kind,html,plain,questionId) : '<div class="exam-document">'+rich(html,plain)+'</div>'; }
  function questionHtml(exam,q) {
    var content=documentHtml(exam,'question',q.promptHtml,q.prompt,q.sourceExamId);
    if(q.modelReviewVerdict==='conditional_on_explicit_assumption'&&Array.isArray(q.practiceAssumptions2026)&&q.practiceAssumptions2026.length){
      content+='<details class="exam-model-assumptions" open><summary>Oefenaannames voor deze vraag</summary><p>Voor het oefenmodel van 2026 gelden de onderstaande aanvullende uitgangspunten. Deze staan niet vast in de oorspronkelijke opgave.</p><ul>'+q.practiceAssumptions2026.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ul></details>';
    }
    return content;
  }
  function byId(id) { return attempts().find(function (attempt) { return attempt.id === id; }); }
  function selectedRunner() { return selectedAttempt && location.hash === '#tentamen/'+encodeURIComponent(selectedAttempt) ? byId(selectedAttempt) : null; }
  function examById(id) { return catalog.find(function (exam) { return exam.id === id; }) || (demo && demo.id === id ? demo : null); }
  function loadState(raw) {
    var parsed = JSON.parse(raw);
    var refs = Object.create(null), partitioned = parsed && parsed.version === 2;
    if(partitioned){
      if(!Array.isArray(parsed.attempts))throw new Error('Onbekend formaat');
      parsed={version:1,attempts:parsed.attempts.map(function(ref){
        if(!ref || !/^[\w.-]+$/.test(ref.id) || typeof ref.key!=='string' || !ref.key.startsWith(KEY+':attempt:'+ref.id+':') || refs[ref.id])throw new Error('Ongeldige opslagverwijzing');
        var attempt=JSON.parse(localStorage.getItem(ref.key));
        if(!attempt || attempt.id!==ref.id)throw new Error('Ontbrekende poging');
        refs[ref.id]=ref.key;return attempt;
      })};
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.attempts)) throw new Error('Onbekend formaat');
    parsed.attempts.forEach(function (attempt) {
      if (!attempt || !Engine.validateExam(attempt.exam).valid || !/^[\w.-]+$/.test(attempt.id) ||
          !Number.isSafeInteger(attempt.startedAt) || !Number.isSafeInteger(attempt.deadlineAt) ||
          attempt.deadlineAt <= attempt.startedAt || !['active','completed'].includes(attempt.status) ||
          !attempt.answers || typeof attempt.answers !== 'object' || Array.isArray(attempt.answers)) throw new Error('Ongeldige poging');
      if(attempt.pausedAt!=null && (!Number.isSafeInteger(attempt.pausedAt)||(!attempt.untimed&&(!Number.isFinite(attempt.pausedSeconds)||attempt.pausedSeconds<0))))throw new Error('Ongeldige pauze');
      attempt.currentIndex = Math.max(0,Math.min(attempt.exam.questions.length - 1, Math.floor(Number(attempt.currentIndex) || 0)));
      attempt.marked = attempt.marked && typeof attempt.marked === 'object' ? attempt.marked : {};
      attempt.exam.questions.forEach(function (q) {
        var answer = attempt.answers[q.id];
        if (answer && typeof answer.html === 'string') answer.html = Editor.sanitize(answer.html);
      });
    });
    storageRefs=refs;splitStorage=partitioned;migrationBlocked=false;return parsed;
  }
  try { var saved = localStorage.getItem(KEY); if (saved) store = loadState(saved); }
  catch (error) { corrupt = true; saveOK = false; }
  function save() {
    if (corrupt) { updateSaveStatus(); return false; }
    var changed=splitStorage?Array.from(arguments).filter(Boolean):attempts(), minted=[],oldRefs=storageRefs;
    try {
      if(migrationBlocked){localStorage.setItem(KEY,JSON.stringify(store));}
      else {
        if(splitStorage&&!changed.length)changed=attempts();
        var refs=Object.assign(Object.create(null),storageRefs);
        changed.forEach(function(a){
          var key=KEY+':attempt:'+a.id+':'+Date.now()+'-'+Math.random().toString(36).slice(2);
          minted.push(key);localStorage.setItem(key,JSON.stringify(a));refs[a.id]=key;
        });
        var manifest={version:2,attempts:attempts().map(function(a){if(!refs[a.id])throw new Error('Ontbrekende poging');return {id:a.id,key:refs[a.id]};})};
        // Publish references only after every new snapshot has been written.
        localStorage.setItem(KEY,JSON.stringify(manifest));
        storageRefs=Object.fromEntries(manifest.attempts.map(function(ref){return [ref.id,ref.key];}));splitStorage=true;
        Object.values(oldRefs).forEach(function(key){if(!Object.values(storageRefs).includes(key))try{localStorage.removeItem(key);}catch(_){}});
      }
      saveOK=true;
    } catch (error) {
      minted.forEach(function(key){try{localStorage.removeItem(key);}catch(_){}});saveOK=false;
      // A full legacy store may not have room for a second copy during migration.
      // Keep its existing format usable rather than discarding any old attempt.
      if(!splitStorage)try{localStorage.setItem(KEY,JSON.stringify(store));migrationBlocked=true;saveOK=true;}catch(_){}
    }
    updateSaveStatus();
    if(saveOK)window.dispatchEvent(new Event('belre:question-progress'));
    return saveOK;
  }
  function updateSaveStatus() {
    var indicator=document.querySelector('.exam-save-indicator');
    if(indicator){indicator.hidden=!saveOK;}
    host.querySelectorAll('[data-exam-save]').forEach(function (el) {
      var a=byId(selectedAttempt);
      el.textContent = saveOK ? ('Opgeslagen op dit apparaat.'+(a&&a.untimed?' Je oefent zonder tijdslimiet.':a&&a.pausedAt!=null?' De klok is gepauzeerd.':' De klok loopt door totdat je pauzeert.')) : 'Opslaan lukt niet. Houd deze pagina open en download een back-up van je antwoorden.';
      el.classList.toggle('is-error',!saveOK);
    });
  }
  function downloadBackup() {
    var blob = new Blob([JSON.stringify(store,null,2)],{type:'application/json'}), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download='BELRE3-tentamenpogingen.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); },1000);
  }
  function dropEditor() { if (editor) { editor.destroy(); editor = null; } }
  function go(hash) { if (location.hash === '#' + hash) route(); else location.hash = hash; }
  function restartNotice(attempt) {
    return attempt?'<p class="notice">Je begint opnieuw. Kies hieronder de instellingen voor je nieuwe poging. Je eerdere antwoorden blijven bewaard bij Voltooid; een lopende poging wordt daar pas bewaard zodra je de nieuwe poging start.</p>':'';
  }
  function startAttempt(exam,options,restartId) {
    var previous=restartId&&byId(restartId);
    if(restartId&&!previous)throw new Error('De eerdere poging is niet meer beschikbaar. Open het Dashboard en kies de toets opnieuw.');
    var next=Engine.createAttempt(exam,options),before=store.attempts;
    store.attempts=before.map(function(a){
      if(a!==previous||a.status!=='active')return a;
      var completed=Engine.finishAttempt(a,{reason:'submitted'});completed.finishReason='restarted';return completed;
    }).concat(next);
    if(!save(next,restartId&&byId(restartId))){store.attempts=before;throw new Error('De nieuwe poging kon niet worden opgeslagen. Je eerdere poging is behouden.');}
    if(restartId&&window.CafaStudy)window.CafaStudy.clearReturn();
    if(window.StudyMeasure)window.StudyMeasure.activity('Tentamen gestart',window.StudyMeasure.examNames(next.exam));
    go('tentamen/'+next.id);
  }
  function resetAttempts() {
    if(!confirm('Alle tentamenvoortgang op dit apparaat resetten? Alle lopende en voltooide tentamenpogingen, antwoorden, scores, markeringen en klokken worden verwijderd. Ook tentamenvragen per onderwerp worden gereset. Je MC-oefenvoortgang blijft behouden.'))return;
    var empty={version:1,attempts:[]};
    try{localStorage.setItem(KEY,JSON.stringify({version:2,attempts:[]}));}
    catch(error){announce('Resetten is niet gelukt. Je tentamenvoortgang is behouden.');showModal('Resetten niet mogelijk','<p>Je tentamenvoortgang kon niet worden gereset. Je bestaande pogingen zijn behouden.</p>');return;}
    var oldRefs=storageRefs;storageRefs={};splitStorage=true;migrationBlocked=false;
    Object.values(oldRefs).forEach(function(key){try{localStorage.removeItem(key);}catch(_){}});
    dropEditor();store=empty;corrupt=false;saveOK=true;selectedAttempt=null;announcedTen.clear();caseScrollPositions=Object.create(null);
    if(window.CafaStudy)window.CafaStudy.clearReturn();
    go('dashboard');announce('Alle tentamenvoortgang op dit apparaat is gereset. Je MC-oefenvoortgang is behouden.');
  }
  function btn(text,action,primary,extra) { return '<button type="button" class="btn' + (primary?' primary':'') + '" data-exam-action="' + action + '" ' + (extra || '') + '>' + text + '</button>'; }
  function head(title,sub) { return '<div class="exam-page-head"><div><div class="exam-eyebrow">BELRE3 · oefenomgeving</div><h1>' + esc(title) + '</h1>' + (sub?'<p>'+esc(sub)+'</p>':'') + '</div></div>'; }
  function available(exam) { var now = Date.now(); return (!exam.availableFrom || now >= Date.parse(exam.availableFrom)) && (!exam.deadline || now < Date.parse(exam.deadline)); }
  function table(rows,kind,toolbar) {
    var columns = kind==='completed' ? ['Toetsnaam','Code','Ingeleverd','Percentage juist','Cijfer','Resultaat'] : kind==='reviews' ? ['Toetsnaam','Code','Begint','Eindtijd','Percentage juist','Cijfer','Resultaat'] : ['Toetsnaam','Code','Beschikbaar','Deadline','Duur'];
    return '<div class="exam-table-wrap">'+(toolbar||'')+'<table class="exam-table exam-table-'+kind+'"><thead><tr>'+columns.map(function(title){return '<th scope="col">'+title+'</th>';}).join('')+'<th scope="col"><span class="sr-only">Actie</span></th></tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td class="exam-empty-cell" colspan="'+(columns.length+1)+'">'+(kind==='reviews'?'Geen geplande inzages':kind==='completed'?'Geen voltooide toetsen':'Geen toetsen')+'</td></tr>')+'</tbody></table></div>';
  }
  function restartButton(examId,attemptId){return attempts().some(function(a){return a.exam.id===examId;})?btn('Opnieuw beginnen','restart',false,'data-exam-id="'+esc(examId)+'" '+(attemptId?'data-restart-attempt="'+esc(attemptId)+'"':'')):'';}
  function dashboard(completed) {
    var live = running(), completedExams = attempts().filter(function (a) { return a.status === 'completed'; });
    var completedPractice = window.CafaPractice ? window.CafaPractice.getCompleted() : [];
    var viewName=completed?'Voltooid':'Aankomend';
    var html='<div class="exam-dashboard-title"><h1>Dashboard</h1></div><div class="exam-dashboard-content"><nav class="exam-breadcrumb" aria-label="Kruimelpad"><a href="#dashboard" aria-label="Dashboard"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1 9 10 1l9 8-2 2-1-1v8h-5v-5H8v5H3v-8l-1 1Z"/></svg></a><span>/</span><span aria-current="page">'+viewName+'</span></nav><div class="exam-dashboard-view"><label class="exam-switch"><span class="sr-only">Toetsen weergeven</span><select data-exam-filter aria-label="Toetsen weergeven"><option value="upcoming"'+(!completed?' selected':'')+'>Aankomend</option><option value="completed"'+(completed?' selected':'')+'>Voltooid</option></select></label></div>';
    if (corrupt) html += '<p class="exam-warning" role="alert">Eerder opgeslagen tentamenpogingen konden niet worden gelezen. Ze zijn niet overschreven. Nieuwe tentamens starten is geblokkeerd om je gegevens te beschermen.</p>';
    if (catalogErrors.length) html += '<p class="exam-warning" role="alert">Een tentamen kon niet worden geladen. De overige toetsen zijn beschikbaar.</p>';
    if (completed) {
      var rows = completedExams.map(function (attempt) {
        return {type:'exam',key:attempt.exam.id,time:attempt.submittedAt,html:'<tr><td><a class="exam-name" href="#inzage/'+encodeURIComponent(attempt.id)+'">'+esc(label(attempt.exam))+'</a><span class="exam-sub">'+(attempt.finishReason==='timeout'?'Tijd verstreken':attempt.finishReason==='restarted'?'Bewaard vóór opnieuw beginnen':'Ingeleverd')+' · '+Engine.answeredCount(attempt)+' / '+attempt.exam.questions.length+' beantwoord</span></td><td data-label="Code">'+esc(codeLabel(attempt.exam))+'</td><td data-label="Ingeleverd">'+datetime(attempt.submittedAt)+'</td><td data-label="Percentage juist">'+(totals(attempt,attempt.exam.questions).pending?'Nog niet volledig beoordeeld':num(100*totals(attempt,attempt.exam.questions).score/(totals(attempt,attempt.exam.questions).max||1))+'%')+'</td><td data-label="Cijfer">Niet bekend</td><td data-label="Resultaat">Zelf nakijken</td><td><a class="btn primary" href="#inzage/'+encodeURIComponent(attempt.id)+'">Weergeven</a>'+restartButton(attempt.exam.id,attempt.id)+'</td></tr>'};
      }).concat(completedPractice.map(function (item) {
        var target = item.href || '#mc-inzage/' + encodeURIComponent(item.id);
        var percent=item.auto?Math.round(1000*item.good/item.auto)/10:null;
        return {type:'practice',key:item.code,time:item.submittedAt || 0,html:'<tr><td><a class="exam-name" href="'+esc(target)+'">'+esc(item.title)+'</a><span class="exam-sub">Poging '+esc(item.attempt||1)+' · '+item.answered+' / '+item.total+' beantwoord</span></td><td data-label="Code">'+esc((item.code||'MC').toUpperCase())+'</td><td data-label="Ingeleverd">'+datetime(item.submittedAt)+'</td><td data-label="Percentage juist">'+(percent===null?'Niet beoordeeld':percent.toLocaleString('nl-NL')+'%<span class="exam-sub">Alleen nagekeken MC</span>')+'</td><td data-label="Cijfer">Niet bekend</td><td data-label="Resultaat">'+item.good+' / '+item.auto+' nagekeken MC goed</td><td><a class="btn primary" href="'+esc(target)+'">Weergeven</a></td></tr>'};
      })).sort(function(a,b){return new Date(b.time)-new Date(a.time);});
      var seen=new Set();
      rows=rows.filter(function(row){if(completedType!=='all'&&completedType!==row.type)return false;var key=row.type+':'+row.key;if(completedAttempts==='latest'&&seen.has(key))return false;seen.add(key);return true;});
      var toolbar='<div class="exam-results-filters"><label>Weergeven <select data-completed-type><option value="all">Alles</option><option value="exam">Tentamens</option><option value="practice">MC-oefenvragen</option></select></label><label>Filteren op: <select data-completed-attempts><option value="all">Alle pogingen</option><option value="latest">Laatste poging per toets</option></select></label></div>';
      html+='<section class="exam-section"><h2>Geplande inzages</h2>'+table([],'reviews')+'</section><section class="exam-section"><h2>Voltooide toetsen</h2>'+table(rows.map(function(r){return r.html;}),'completed',toolbar)+'</section>';
    } else {
      var ready = catalog.filter(function(e){return available(e)&&!e.supplemental;});
      function examRow(exam,resume) { var target=resume?'#tentamen/'+encodeURIComponent(resume.id):'#welkom/'+encodeURIComponent(exam.id);return '<tr><td><a class="exam-name" href="'+target+'">'+esc(label(exam))+'</a>'+(resume?'<span class="exam-sub">Gestart '+datetime(resume.startedAt)+' · '+(resume.pausedAt!=null?'Gepauzeerd · ':'')+Engine.formatTime(Engine.remainingSeconds(resume))+'</span>':'')+'</td><td data-label="Code">'+esc(codeLabel(exam))+'</td><td data-label="Beschikbaar">'+(exam.practiceKind==='opgave'?'Altijd beschikbaar':exam.availableFrom?datetime(exam.availableFrom):'Nu beschikbaar')+'</td><td data-label="Deadline">'+(exam.deadline?datetime(exam.deadline):'Geen deadline')+'</td><td data-label="Duur">'+(exam.practiceKind==='opgave'?'Geen tijdslimiet':exam.defaultUntimed?'Zonder tijdslimiet':(exam.durationMinutes+(resume?resume.extraMinutes:0))+' minuten')+'</td><td><a class="btn primary" href="'+target+'">'+(resume?'Toets hervatten':running(exam.id).length?'Nieuwe poging':available(exam)?'Toets starten':'Details bekijken')+'</a>'+(resume?'<a class="btn" href="#welkom/'+encodeURIComponent(exam.id)+'">Nieuwe poging</a>':'')+restartButton(exam.id,resume&&resume.id)+'</td></tr>'; }
      var today=['<tr><td><a class="exam-name" href="#oefenen">BELRE3 MC-oefenvragen</a><span class="exam-sub">Syllabusvragen, tentamenvragen en korte vragen</span></td><td>BELRE3-MC</td><td>Altijd beschikbaar</td><td>Geen deadline</td><td>Geen tijdslimiet</td><td><a class="btn primary" href="#oefenen">Oefenen</a></td></tr>','<tr><td><a class="exam-name" href="#welkom/opgaven">Open tentamenvragen per onderwerp of hoorcollege</a><span class="exam-sub">Volledige bronopgaven uit verschillende tentamens</span></td><td>BELRE3-OPG</td><td>Altijd beschikbaar</td><td>Geen deadline</td><td>Geen tijdslimiet</td><td><a class="btn primary" href="#welkom/opgaven">Samenstellen</a></td></tr>'];
      var scheduled=live.filter(function(a){return !a.exam.supplemental;}).map(function(a){return {exam:a.exam,resume:a};}).concat(ready.filter(function(exam){return !live.some(function(a){return a.exam.id===exam.id;});}).map(function(exam){return {exam:exam,resume:null};}));
      scheduled.sort(function(a,b){return Number(a.exam.practiceKind==='opgave')-Number(b.exam.practiceKind==='opgave')||b.exam.date.localeCompare(a.exam.date)||(b.resume?b.resume.startedAt:0)-(a.resume?a.resume.startedAt:0);});
      today=today.concat(scheduled.map(function(item){return examRow(item.exam,item.resume);}));
      html+='<section class="exam-section"><h2>Vandaag</h2>'+table(today,'upcoming')+'</section>';
      var extra=catalog.filter(function(e){return e.supplemental;});if(extra.length)html+='<details class="exam-section supplemental-exams"><summary>Aanvullend: Vpb-selectie uit Tax 2</summary><p>Afzonderlijke selectie. BELRE2-vragen zijn uitgesloten.</p>'+table(extra.map(function(e){return examRow(e,running(e.id)[0]);}),'upcoming')+'</details>';
      var soon = catalog.filter(function(exam){return exam.availableFrom && Date.parse(exam.availableFrom)>Date.now() && Date.parse(exam.availableFrom)<=Date.now()+30*86400000;});
      html += '<section class="exam-section"><h2>Volgende 30 dagen</h2>'+(soon.length?table(soon.map(function(exam){return examRow(exam,false);}),'upcoming'):'<div class="exam-empty-row">Geen toetsen</div>')+'</section>';
    }
    html += '<footer class="exam-dashboard-help"><p class="exam-local-note">Oefenomgeving. Je antwoorden en pogingen blijven in deze browser, op dit apparaat. Bewaar zelf een back-up; je voortgang wordt niet tussen apparaten gesynchroniseerd.</p><div class="actions">'+btn('Back-up downloaden','backup')+'<a class="btn" href="#voortgang">MC-voortgang</a>'+btn('Alle tentamenvoortgang resetten','reset-exams',false,(!attempts().length&&!corrupt?'disabled':'')+' aria-describedby="exam-reset-scope"')+'</div><p class="small" id="exam-reset-scope">Reset alle lopende en voltooide tentamenpogingen op dit apparaat. Je MC-oefenvoortgang blijft behouden.</p></footer></div>';
    host.innerHTML = html;
    if(completed){host.querySelector('[data-completed-type]').value=completedType;host.querySelector('[data-completed-attempts]').value=completedAttempts;}
  }
  function details(exam, extra) {
    var entries = [['Vragen',exam.questions.length],['Duur',exam.defaultUntimed?'Zonder tijdslimiet':(exam.durationMinutes+(extra?30:0))+' minuten'],['Opgaven',exam.sourceSectionCount||'Niet van toepassing'],['Max. score',exam.maxScore!==undefined?exam.maxScore+' punten':'Niet van toepassing'],['Cesuur',exam.passPoints!==undefined?exam.passPoints+' punten':'Niet van toepassing'],['Poging',attempts().filter(function(a){return a.exam.id===exam.id;}).length+1]];
    return '<dl class="exam-details">'+entries.map(function(e){return '<div><dt>'+esc(e[0])+'</dt><dd'+(e[0]==='Duur'?' data-exam-detail-duration':'')+'>'+esc(e[1])+'</dd></div>';}).join('')+'</dl>';
  }
  function introduction(exam) {
    return documentHtml(exam,'exam',exam.introductionHtml,exam.introduction)+(exam.instructions&&exam.instructions.length?'<ul class="exam-instructions">'+exam.instructions.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ul>':'');
  }
  function topicQuestionCount(exam,number) {
    if(Opgave.questionCount)return Opgave.questionCount(exam,number);
    var sourceId=Opgave.sourceSectionId(exam,number);
    return sourceId?exam.questions.filter(function(q){return q.sectionId===sourceId;}).length:0;
  }
  function opgaveCollege(number) {
    return Opgave.collegeChoices.find(function(college){return college.wholeCollege.number===number||college.topics.some(function(topic){return topic.number===number;});})||Opgave.collegeChoices[0];
  }
  function opgaveTopicOptions(college,number) {
    function option(item,whole) {
      return '<label'+(whole?' class="opgave-whole-college"':'')+'><input type="radio" name="opgave-number" value="'+item.number+'"'+(item.number===number?' checked':'')+'><span><strong>'+esc(whole?'Het hele hoorcollege':item.title)+'</strong>'+(whole?'<small>Alle stof van '+esc(college.title.toLowerCase())+'</small>':'')+'</span></label>';
    }
    return option(college.wholeCollege,true)+'<p class="opgave-topic-divider">Of kies één onderwerp</p><div class="opgave-topic-grid">'+college.topics.map(function(item){return option(item,false);}).join('')+'</div>';
  }
  function updateOpgaveSelection() {
    var choice=host.querySelector('[name="opgave-number"]:checked');if(!choice||!Opgave)return;
    var number=Number(choice.value),eligible=Opgave.available(catalog,number);
    host.querySelectorAll('[data-opgave-exam]').forEach(function(input){
      var exam=eligible.find(function(item){return item.id===input.value;});
      input.disabled=!exam;
      input.closest('label').hidden=!exam;
      var count=input.closest('label').querySelector('[data-opgave-exam-count]');
      if(count){
        var sourceId=exam&&Opgave.sourceSectionId(exam,number);
        count.textContent=exam?topicQuestionCount(exam,number)+' vragen · '+Opgave.sourceLabel(exam,number):'Niet beschikbaar';
      }
    });
    var empty=host.querySelector('[data-opgave-no-exams]');if(empty)empty.hidden=eligible.length>0;
    var chosen=Array.from(host.querySelectorAll('[data-opgave-exam]:checked:not(:disabled)'));
    var questions=chosen.reduce(function(total,input){var exam=eligible.find(function(item){return item.id===input.value;});return total+topicQuestionCount(exam,number);},0);
    var summary=host.querySelector('[data-opgave-summary]');if(summary)summary.textContent=chosen.length+' tentamen'+(chosen.length===1?'':'s')+' geselecteerd · '+questions+' vragen · zonder tijdslimiet';
    var start=host.querySelector('[data-exam-action="start-opgave"]');if(start)start.disabled=!chosen.length||corrupt;
  }
  function welcomeOpgave(restarting,topicId) {
    if(!Opgave)return missing();
    var subject=Opgave.choices.find(function(item){return item.number<100&&item.topicIds.includes(topicId);});
    var selectedNumber=restarting?restarting.exam.opgaveNumber:subject?subject.number:1,college=opgaveCollege(selectedNumber);
    var sources=catalog.filter(function(exam){return Opgave.choices.some(function(item){return Opgave.available([exam],item.number).length;});}).sort(function(a,b){return b.date.localeCompare(a.date);}),live=running().filter(function(a){return a.exam.practiceKind==='opgave';});
    host.innerHTML='<a class="exam-back" href="#dashboard">‹ Dashboard</a>'+head('Tentamenvragen per onderwerp','Oefen een volledig hoorcollege of één onderwerp met vragen uit eerdere tentamens.')+
      '<div class="exam-paper opgave-practice-builder">'+restartNotice(restarting)+'<h2>Stel je oefenreeks samen</h2><p class="exam-prose">Kies eerst een hoorcollege, daarna de stof en de brontentamens. Je oefent van nieuw naar oud, zonder tijdslimiet.</p>'+
      '<fieldset class="opgave-college-step"><legend>1. Kies het hoorcollege</legend><div class="opgave-college-grid">'+Opgave.collegeChoices.map(function(item){return '<label><input type="radio" name="opgave-college" data-opgave-college value="'+esc(item.id)+'" aria-label="'+esc(item.title)+'"'+(item.id===college.id?' checked':'')+'><span>'+esc(item.title.replace(/^Hoorcollege\s+/,'HC '))+'</span></label>';}).join('')+'</div></fieldset>'+
      '<fieldset class="opgave-practice-options"><legend>2. Kies de stof binnen dit hoorcollege</legend><div data-opgave-topics>'+opgaveTopicOptions(college,selectedNumber)+'</div></fieldset>'+
      '<fieldset class="opgave-practice-exams"><legend>3. Kies de brontentamens</legend>'+sources.map(function(exam){return '<label><input type="checkbox" data-opgave-exam value="'+esc(exam.id)+'"'+((restarting?(restarting.exam.sourceExamIds||[]).includes(exam.id):!exam.supplemental)?' checked':'')+'><span>'+esc(date(exam.date))+(exam.supplemental?' · Aanvullend: Tax 2':'')+' <strong>('+esc(exam.date.replace(/-/g,''))+')</strong><small data-opgave-exam-count></small></span></label>';}).join('')+'</fieldset>'+
      '<p class="opgave-source-note" data-opgave-no-exams hidden>Er zijn geen brontentamens aan deze keuze gekoppeld. Kies een ander onderwerp of het hele hoorcollege om een oefenreeks te starten.</p>'+
      '<p class="opgave-source-note">Je oefent met volledige bronopgaven. Bij een gemengde opgave kunnen ook deelvragen over andere onderwerpen meekomen. De casus, eerdere antwoorden, PDF en het oefenmodel blijven bij de oorspronkelijke vraag.</p>'+
      '<p class="opgave-practice-summary" data-opgave-summary role="status"></p>'+(live.length?'<div class="exam-banner"><div><strong>Lopende oefenreeksen</strong>'+live.map(function(a){return '<p><a class="btn" href="#tentamen/'+encodeURIComponent(a.id)+'">'+esc(label(a.exam))+' hervatten · '+datetime(a.startedAt)+'</a></p>';}).join('')+'</div></div>':'')+
      '<div class="exam-start-actions">'+btn('Oefenreeks starten','start-opgave',true,restarting?'data-restart-attempt="'+esc(restarting.id)+'"':'')+(corrupt?'<span class="small">Starten is geblokkeerd omdat eerder opgeslagen pogingen niet gelezen konden worden.</span>':'')+'</div></div>';
    updateOpgaveSelection();
  }
  function welcome(id,restartId,topicId) {
    var restarting=restartId&&byId(restartId);
    if(restartId&&(!restarting||(id==='opgaven'?restarting.exam.practiceKind!=='opgave':restarting.exam.id!==id)))return missing();
    if(id==='practice'){go('oefenen');return;}
    if(id==='opgaven'){welcomeOpgave(restarting,topicId);return;}
    var exam = examById(id)||(restarting&&restarting.exam); if(!exam) return missing();
    var live=running(id);
    host.innerHTML='<a class="exam-back" href="#dashboard">‹ Dashboard</a>'+head(label(exam),'Welkom. Lees eerst de informatie en kies eventueel extra tijd.')+'<div class="exam-paper">'+restartNotice(restarting)+(exam.demo?'<p class="exam-warning">Demonstratie van de bediening, geen officieel CAFA2-tentamen.</p>':'<p class="notice">Je oefent met een eerder afgenomen tentamen. Het oorspronkelijke voorblad staat in de tentamen-PDF. De oefenklok begint pas als je nu start.</p>')+introduction(exam)+details(exam,false)+(live.length?'<div class="exam-banner"><div><p>Je hebt '+live.length+' lopende poging(en) van dit tentamen. Hervat een poging of start hieronder een nieuwe.</p>'+live.map(function(a){return '<p><a class="btn" href="#tentamen/'+a.id+'">Hervatten · '+datetime(a.startedAt)+' · '+Engine.formatTime(Engine.remainingSeconds(a))+'</a></p>';}).join('')+'</div></div>':'')+'<label class="exam-extra"><input type="checkbox" data-exam-untimed'+(exam.defaultUntimed?' checked':'')+'><span><strong>Oefenen zonder tijdslimiet</strong><small>Geen aftelklok en geen automatische inlevering.</small></span></label><label class="exam-extra"><input type="checkbox" data-exam-extra'+(exam.defaultUntimed?' disabled':'')+'><span><strong>Extra tijd activeren (+30 minuten)</strong><small>Eenmalig vóór de start. Totale toetstijd: <span data-exam-total>'+exam.durationMinutes+'</span> minuten.</small></span></label><p class="small">Elke poging heeft eigen antwoorden en een eigen klok. Bij oefenen met tijd loopt de klok door bij wisselen, sluiten of verversen. Je kunt de toets pauzeren. Bij nul wordt de poging ingeleverd. Je kunt ook per vraag je antwoord controleren.</p><div class="exam-start-actions">'+btn('Toets starten','start',true,'data-exam-id="'+esc(exam.id)+'" '+(restarting?'data-restart-attempt="'+esc(restarting.id)+'" ':'')+(!available(exam)||corrupt?'disabled':''))+(available(exam)?'':'<span class="small">'+(exam.availableFrom&&Date.parse(exam.availableFrom)>Date.now()?'Beschikbaar vanaf '+datetime(exam.availableFrom):'De starttermijn is verstreken.')+'</span>')+'</div>'+'</div>';
  }
  function answerFor(attempt,q) { return attempt.answers[q.id] || {}; }
  function answered(attempt,q) { return Engine.answeredCount({exam:{questions:[q]},answers:attempt.answers})>0; }
  function sectionFor(attempt,q) { return (attempt.exam.sections||[]).find(function(s){return s.id===q.sectionId;}); }
  function saveCaseSettings() {
    try { sessionStorage.setItem(caseSettingsKey,JSON.stringify({open:caseOpen,width:caseWidth})); } catch (_) {}
  }
  function updateCasePanel() {
    var layout=host.querySelector('.exam-case-layout');if(!layout)return;
    var panel=layout.querySelector('#exam-case-panel'),handle=layout.querySelector('.exam-case-resizer');
    panel.hidden=!caseOpen;handle.hidden=!caseOpen;
    layout.classList.toggle('is-case-hidden',!caseOpen);
    layout.style.setProperty('--case-width',caseWidth+'%');
    handle.setAttribute('aria-valuenow',String(Math.round(caseWidth)));
    handle.setAttribute('aria-valuetext',Math.round(caseWidth)+' procent casusbreedte');
    host.querySelectorAll('[data-exam-action="section"]').forEach(function(button){
      button.removeAttribute('aria-haspopup');button.setAttribute('aria-controls','exam-case-panel');
      button.setAttribute('aria-expanded',String(caseOpen));button.setAttribute('aria-pressed',String(caseOpen));
      button.title=caseOpen?'Casus verbergen':'Casus tonen';
    });
  }
  function mountCasePanel(attempt,section,previousPanel) {
    if(!section)return;
    var body=host.querySelector('.exam-question-body'),layout=document.createElement('div');
    layout.className='exam-case-layout';body.before(layout);
    var handle=document.createElement('div');handle.className='exam-case-resizer';handle.tabIndex=0;
    handle.setAttribute('role','separator');handle.setAttribute('aria-label','Breedte van de casus links aanpassen');
    handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-controls','exam-case-panel');
    handle.setAttribute('aria-valuemin','25');handle.setAttribute('aria-valuemax','60');
    handle.title='Sleep naar rechts voor een bredere casus of naar links voor een smallere casus. Gebruik ook de pijltjestoetsen, Home en End.';
    handle.innerHTML='<span aria-hidden="true">⋮</span>';
    var reuse=previousPanel&&previousPanel.dataset.caseKey===attempt.id+':'+section.id;
    var panel=reuse?previousPanel:document.createElement('aside');panel.id='exam-case-panel';
    if(!reuse)panel.className='exam-case-panel';
    panel.dataset.caseKey=attempt.id+':'+section.id;
    panel.setAttribute('aria-labelledby','exam-case-heading');
    if(!reuse){panel.innerHTML='<h2 id="exam-case-heading">'+esc(section.title)+'</h2>'+documentHtml(attempt.exam,'case',section.contentHtml,null,section.sourceExamId,section.sourceSectionId||section.id);
      panel.querySelectorAll('table').forEach(function(table){if(table.parentElement.classList.contains('exam-case-table-scroll'))return;var wrap=document.createElement('div');wrap.className='exam-case-table-scroll';table.before(wrap);wrap.append(table);});}
    layout.append(panel,handle,body);updateCasePanel();
    panel.scrollTop=caseScrollPositions[panel.dataset.caseKey]||0;
    handle.addEventListener('pointerdown',function(e){
      if(e.button!==0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);
      handle.dataset.dragging='true';layout.classList.add('is-resizing');
    });
    handle.addEventListener('pointermove',function(e){
      if(handle.dataset.dragging!=='true')return;
      var rect=layout.getBoundingClientRect();if(!rect.width)return;
      caseWidth=Math.max(25,Math.min(60,100*(e.clientX-rect.left)/rect.width));updateCasePanel();
    });
    function finishResize(){delete handle.dataset.dragging;layout.classList.remove('is-resizing');saveCaseSettings();}
    handle.addEventListener('pointerup',function(e){finishResize();if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);});
    handle.addEventListener('pointercancel',finishResize);handle.addEventListener('lostpointercapture',finishResize);
    handle.addEventListener('keydown',function(e){
      var value=caseWidth;
      if(e.key==='ArrowLeft')value-=5;else if(e.key==='ArrowRight')value+=5;
      else if(e.key==='Home')value=25;else if(e.key==='End')value=60;else return;
      e.preventDefault();caseWidth=Math.max(25,Math.min(60,value));updateCasePanel();saveCaseSettings();
    });
  }
  function updateQuestionNav(attempt) {
    host.querySelectorAll('[data-exam-index]').forEach(function(el){var i=Number(el.dataset.examIndex),q=attempt.exam.questions[i];el.classList.toggle('is-answered',answered(attempt,q));el.classList.toggle('is-marked',!!attempt.marked[q.id]);el.setAttribute('aria-label','Vraag '+(i+1)+(answered(attempt,q)?', beantwoord':', niet beantwoord')+(attempt.marked[q.id]?', gemarkeerd':''));});
  }
  function runner(id) {
    var attempt=byId(id); if(!attempt)return missing(); if(attempt.status==='completed'){go('inzage/'+id);return;}
    if(attempt.pausedAt!=null){host.innerHTML=head(label(attempt.exam),'Toets gepauzeerd')+'<div class="exam-paper exam-paused"><h2>Je toets is gepauzeerd</h2><p>Je antwoorden zijn bewaard. De resterende tijd verandert niet tijdens de pauze.</p><p>'+esc(Engine.formatTime(Engine.remainingSeconds(attempt)))+'</p>'+btn('Toets hervatten','resume',true)+' <a class="btn" href="#dashboard">Dashboard</a></div>';return;}
    var i=attempt.currentIndex,q=attempt.exam.questions[i],section=sectionFor(attempt,q),previousPanel=host.querySelector('#exam-case-panel');
    host.innerHTML='<h1 class="exam-runner-title">'+esc(label(attempt.exam))+'</h1><div class="frame"><div class="exam-work-head"><div class="exam-question-identity"><span>VRAAG</span><span class="qnum">'+(i+1)+'</span>'+(section?btn('Casus','section',false,'aria-haspopup="dialog"'):'')+'</div><div class="exam-position">VRAAG <strong>'+(i+1)+'</strong> VAN <strong>'+attempt.exam.questions.length+'</strong></div></div><div class="exam-question-body"><div class="exam-question-top"><h2>'+esc(section?section.title:'Volledig tentamen')+'</h2><span class="exam-source-points">'+(q.points!==undefined?'('+q.points+' punten)':'')+'</span></div>'+questionHtml(attempt.exam,q)+(window.CafaStudy?window.CafaStudy.examLink(q.sourceExamId||attempt.exam.id,q.sourceQuestionId||q.id):'')+'<span class="exam-answer-label">Vul het antwoord in</span><div data-exam-answer></div><div class="exam-answer-actions">'+btn('Antwoord controleren','check')+btn('Pauzeren','pause')+'</div><p class="exam-save-status" data-exam-save></p></div><div class="exam-footer"><div class="actions">'+btn('‹ Vorige','previous',false,i===0?'disabled':'')+btn('Volgende ›','next',false,i===attempt.exam.questions.length-1?'disabled':'')+'</div><div class="exam-cirrus-actions">'+btn('Overzicht','overview')+(section?btn('Casus','section'):'')+btn('Introductie','introduction')+btn(attempt.marked[q.id]?'Gemarkeerd':'Markeren','mark',false,'aria-pressed="'+!!attempt.marked[q.id]+'"')+btn('Toets voltooien','submit')+'</div></div></div>';

    mountCasePanel(attempt,section,previousPanel);
    var answerHost=host.querySelector('[data-exam-answer]');
    if(q.type==='open') {
      if(window.BelreAnswerWidgets)answerHost=window.BelreAnswerWidgets.mount(answerHost,q,answerFor(attempt,q),function(value){if(attempt.status!=='active'||attempt.pausedAt!=null||Engine.remainingSeconds(attempt)===0)return;attempt.answers[q.id]=Object.assign({},answerFor(attempt,q),value);invalidateScore(attempt,q);save(attempt);});
      if(window.CafaJournalTable&&window.CafaJournalTable.supports(q)){
        var journalHost=document.createElement('div');answerHost.appendChild(journalHost);
        window.CafaJournalTable.mount(journalHost,answerFor(attempt,q).journalRows,function(rows){
          if(attempt.status!=='active'||attempt.pausedAt!=null||Engine.remainingSeconds(attempt)===0){tick();return;}
          attempt.answers[q.id]=Object.assign({},answerFor(attempt,q),{journalRows:rows});invalidateScore(attempt,q);save(attempt);
        });
        var journalNotes=document.createElement('details');journalNotes.className='stock-notes';journalNotes.open=!!answerFor(attempt,q).html;
        journalNotes.innerHTML='<summary>Toelichting of berekening toevoegen</summary><div></div>';answerHost.appendChild(journalNotes);answerHost=journalNotes.querySelector('div');
      }
      var stock=window.CafaStockTable&&window.CafaStockTable.template(q);
      if(stock){
        var stockHost=document.createElement('div');answerHost.appendChild(stockHost);
        window.CafaStockTable.mount(stockHost,stock,answerFor(attempt,q).stockCells,function(cells){
          if(attempt.status!=='active'||attempt.pausedAt!=null||Engine.remainingSeconds(attempt)===0){tick();return;}
          attempt.answers[q.id]=Object.assign({},answerFor(attempt,q),{stockCells:cells});invalidateScore(attempt,q);save(attempt);
        });
        var notes=document.createElement('details');notes.className='stock-notes';notes.open=!!answerFor(attempt,q).html;
        notes.innerHTML='<summary>Toelichting of berekening toevoegen</summary><div data-stock-notes></div>';answerHost.appendChild(notes);answerHost=notes.querySelector('[data-stock-notes]');
      }
      editor=Editor.mount(answerHost,{html:answerFor(attempt,q).html||'',label:'Antwoord op vraag '+(i+1),onChange:function(html){
        if(attempt.status!=='active'||attempt.pausedAt!=null||Engine.remainingSeconds(attempt)===0){tick();return;}
        attempt.answers[q.id]=Object.assign({},answerFor(attempt,q),{html:html});invalidateScore(attempt,q);save(attempt);
      }});
    } else {
      answerHost.innerHTML='<fieldset class="exam-options"><legend>Kies één antwoord</legend>'+q.options.map(function(option){return '<label><input type="radio" name="exam-answer" value="'+esc(option.id)+'" '+(answerFor(attempt,q).optionId===option.id?'checked':'')+'><span>'+esc(option.text)+'</span></label>';}).join('')+'</fieldset>';
    }
    updateSaveStatus();
  }
  function showModal(title,html,overviewSize) {
    var old=document.getElementById('exam-info-dialog'); if(old)old.remove();
    var dialog=document.createElement('dialog');dialog.id='exam-info-dialog';dialog.className='exam-dialog exam-info-dialog';dialog.setAttribute('aria-labelledby','exam-info-title');
    var owner=selectedRunner();dialog.dataset.attempt=owner?owner.id:'';
    dialog.innerHTML='<div class="exam-modal-head"><h2 id="exam-info-title">'+esc(title)+'</h2><button type="button" class="btn" data-close-info aria-label="Venster sluiten">Sluiten ×</button></div><div class="exam-modal-body">'+html+'</div>';
    if(overviewSize){dialog.classList.add('compact-overview-dialog');dialog.querySelector('[data-close-info]').textContent='×';dialog.insertAdjacentHTML('beforeend','<div class="compact-overview-footer"><span class="compact-overview-range">1-'+overviewSize+'</span><button type="button" class="btn primary" data-close-info>Sluiten</button></div>');}
    document.body.appendChild(dialog);
    if(window.CafaStockTable)window.CafaStockTable.enhance(dialog);
    dialog.querySelectorAll('[data-close-info]').forEach(function(button){button.addEventListener('click',function(){dialog.close();});});
    dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();var target=e.target.closest('[data-exam-index]');if(target){var attempt=selectedRunner(),index=Number(target.dataset.examIndex);if(attempt&&attempt.id===dialog.dataset.attempt&&attempt.status==='active'&&Number.isInteger(index)&&index>=0&&index<attempt.exam.questions.length){attempt.currentIndex=index;save(attempt);dialog.close();route();}}});
    dialog.addEventListener('close',function(){dialog.remove();});
    if(dialog.showModal)dialog.showModal();else{dialog.setAttribute('open','');}
  }
  function overview(attempt) {
    var questions=attempt.exam.questions,total=questions.length;
    if(attempt.exam.practiceKind==='opgave'){
      var groups=groupQuestions(attempt).map(function(group){
        var section=group.section;
        var indices=questions.map(function(q,i){return group.questions.includes(q)?i:-1;}).filter(function(i){return i>=0;});
        var sourceNumber=section.sourceOpgaveNumber||Number((section.sourceSectionId||'').replace(/^opgave-/,''));
        var sourceLabel='Examen '+(section.sourceCode||'')+(sourceNumber?' · oorspronkelijke opgave '+sourceNumber:'');
        return '<section class="compact-overview-group"><h3>'+esc(sourceLabel)+'</h3><ol>'+indices.map(function(i){
          var q=questions[i],done=answered(attempt,q),marked=!!attempt.marked[q.id],current=i===attempt.currentIndex;
          return '<li><button type="button" data-exam-index="'+i+'" class="compact-overview-item '+(done?'is-answered ':'')+(marked?'is-marked ':'')+'"'+(current?' aria-current="step"':'')+' aria-label="'+esc(sourceLabel)+', vraag '+(i+1)+(done?', beantwoord':', niet beantwoord')+(marked?', gemarkeerd':'')+(current?', huidige vraag':'')+'"><span class="compact-overview-number">'+(i+1)+'</span><span class="compact-overview-state">'+(done?'Beantwoord':'Niet<br>beantwoord')+'</span>'+(marked?'<span class="compact-overview-flag" aria-hidden="true" title="Gemarkeerd">⚑</span>':'')+'</button></li>';
        }).join('')+'</ol></section>';
      }).join('');
      showModal('Vraagoverzicht','<div class="compact-overview-body"><div class="compact-overview-remaining">NOG TE DOEN <strong>'+(total-Engine.answeredCount(attempt))+'</strong></div><div class="compact-overview-groups">'+groups+'</div></div>',total);
      return;
    }
    var html='<div class="compact-overview-body"><div class="compact-overview-remaining">NOG TE DOEN <strong>'+(total-Engine.answeredCount(attempt))+'</strong></div><ol class="compact-overview-grid" style="--overview-columns:'+Math.ceil(total/10)+'">'+questions.map(function(q,i){
      var done=answered(attempt,q),marked=!!attempt.marked[q.id],current=i===attempt.currentIndex,section=sectionFor(attempt,q),boundary=i>0&&q.groupId!==questions[i-1].groupId;
      return '<li class="'+(boundary?'compact-overview-divider':'')+'">'+(boundary?'<span class="sr-only">'+esc(section?section.title:'Volgende opgave')+'</span>':'')+'<button type="button" data-exam-index="'+i+'" class="compact-overview-item '+(done?'is-answered ':'')+(marked?'is-marked ':'')+'"'+(current?' aria-current="step"':'')+' aria-label="Vraag '+(i+1)+', '+esc(q.title||(section?section.title:''))+(done?', beantwoord':', niet beantwoord')+(marked?', gemarkeerd':'')+(current?', huidige vraag':'')+'"><span class="compact-overview-number">'+(i+1)+'</span><span class="compact-overview-state">'+(done?'Beantwoord':'Niet<br>beantwoord')+'</span>'+(marked?'<span class="compact-overview-flag" aria-hidden="true" title="Gemarkeerd">⚑</span>':'')+'</button></li>';
    }).join('')+'</ol></div>';
    showModal('Vraagoverzicht',html,total);
  }
  function invalidateScore(a,q){
    if(a.scores)delete a.scores[q.id];
    // Editing invalidates the assessment, not the revealed source model.
    host.querySelectorAll('[data-self-score]').forEach(function(input){
      if(input.dataset.attempt!==a.id||input.dataset.question!==q.id)return;
      input.value='';input.setCustomValidity('');
      var status=input.parentElement.querySelector('[data-score-saved]');if(status)status.textContent='';
    });
  }
  function scoreFor(a,q){
    if(!window.BelreModelPolicy.canCompare(q))return null;
    if(q.type==='mc'&&q.correctOptionId)return answerFor(a,q).optionId===q.correctOptionId?(q.points||0):0;
    var v=a.scores&&a.scores[q.id];return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=(q.points||0)?v:null;
  }
  function totals(a,questions){var result={score:0,max:0,pending:0};questions.forEach(function(q){result.max+=q.points||0;var value=scoreFor(a,q);if(value===null)result.pending++;else result.score+=value;});return result;}
  function num(n){return Number(n.toFixed(2)).toLocaleString('nl-NL');}
  function badge(a,q){if(!window.BelreModelPolicy.canCompare(q))return '<span class="result-score ungraded">Uitwerking in controle</span>';var score=scoreFor(a,q),max=q.points||0;return '<span class="result-score '+(score===null?'ungraded':score===max?'full':score===0?'zero':'partial')+'">'+(score===null?'Nog beoordelen':'<strong>'+num(score)+'</strong> van '+num(max))+'</span>';}
  function scoreInput(a,q){if(!window.BelreModelPolicy.canCompare(q))return '<p class="notice">Uitwerking wordt nog gecontroleerd. Puntentoekenning is nog niet beschikbaar.</p>';return q.type==='mc'?'<p>Automatisch beoordeeld: '+badge(a,q)+'</p>':'<label class="self-score">Zelfbeoordeling: punten (0–'+(q.points||0)+') <input type="number" min="0" max="'+(q.points||0)+'" step="any" data-self-score data-attempt="'+esc(a.id)+'" data-question="'+esc(q.id)+'" value="'+(scoreFor(a,q)===null?'':scoreFor(a,q))+'"><span data-score-saved role="status"></span></label>';}
  function ownAnswer(a,q){var answer=answerFor(a,q),html='';
    if(q.type==='mc')return '<div class="exam-review-answer">'+esc((q.options.find(function(o){return o.id===answer.optionId;})||{text:'Niet beantwoord'}).text)+'</div>';
    var stock=window.CafaStockTable&&window.CafaStockTable.template(q);
    if(stock)html+=window.CafaStockTable.render(stock,answer.stockCells||{},true);
    if(window.CafaJournalTable&&window.CafaJournalTable.supports(q))html+=window.CafaJournalTable.render(answer.journalRows,true);
    if(window.BelreAnswerWidgets)html+=window.BelreAnswerWidgets.render(q,answer);
    if(answer.html)html+=Editor.sanitize(answer.html);
    if(!html)html='<em>Niet beantwoord</em>';
    return '<div class="exam-review-answer">'+html+'</div>';
  }
  function splitter(){return '<div class="review-resizer" tabindex="0" role="separator" aria-label="Breedte antwoordmodel aanpassen" aria-orientation="vertical" aria-valuemin="25" aria-valuemax="65" aria-valuenow="'+reviewWidth+'" title="Sleep om de breedte aan te passen, of gebruik de pijltoetsen"><span>⋮</span></div>';}
  function sidebar(a,q){var section=sectionFor(a,q);return '<aside class="review-sidebar"><div class="review-side-tabs" role="tablist" aria-label="Nakijken"><button type="button" role="tab" aria-selected="true" data-review-panel="model">Antwoordmodel</button><button type="button" role="tab" aria-selected="false" data-review-panel="score">Scoring</button>'+(section?'<button type="button" role="tab" aria-selected="false" data-review-panel="section">Casus</button>':'')+'</div><div class="review-side-content" data-side-panel="model"><h2>OEFENMODEL 2026</h2>'+(window.BelreModelPolicy.canCompare(q)?documentHtml(a.exam,'solution',q.solutionHtml,q.solution||'Er is nog geen antwoordmodel toegevoegd.',q.sourceExamId,q.sourceQuestionId||q.id):'<p>Uitwerking wordt nog gecontroleerd. Puntentoekenning is nog niet beschikbaar.</p>')+(window.CafaStudy?window.CafaStudy.examNote(q.sourceExamId||a.exam.id,q.sourceQuestionId||q.id):'')+'</div><div class="review-side-content" data-side-panel="score" hidden><h2>SCORING</h2><h3>Puntentotaal</h3>'+badge(a,q)+scoreInput(a,q)+'<p>Open antwoorden beoordeel je zelf aan de hand van het antwoordmodel.</p></div>'+(section?'<div class="review-side-content" data-side-panel="section" hidden><h2>CASUS</h2><h3>'+esc(section.title)+'</h3>'+documentHtml(a.exam,'case',section.contentHtml,null,section.sourceExamId,section.sourceSectionId||section.id)+'</div>':'')+'</aside>';}
  function comparison(a,q){return '<div class="review-split" style="--review-width:'+reviewWidth+'%"><div class="review-own"><h3>Jouw antwoord</h3>'+ownAnswer(a,q)+'</div>'+splitter()+sidebar(a,q)+'</div>';}
  function measureExamAnswer(a,q,checked){if(!window.StudyMeasure||!Engine.answeredCount({exam:{questions:[q]},answers:a.answers}))return;window.StudyMeasure.answer('exam:'+a.id+':'+q.id,a.answers[q.id],window.StudyMeasure.examNames(a.exam,q),checked);}
  function checkAnswer(a,q){
    var released=window.BelreModelPolicy.canCompare(q);
    measureExamAnswer(a,q,true);if(window.StudyMeasure)window.StudyMeasure.activity('Uitwerking bekeken',window.StudyMeasure.examNames(a.exam,q));
    var help=released?'Vergelijk je antwoord met het oefenmodel voor 2026. Je kent zelf punten toe en kunt daarna verder oefenen.':'Deze uitwerking wordt nog gecontroleerd. Je kunt je eigen antwoord blijven bewerken. Puntentoekenning is nog niet beschikbaar.';
    showModal('Antwoord controleren · Vraag '+(a.currentIndex+1),'<p>'+help+(a.untimed?'':' De klok blijft lopen. Kies Pauzeren om de klok stil te zetten.')+'</p>'+comparison(a,q));
  }
  function resultSummary(a){var t=totals(a,a.exam.questions),percent=t.max?100*t.score/t.max:0;return '<div class="result-summary"><span class="result-overview-label">OVERZICHT</span><div><span>Percentage: <strong>'+num(percent)+'%</strong></span><span>Totaalscore: <strong>'+num(t.score)+' van '+num(t.max)+'</strong></span></div><p class="small">'+(t.pending?t.pending+' vragen nog te beoordelen. De getoonde score is voorlopig. ':'')+'Zelfbeoordeling met het oefenmodel voor 2026. Er wordt geen officieel tentamencijfer vastgesteld.</p></div>';}
  function groupQuestions(a){var groups=new Map();a.exam.questions.forEach(function(q){var key=q.groupId||q.sectionId;if(!groups.has(key))groups.set(key,{section:{id:key,title:q.groupTitle||'Opgave',sourceCode:q.sourceCode,sourceOpgaveNumber:Number(key.split('-s')[1])},questions:[]});groups.get(key).questions.push(q);});return Array.from(groups.values());}
  function reviewQuestion(a,index){var i=Math.max(0,Math.min(a.exam.questions.length-1,index)),q=a.exam.questions[i],section=sectionFor(a,q);
    host.innerHTML='<div class="review-feedback-banner">Bekijk je antwoorden en het oefenmodel voor 2026</div><nav class="exam-breadcrumb"><a href="#dashboard/voltooid">Voltooid</a><span>/</span><a href="#inzage/'+esc(a.id)+'">Resultaten: '+esc(label(a.exam))+'</a><span>/ Vraag '+(i+1)+'</span></nav><div class="review-detail-layout review-split" style="--review-width:'+reviewWidth+'%"><div class="review-detail-main"><div class="review-toolbar"><label><span class="sr-only">Vraag kiezen</span><select data-review-select data-attempt="'+esc(a.id)+'">'+a.exam.questions.map(function(_,n){return '<option value="'+n+'"'+(n===i?' selected':'')+'>Vraag '+(n+1)+'</option>';}).join('')+'</select></label><div class="actions">'+btn('← Vorige','review-question',true,'data-attempt="'+esc(a.id)+'" data-index="'+(i-1)+'" '+(i===0?'disabled':''))+btn('Volgende →','review-question',true,'data-attempt="'+esc(a.id)+'" data-index="'+(i+1)+'" '+(i===a.exam.questions.length-1?'disabled':''))+'</div></div><details class="review-prompt" open><summary>Vraag '+(i+1)+'</summary>'+questionHtml(a.exam,q)+'</details>'+ownAnswer(a,q)+'</div>'+splitter()+sidebar(a,q)+'</div>';
  }
  function review(id) {
    var parts=id.split('/vraag/'),a=byId(parts[0]);if(!a)return missing();if(a.status==='active'){go('tentamen/'+a.id);return;}
    if(parts.length>1){reviewQuestion(a,Number(parts[1])||0);return;}
    var html='<nav class="exam-breadcrumb"><a href="#dashboard/voltooid">Voltooid</a><span>/ Resultaten</span></nav>'+head(label(a.exam)+' · Resultaten','')+'<div class="exam-results-panel"><div class="result-tabs" role="tablist" aria-label="Resultatenweergave">'+btn('Resultaten','review-tab',false,'role="tab" aria-selected="'+(reviewTab==='results')+'" data-tab="results" data-attempt="'+esc(a.id)+'"')+btn('Scorerapport','review-tab',false,'role="tab" aria-selected="'+(reviewTab==='report')+'" data-tab="report" data-attempt="'+esc(a.id)+'"')+'</div>'+resultSummary(a);
    var groups=groupQuestions(a),all=totals(a,a.exam.questions);
    if(reviewTab==='report'){
      function reportRow(title,t,child){var percent=t.max?100*t.score/t.max:0;return '<tr><th scope="row"'+(child?' class="report-child"':'')+'>'+esc(title)+'</th><td>'+num(t.score)+(t.pending?' *':'')+'</td><td>'+num(t.max)+'</td><td><div class="report-progress-label"><span>Voortgang</span><strong>'+num(percent)+'%</strong></div><div class="report-track" role="meter" aria-label="'+esc(title)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><i style="left:'+percent+'%"></i></div></td></tr>';}
      html+='<div class="report-actions">'+btn('Scorerapport afdrukken','print-report')+'</div><div class="score-report-scroll"><table class="score-report"><thead><tr><th>'+(a.exam.practiceKind==='opgave'?'TENTAMEN':'LEERDOEL')+'</th><th>UW SCORE</th><th>TOTAALSCORE</th><th>NIVEAU VAN BEHEERSING</th></tr></thead><tbody>'+reportRow('BELRE3',all,false)+groups.map(function(g,i){return reportRow(a.exam.practiceKind==='opgave'?'Examen '+g.section.sourceCode:'BELRE3 Opgave '+(i+1)+' · '+g.section.title,totals(a,g.questions),true);}).join('')+'</tbody></table></div><p class="report-legend">● Uw score'+(all.pending?' · * Voorlopig: niet alle vragen zijn beoordeeld.':'')+'</p>';
    }else{
      html+='<div class="result-answers"><h2>Antwoorden</h2><div class="result-list-head"><strong>RESULTATEN</strong><strong>UW SCORE</strong></div>'+groups.map(function(g){var t=totals(a,g.questions);return '<section class="result-group"><h3>'+esc(g.section.title)+' ('+num(t.max)+' punten)<span class="result-score partial">'+num(t.score)+' van '+num(t.max)+(t.pending?' *':'')+'</span></h3>'+g.questions.map(function(q){var i=a.exam.questions.indexOf(q);return '<details class="result-question exam-review-item" data-result-id="'+esc(q.id)+'"><summary><span class="result-number">'+(i+1)+'</span><span class="result-question-text">'+(/\ba\.\s/.test(q.prompt)&&/\bb\.\s/.test(q.prompt)?esc(q.prompt).replace(/\s+([a-z]\.\s+)/g,'<br>$1'):esc(q.prompt))+'</span>'+badge(a,q)+'</summary><div class="result-expanded">'+btn('Vraag bekijken','review-question',true,'data-attempt="'+esc(a.id)+'" data-index="'+i+'"')+questionHtml(a.exam,q)+comparison(a,q)+'</div></details>';}).join('')+'</section>';}).join('')+'</div>';
    }
    html+='<div class="result-bottom-actions">'+btn('Back-up downloaden','backup')+'<a class="btn" href="#welkom/'+(a.exam.practiceKind==='opgave'?'opgaven':esc(a.exam.id))+'">Opnieuw oefenen</a><span class="small">Ingeleverd '+datetime(a.submittedAt)+' · '+Engine.answeredCount(a)+' van '+a.exam.questions.length+' beantwoord</span></div></div>';
    host.innerHTML=html;
  }
  function practiceReview(id) {
    var item=window.CafaPractice&&window.CafaPractice.getCompleted().find(function(x){return x.id===id;});if(!item)return missing();
    var bank=window.CAFA2_DATA.modules[item.code];
    host.innerHTML='<a class="exam-back" href="#dashboard/voltooid">‹ Voltooide toetsen</a>'+head(item.title,'Eerdere MC-poging · alleen-lezen')+'<div class="exam-paper"><p>'+item.answered+' van '+item.total+' beantwoord.</p><p>'+item.good+' van '+item.auto+' nagekeken MC-antwoorden goed.</p><p>Zelfbeoordeling: '+item.selfGood+' van '+item.self+' goed. Zelfbeoordeling telt niet mee in de MC-score.</p>'+bank.questions.map(function(q){var a=item.answers[q.id]||{};return '<article class="exam-review-item"><h2>Vraag '+q.id+' · '+esc(q.title)+'</h2><p>'+esc(q.task)+'</p><div class="exam-review-answer">'+(a.choice!==null&&a.choice!==undefined?'<p>Gekozen antwoord: '+String.fromCharCode(65+a.choice)+'</p>':'')+(a.html?Editor.sanitize(a.html):a.text?'<p class="exam-prose">'+esc(a.text)+'</p>':'')+(a.rows&&a.rows.some(function(row){return row.some(Boolean);})?'<table><tbody>'+a.rows.map(function(row){return '<tr>'+row.map(function(cell){return '<td>'+esc(cell)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>':'')+(a.firstMC?'<p>Eerste MC-beoordeling: '+(a.firstMC.correct?'goed':'fout')+'</p>':'')+'</div></article>';}).join('')+'<a class="btn" href="#voortgang">Naar MC-voortgang</a></div>';
  }
  function missing() {host.innerHTML=head('Toets niet gevonden','De toets of poging is niet beschikbaar in deze browser.')+'<a class="btn" href="#dashboard">Naar dashboard</a>';}
  var clock=document.createElement('div');clock.className='exam-clock';clock.hidden=true;clock.innerHTML='<div class="exam-time-badge"><span>Totaal resterende tijd:</span> <strong role="timer" aria-label="Resterende toetstijd"></strong></div><span class="exam-save-indicator" aria-label="Antwoorden opgeslagen" title="Antwoorden opgeslagen op dit apparaat"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#36823d"/><path d="m5 10 3 3 7-7" fill="none" stroke="white" stroke-width="3"/></svg></span>';document.querySelector('.top-controls').prepend(clock);
  function complete(attempt,reason) {
    if(!attempt||attempt.status!=='active')return;
    var finished=Engine.finishAttempt(attempt,{reason:reason});
    attempt.exam.questions.forEach(function(q){measureExamAnswer(attempt,q,false);});if(window.StudyMeasure)window.StudyMeasure.activity('Tentamen afgerond',window.StudyMeasure.examNames(attempt.exam));Object.assign(attempt,finished); save(attempt);
    var current=location.hash==='#tentamen/'+attempt.id;
    if(current){
      if(submitDialog.open)submitDialog.close();
      var info=document.getElementById('exam-info-dialog');if(info)info.close();
      announce(reason==='timeout'?'De toetstijd is verstreken. Je antwoorden zijn ingeleverd.':'Je tentamen is ingeleverd.');
      go('inzage/'+attempt.id);
    }else if(location.hash.indexOf('#dashboard')===0)dashboard(location.hash==='#dashboard/voltooid');
  }
  function tick() {
    running().filter(function(a){return Engine.remainingSeconds(a)===0;}).forEach(function(a){complete(a,'timeout');});
    var attempt=byId(selectedAttempt);
    clock.hidden=!(attempt&&attempt.status==='active');
    if(!clock.hidden){var seconds=Engine.remainingSeconds(attempt);var label=attempt.pausedAt!=null?'Gepauzeerd':Engine.formatTime(seconds).replace(/ min$/,' minuten'),title=attempt.untimed?'Oefenmodus:':'Totaal resterende tijd:',valueNode=clock.querySelector('strong'),titleNode=clock.querySelector('.exam-time-badge > span');if(valueNode.textContent!==label)valueNode.textContent=label;if(titleNode.textContent!==title)titleNode.textContent=title;clock.classList.toggle('is-urgent',seconds<=600);if(seconds<=600&&!announcedTen.has(attempt.id)){announcedTen.add(attempt.id);announce('Nog tien minuten of minder. De klok toont nu minuten en seconden.');}}
  }
  function route() {
    if(renderedHash!==location.hash){
      var info=document.getElementById('exam-info-dialog');if(info){if(info.open)info.close();info.remove();}
      if(submitDialog.open)submitDialog.close();
      renderedHash=location.hash;
    }
    var oldPanel=host.querySelector('#exam-case-panel');
    if(oldPanel&&oldPanel.dataset.caseKey)caseScrollPositions[oldPanel.dataset.caseKey]=oldPanel.scrollTop;
    dropEditor(); var parts=location.hash.slice(1).split('/'),kind=parts[0],id;
    try{id=decodeURIComponent(parts.slice(1).join('/'));}catch(e){id='';}
    var isExam=['dashboard','welkom','tentamen','inzage','mc-inzage'].includes(kind);
    host.hidden=!isExam;document.body.classList.toggle('exam-surface',isExam);document.body.classList.toggle('exam-dashboard',kind==='dashboard');document.body.classList.toggle('exam-running',kind==='tentamen');selectedAttempt=kind==='tentamen'?id:null;
    if(!isExam){tick();return;}
    if(kind==='dashboard')dashboard(id==='voltooid');
    if(kind==='welkom'){var welcomeParts=id.split('/opnieuw/'),subjectParts=welcomeParts[0].split('/onderwerp/');welcome(subjectParts[0],welcomeParts[1],subjectParts[1]);}
    if(kind==='tentamen')runner(id);
    if(kind==='inzage')review(id);
    if(kind==='mc-inzage')practiceReview(id);
    if(window.CafaStockTable)window.CafaStockTable.enhance(host);
    tick();window.scrollTo(0,0);window.dispatchEvent(new CustomEvent('cafa:exam-route'));
  }
  host.addEventListener('change',function(e){
    if(e.target.matches('[data-opgave-college]')){
      if(!e.target.checked)return;
      var college=Opgave.collegeChoices.find(function(item){return item.id===e.target.value;});
      if(college){host.querySelector('[data-opgave-topics]').innerHTML=opgaveTopicOptions(college,college.wholeCollege.number);updateOpgaveSelection();}
      return;
    }
    if(e.target.matches('[data-review-select]')){go('inzage/'+e.target.dataset.attempt+'/vraag/'+e.target.value);return;}
    if(e.target.matches('[data-exam-filter]'))go('dashboard'+(e.target.value==='completed'?'/voltooid':''));
    if(e.target.matches('[data-completed-type]')){completedType=e.target.value;dashboard(true);host.querySelector('[data-completed-type]').focus();}
    if(e.target.matches('[data-completed-attempts]')){completedAttempts=e.target.value;dashboard(true);host.querySelector('[data-completed-attempts]').focus();}
    if(e.target.matches('[name="opgave-number"],[data-opgave-exam]')){updateOpgaveSelection();return;}
    if(e.target.matches('[data-exam-untimed],[data-exam-extra]')){
      var start=host.querySelector('[data-exam-action="start"]'),prior=start&&byId(start.dataset.restartAttempt),exam=start&&(examById(start.dataset.examId)||(prior&&prior.exam));
      if(exam){var extra=host.querySelector('[data-exam-extra]'),untimed=host.querySelector('[data-exam-untimed]').checked,total=exam.durationMinutes+(extra.checked?30:0);extra.disabled=untimed;host.querySelector('[data-exam-total]').textContent=total;host.querySelector('[data-exam-detail-duration]').textContent=untimed?'Zonder tijdslimiet':total+' minuten';}
    }
    if(e.target.name==='exam-answer'){var a=selectedRunner();if(a&&a.status==='active'&&a.pausedAt==null&&Engine.remainingSeconds(a)>0){a.answers[a.exam.questions[a.currentIndex].id]={optionId:e.target.value};save(a);}else tick();}
  });
  host.addEventListener('click',function(e){
    var button=e.target.closest('[data-exam-action]');if(!button)return;var action=button.dataset.examAction;
    if(action==='backup'){downloadBackup();return;}
    if(action==='reset-exams'){resetAttempts();return;}
    if(action==='start-opgave'){
      if(!Opgave||corrupt)return;
      var numberField=host.querySelector('[name="opgave-number"]:checked');
      var chosen=Array.from(host.querySelectorAll('[data-opgave-exam]:checked:not(:disabled)')).map(function(input){return input.value;});
      try{
        var combined=Opgave.build(catalog,Number(numberField&&numberField.value),chosen);
        startAttempt(combined,{untimed:true,id:combined.id+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)},button.dataset.restartAttempt);
      }catch(error){announce(error.message);showModal('Starten niet mogelijk','<p>'+esc(error.message)+'</p>');}
      return;
    }
    if(action==='restart'){
      if(corrupt)return;
      var old=button.dataset.restartAttempt?byId(button.dataset.restartAttempt):attempts().filter(function(a){return a.exam.id===button.dataset.examId;}).sort(function(a,b){return b.startedAt-a.startedAt;})[0];
      if(!old)return;
      go('welkom/'+(old.exam.practiceKind==='opgave'?'opgaven':encodeURIComponent(old.exam.id))+'/opnieuw/'+encodeURIComponent(old.id));
      return;
    }
    if(action==='start'){
      var prior=button.dataset.restartAttempt&&byId(button.dataset.restartAttempt),exam=examById(button.dataset.examId)||(prior&&prior.exam);if(!exam||corrupt)return;
      try{startAttempt(exam,{extraTime:!!host.querySelector('[data-exam-extra]:checked'),untimed:!!host.querySelector('[data-exam-untimed]:checked'),id:exam.id+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)},button.dataset.restartAttempt);}catch(error){announce(error.message);showModal('Starten niet mogelijk','<p>'+esc(error.message)+'</p>');}return;
    }
    if(action==='review-tab'){reviewTab=button.dataset.tab;review(button.dataset.attempt);return;}
    if(action==='review-question'){go('inzage/'+button.dataset.attempt+'/vraag/'+button.dataset.index);return;}
    if(action==='print-report'){window.print();return;}
    var attempt=selectedRunner();if(!attempt||attempt.status!=='active')return;if(Engine.remainingSeconds(attempt)===0){tick();return;}
    if(action==='resume'){Engine.resumeAttempt(attempt);save(attempt);route();return;}
    if(attempt.pausedAt!=null)return;
    var q=attempt.exam.questions[attempt.currentIndex];
    if(action==='pause'){Engine.pauseAttempt(attempt);save(attempt);route();return;}
    if(action==='check'){checkAnswer(attempt,q);return;}
    if(action==='previous'||action==='next'){attempt.currentIndex=Math.max(0,Math.min(attempt.exam.questions.length-1,attempt.currentIndex+(action==='next'?1:-1)));save(attempt);route();}
    if(action==='overview')overview(attempt);
    if(action==='section'&&host.querySelector('#exam-case-panel')){caseOpen=!caseOpen;updateCasePanel();saveCaseSettings();}
    if(action==='introduction'){
      var sourceIntro=attempt.exam.practiceKind==='opgave'&&(attempt.exam.sourceIntroductions||[]).find(function(item){return item.id===q.sourceExamId;});
      showModal(sourceIntro?'Introductie · Examen '+sourceIntro.code:'Introductie · '+label(attempt.exam),introduction(sourceIntro||attempt.exam));
    }
    if(action==='mark'){attempt.marked[q.id]=!attempt.marked[q.id];button.textContent=attempt.marked[q.id]?'Gemarkeerd':'Markeren';button.setAttribute('aria-pressed',String(!!attempt.marked[q.id]));save(attempt);}
    if(action==='submit'){document.querySelector('[data-exam-submit-summary]').textContent=Engine.answeredCount(attempt)+' van '+attempt.exam.questions.length+' vragen beantwoord. '+Object.values(attempt.marked).filter(Boolean).length+' vragen gemarkeerd.';if(submitDialog.showModal)submitDialog.showModal();else if(confirm('Je tentamen definitief inleveren?'))complete(attempt,'submitted');}
  });
  function resizeReview(handle,value){reviewWidth=Math.max(25,Math.min(65,value));handle.closest('.review-split').style.setProperty('--review-width',reviewWidth+'%');handle.setAttribute('aria-valuenow',Math.round(reviewWidth));}
  document.addEventListener('pointerdown',function(e){var handle=e.target.closest('.review-resizer');if(!handle)return;e.preventDefault();handle.setPointerCapture(e.pointerId);handle.dataset.dragging='true';});
  document.addEventListener('pointermove',function(e){var handle=e.target.closest('.review-resizer');if(!handle||handle.dataset.dragging!=='true')return;var rect=handle.closest('.review-split').getBoundingClientRect();resizeReview(handle,100*(rect.right-e.clientX)/rect.width);});
  document.addEventListener('pointerup',function(e){var handle=e.target.closest('.review-resizer');if(handle){delete handle.dataset.dragging;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}});
  document.addEventListener('pointercancel',function(e){var handle=e.target.closest('.review-resizer');if(handle)delete handle.dataset.dragging;});
  document.addEventListener('keydown',function(e){var handle=e.target.closest('.review-resizer');if(!handle)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();resizeReview(handle,reviewWidth+(e.key==='ArrowLeft'?5:-5));}});
  document.addEventListener('click',function(e){var tab=e.target.closest('[data-review-panel]');if(!tab)return;var side=tab.closest('.review-sidebar');side.querySelectorAll('[data-review-panel]').forEach(function(b){b.setAttribute('aria-selected',String(b===tab));});side.querySelectorAll('[data-side-panel]').forEach(function(p){p.hidden=p.dataset.sidePanel!==tab.dataset.reviewPanel;});});
  document.addEventListener('change',function(e){
    if(!e.target.matches('[data-self-score]'))return;
    var a=byId(e.target.dataset.attempt),q=a&&a.exam.questions.find(function(q){return q.id===e.target.dataset.question;});if(!q||!window.BelreModelPolicy.canCompare(q))return;
    var raw=e.target.value.trim(),score=raw===''?null:Number(raw.replace(',','.'));
    if(score!==null&&(!Number.isFinite(score)||score<0||score>(q.points||0))){e.target.setCustomValidity('Vul een score tussen 0 en '+(q.points||0)+' in.');e.target.reportValidity();return;}
    e.target.setCustomValidity('');a.scores=a.scores||{};if(score===null)delete a.scores[q.id];else a.scores[q.id]=score;save(a);
    var status=e.target.parentElement.querySelector('[data-score-saved]');if(status)status.textContent='Opgeslagen';
    if(a.status==='completed'){var openIds=Array.from(host.querySelectorAll('details[open][data-result-id]')).map(function(d){return d.dataset.resultId;});review(location.hash.slice(8));host.querySelectorAll('[data-review-panel="score"]').forEach(function(tab){tab.click();});openIds.forEach(function(id){var row=Array.from(host.querySelectorAll('[data-result-id]')).find(function(d){return d.dataset.resultId===id;});if(row)row.open=true;});}
  });
  document.querySelector('[data-exam-cancel-submit]').addEventListener('click',function(){submitDialog.close();});
  document.querySelector('[data-exam-confirm-submit]').addEventListener('click',function(){if(submitDialog.open)complete(selectedRunner(),'submitted');});
  window.addEventListener('hashchange',route);
  window.addEventListener('cafa:practice-change',function(){if(location.hash.indexOf('#dashboard')===0)dashboard(location.hash==='#dashboard/voltooid');});
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('storage',function(e){if(e.key!==KEY||!e.newValue)return;try{store=loadState(localStorage.getItem(KEY)||e.newValue);route();announce('Tentamenpoging bijgewerkt vanuit een ander tabblad.');}catch(error){announce('Voortgang uit het andere tabblad kon niet worden gelezen.');}});
  window.addEventListener('beforeunload',function(e){if(!saveOK&&active()){e.preventDefault();e.returnValue='';}});
  // Expired attempts are completed even when the learner reopens the dashboard later.
  var expired=attempts().filter(function(a){return a.status==='active'&&Engine.remainingSeconds(a)===0;});
  expired.forEach(function(a){Object.assign(a,Engine.finishAttempt(a,{reason:'timeout'}));});
  if(!corrupt&&(!splitStorage||expired.length))save.apply(null,expired);
  if(!location.hash)history.replaceState(null,'','#start');
  route();setInterval(tick,1000);
  function getQuestionContext(id,index){
    var a=byId(id);if(!a)return null;var i=index==null?a.currentIndex:index,q=a.exam.questions[i];if(!q)return null;
    var section=sectionFor(a,q);
    return JSON.parse(JSON.stringify({attemptId:a.id,currentIndex:i,exam:{id:a.exam.id,title:a.exam.title,date:a.exam.date,demo:a.exam.demo,practiceKind:a.exam.practiceKind},question:q,section:section?{id:section.id,title:section.title}:null}));
  }
  window.CafaExams={catalog:catalog,getQuestionContext:getQuestionContext,getAttempt:function(id){var a=byId(id);return a?JSON.parse(JSON.stringify(a)):null;},getAttempts:function(){return JSON.parse(JSON.stringify(attempts()));},storageKey:KEY,getPosition:function(){var a=selectedRunner();return a&&a.status==='active'?{attempt:a.id,index:a.currentIndex,examId:a.exam.id}:null;},restorePosition:function(id,index){var a=selectedRunner();if(!a||a.id!==id||a.status!=='active'||!Number.isInteger(index)||index<0||index>=a.exam.questions.length)return false;a.currentIndex=index;save(a);route();return true;}};
}());
