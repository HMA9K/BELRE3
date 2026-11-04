(function () {
  'use strict';
  if (window.StudyPrivacy) return;
  var controlsKey = 'study:privacy-controls', modeKey = 'study:tracking-mode', positionKey = 'study:privacy-position', controlsVisible = false;
  var temporaryExcluded = false, storageAvailable = true, panel, message, button, choices, resetChoice, position = null, placed = false, drag = null, dragged = false;
  function state() {
    var saved = false, mode = 'normal';
    try { saved = localStorage.getItem('skipgc') === 't'; mode = localStorage.getItem(modeKey) === 'owner' ? 'owner' : 'normal'; storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    var excluded = saved || temporaryExcluded || !storageAvailable;
    return { mode: excluded ? 'excluded' : mode, excluded: excluded, persistent: saved, storageAvailable: storageAvailable };
  }
  function rememberControls() {
    controlsVisible = true;
    try { localStorage.setItem(controlsKey, '1'); } catch (_) {}
  }
  function readControls() {
    try { if (localStorage.getItem(controlsKey) === '1' || localStorage.getItem('skipgc') === 't') controlsVisible = true; } catch (_) {}
  }
  function readPosition() {
    try {
      var saved = JSON.parse(localStorage.getItem(positionKey));
      return saved && isFinite(saved.x) && isFinite(saved.y) ? { x: Math.min(1, Math.max(0, saved.x)), y: Math.min(1, Math.max(0, saved.y)) } : null;
    } catch (_) { return null; }
  }
  function savePosition() {
    try { if (position) localStorage.setItem(positionKey, JSON.stringify(position)); else localStorage.removeItem(positionKey); } catch (_) {}
  }
  // The position is stored as a share of the free space, so it stays on screen at every window size.
  function freeSpace() {
    var box = panel.getBoundingClientRect(), page = document.documentElement;
    return { width: Math.max(0, page.clientWidth - box.width - 24), height: Math.max(0, page.clientHeight - box.height - 24) };
  }
  function place() {
    if (!panel) return;
    if (resetChoice) resetChoice.hidden = !position;
    if (!position) {
      if (!placed) return;
      placed = false;
      panel.removeAttribute('style');
      panel.classList.toggle('opens-down', false);
      panel.classList.toggle('opens-left', false);
      return;
    }
    placed = true;
    var free = freeSpace();
    panel.style.left = 12 + position.x * free.width + 'px';
    panel.style.top = 12 + position.y * free.height + 'px';
    panel.style.bottom = 'auto';
    panel.classList.toggle('opens-down', position.y < .5);
    panel.classList.toggle('opens-left', position.x > .5);
  }
  function moveTo(left, top) {
    var free = freeSpace();
    position = {
      x: free.width ? Math.min(1, Math.max(0, (left - 12) / free.width)) : 0,
      y: free.height ? Math.min(1, Math.max(0, (top - 12) / free.height)) : 0
    };
    place();
  }
  function closeChoices() {
    choices.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  function dragMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) < 6) return;
      drag.moved = true;
      closeChoices();
      panel.classList.toggle('is-dragging', true);
    }
    moveTo(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
  }
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.type === 'pointerup') dragMove(event); // A busy page can skip the last pointermove.
    dragged = drag.moved;
    drag = null;
    panel.classList.toggle('is-dragging', false);
    if (dragged) savePosition();
  }
  function notify() {
    render();
    window.dispatchEvent(new Event('study:privacychange'));
  }
  function setMode(mode) {
    if (['excluded','owner','normal'].indexOf(mode) < 0) throw Error('Unknown measurement mode');
    rememberControls();
    var excluded = mode === 'excluded';
    temporaryExcluded = !!excluded;
    try {
      if (excluded) localStorage.setItem('skipgc', 't');
      else localStorage.removeItem('skipgc');
      if (mode === 'owner') localStorage.setItem(modeKey, 'owner');
      else localStorage.removeItem(modeKey);
      if (excluded && localStorage.getItem('skipgc') !== 't') throw Error('Not saved');
      if (!excluded && localStorage.getItem('skipgc') === 't') throw Error('Not removed');
      if (mode === 'owner' && localStorage.getItem(modeKey) !== 'owner') throw Error('Not saved');
      temporaryExcluded = false;
    } catch (_) { if (!excluded) temporaryExcluded = true; }
    notify();
    return state();
  }
  function setExcluded(excluded) { return setMode(excluded ? 'excluded' : 'normal'); }
  function reason() {
    var current = state();
    return current.excluded ? (current.persistent ? 'own visits excluded in this browser' : current.storageAvailable ? 'own visits excluded in this tab' : 'browser storage unavailable') : '';
  }
  window.StudyPrivacy = { version:2, canMeasure: function () { return !state().excluded; }, state: state, reason: reason, setExcluded: setExcluded, setMode: setMode };
  function applyLink() {
    var url = new URL(location.href);
    var command = url.searchParams.get('meting');
    if (['uit','eigen'].indexOf(command)<0 && url.hash !== '#toggle-goatcounter') return;
    setMode(command === 'eigen' && url.hash !== '#toggle-goatcounter' ? 'owner' : 'excluded');
    if (['uit','eigen'].indexOf(command)>=0) url.searchParams.delete('meting');
    if (url.hash === '#toggle-goatcounter') url.hash = '';
    // Consume the legacy command before the external script can toggle it.
    try { history.replaceState(history.state, '', url.pathname + url.search + url.hash); } catch (_) { temporaryExcluded = true; }
  }
  function render() {
    var current = state();
    document.documentElement.setAttribute('data-study-tracking', current.mode);
    if (!panel) return;
    panel.hidden = !controlsVisible;
    panel.classList.toggle('is-excluded', current.excluded);
    var label = current.excluded ? 'Telling uit' : current.mode === 'owner' ? 'Eigen telling' : 'Telling aan';
    button.textContent = label;
    button.disabled = !current.storageAvailable;
    button.setAttribute('aria-pressed', String(!current.excluded));
    button.setAttribute('aria-label', label + '. Kies hoe je bezoeken worden geteld. Verplaats de knop met de pijltoetsen.');
    message.textContent = current.persistent ? 'Je bezoeken en gebruiksduur tellen niet mee. Klik voor de drie meetstanden.' : current.excluded ? 'Je bezoeken en gebruiksduur tellen niet mee. Deze uitsluiting geldt alleen in dit tabblad; je browser bewaart de instelling niet.' : current.mode === 'owner' ? 'Je bezoeken, oefenpogingen en gebruiksduur tellen apart als eigen bezoeken. Je kunt ze in het dashboard tonen of uitfilteren.' : 'Je bezoeken tellen normaal mee en zijn niet apart herkenbaar. Klik voor uitsluiten of een eigen telling.';
    if (choices) choices.querySelectorAll('button').forEach(function (item) { if (!item.dataset.mode) return; item.setAttribute('aria-pressed', String(item.dataset.mode === current.mode)); item.disabled = !current.storageAvailable; });
    message.textContent += ' Sleep de knop of gebruik de pijltoetsen om hem te verplaatsen.';
    button.title = message.textContent;
    if (controlsVisible) place();
  }
  function ready() {
    var style = document.createElement('style');
    style.textContent = '#study-privacy-control{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;font:12px/1.45 system-ui,sans-serif;text-align:left;max-width:calc(100vw - 24px)}#study-privacy-control[hidden]{display:none!important}#study-privacy-control button{all:initial;box-sizing:border-box;display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:8px 12px;border:1px solid #b9c8c3;border-radius:999px;background:#fff!important;color:#25463d!important;box-shadow:0 2px 10px #142b2520;font:600 12px/1.45 system-ui,sans-serif;cursor:pointer}#study-privacy-control button::before{content:"";width:7px;height:7px;border-radius:50%;background:#c07815;flex:none}#study-privacy-control.is-excluded button::before{background:#56876c}#study-privacy-control button:focus-visible{outline:3px solid #287c69;outline-offset:3px}#study-privacy-control button:disabled{opacity:.7;cursor:default}#study-privacy-help{position:absolute;bottom:calc(100% + 8px);left:0;box-sizing:border-box;width:260px;max-width:calc(100vw - 24px);padding:10px 12px;border:1px solid #d8e2dc;border-radius:10px;background:#fff!important;color:#25463d!important;box-shadow:0 3px 18px #142b2520;font:12px/1.5 system-ui,sans-serif;opacity:0;visibility:hidden;pointer-events:none}#study-privacy-control:hover #study-privacy-help,#study-privacy-control:focus-within #study-privacy-help{opacity:1;visibility:visible}@media(prefers-reduced-motion:no-preference){#study-privacy-help{transition:opacity .12s}}@media print{#study-privacy-control{display:none!important}}';
    document.head.appendChild(style);
    panel = document.createElement('aside'); panel.id = 'study-privacy-control'; panel.setAttribute('aria-label', 'Eigen bezoeken en gebruiksduur');
    button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-describedby', 'study-privacy-help');
    message = document.createElement('span'); message.id = 'study-privacy-help'; message.setAttribute('role', 'tooltip');
    choices = document.createElement('div'); choices.id = 'study-privacy-choices'; choices.hidden = true; choices.setAttribute('role','group'); choices.setAttribute('aria-label','Meetstand voor eigen bezoeken');
    [['excluded','Uitsluiten'],['owner','Apart meetellen'],['normal','Normaal meetellen']].forEach(function (item) { var choice=document.createElement('button');choice.type='button';choice.textContent=item[1];choice.dataset.mode=item[0];choice.addEventListener('click',function(){setMode(item[0]);choices.hidden=true;button.setAttribute('aria-expanded','false');button.focus();});choices.appendChild(choice); });
    button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',choices.id);
    resetChoice=document.createElement('button');resetChoice.type='button';resetChoice.textContent='Knop terugzetten';resetChoice.addEventListener('click',function(){position=null;savePosition();place();closeChoices();button.focus();});choices.appendChild(resetChoice);
    button.addEventListener('click', function (event) { var skip=dragged&&event.detail;dragged=false;if(skip)return;choices.hidden=!choices.hidden;button.setAttribute('aria-expanded',String(!choices.hidden)); });
    button.addEventListener('pointerdown', function (event) {
      dragged = false;
      if (event.button) return;
      var box = panel.getBoundingClientRect();
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - box.left, offsetY: event.clientY - box.top, moved: false };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', dragMove);
    // Once the control moves away, the browser would otherwise start dragging a link underneath it.
    document.addEventListener('dragstart', function (event) { if (drag) event.preventDefault(); });
    button.addEventListener('pointerup', endDrag);
    button.addEventListener('pointercancel', endDrag);
    button.addEventListener('keydown', function (event) {
      var step = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
      if (!step) return;
      event.preventDefault();
      event.stopPropagation();
      var box = panel.getBoundingClientRect();
      moveTo(box.left + step[0], box.top + step[1]);
      savePosition();
    });
    panel.addEventListener('keydown',function(event){if(event.key==='Escape'){choices.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}});
    var menuStyle=document.createElement('style');menuStyle.textContent='#study-privacy-choices{position:absolute;bottom:calc(100% + 8px);left:0;display:grid;gap:6px;padding:8px;border:1px solid #d8e2dc;border-radius:12px;background:#fff;box-shadow:0 3px 18px #142b2520;width:220px;max-width:calc(100vw - 24px)}#study-privacy-choices[hidden]{display:none!important}#study-privacy-choices button{border-radius:8px;box-shadow:none}#study-privacy-choices button[aria-pressed="true"]{background:#eaf3e6!important}#study-privacy-control:has(#study-privacy-choices:not([hidden])) #study-privacy-help{display:none}#study-privacy-choices button[hidden]{display:none!important}#study-privacy-control>button{white-space:nowrap;touch-action:none;user-select:none;-webkit-user-select:none}#study-privacy-control.is-dragging>button{cursor:grabbing}#study-privacy-control.is-dragging #study-privacy-help{display:none}#study-privacy-control.opens-down #study-privacy-help,#study-privacy-control.opens-down #study-privacy-choices{top:calc(100% + 8px);bottom:auto}#study-privacy-control.opens-left #study-privacy-help,#study-privacy-control.opens-left #study-privacy-choices{left:auto;right:0}';document.head.appendChild(menuStyle);
    panel.appendChild(button); panel.appendChild(message); panel.appendChild(choices); document.body.appendChild(panel); render();
  }
  readControls();
  position = readPosition();
  if (state().persistent) rememberControls();
  applyLink(); render();
  window.addEventListener('storage', function (event) { if (event.key === 'skipgc' || event.key === modeKey || event.key === controlsKey || event.key === null) { readControls(); notify(); } });
  window.addEventListener('storage', function (event) { if (event.key === positionKey || event.key === null) { position = readPosition(); place(); } });
  window.addEventListener('resize', function () { if (position) place(); });
  window.addEventListener('hashchange', applyLink);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
