(function () {
  'use strict';
  var original = window.CafaAnswerEditor;
  if (!original) return;
  var script = document.currentScript;
  var base = new URL('../vendor/tinymce/', script && script.src || new URL('js/tinymce-answer-editor.js', document.baseURI));
  var loading;
  var instances = new Map();
  function moveNode(parent, node, before) {
    if (typeof parent.moveBefore === "function" && node.isConnected && parent.isConnected) { parent.moveBefore(node, before || null); return; }
    var affected = Array.from(instances).filter(function (entry) { return node === entry[0] || node.contains(entry[0]); }).map(function (entry) { return entry[1]; });
    affected.forEach(function (item) { item.suspend(); });
    parent.insertBefore(node, before || null);
    affected.forEach(function (item) { item.resume(); });
  }
  function load() {
    if (window.tinymce) return Promise.resolve(window.tinymce);
    if (!loading) loading = new Promise(function (resolve, reject) {
      var element = document.createElement('script');
      element.src = new URL('tinymce.min.js', base).href;
      element.onload = function () { resolve(window.tinymce); };
      element.onerror = function () { loading = null; reject(new Error('Editor niet geladen')); };
      document.head.appendChild(element);
    });
    return loading;
  }
  var contentStyle = 'body{font:14px/1.55 Arial,sans-serif;margin:12px;color:#252b34;background:#fff;overflow-wrap:anywhere}p{margin:0 0 .6em}table{border-collapse:collapse;table-layout:fixed;max-width:100%}body table td,body table th{border:1px solid #afb7c0!important;min-width:30px;padding:6px;vertical-align:top;overflow-wrap:anywhere}th{background:#f4f6f8}body[data-editor-theme=dark]{background:#152129;color:#e0ebf2}body[data-editor-theme=dark] td,body[data-editor-theme=dark] th{border-color:#667681!important}body[data-editor-theme=dark] th{background:#263540}';
  function mount(container, options) {
    options = options || {};
    var fallback = original.mount(container, options);
    if (options.readOnly) return fallback;
    var target = container.querySelector('.cae-content'), wrapper = target.closest('.cafa-answer-editor');
    var editor = null, disposed = false, initialized = false, starting = false, last = fallback.getHTML(), observer, widthObserver, applyingBounds = false, previousWidth = 0, initialization = 0;
    var visibilityObserver=window.ResizeObserver?new ResizeObserver(ensureVisible):null;
    var details=[];for(var parent=container.parentElement;parent;parent=parent.parentElement)if(parent.matches('details'))details.push(parent);
    details.forEach(function(detail){detail.addEventListener('toggle',ensureVisible);});
    function ensureVisible(){
      if(disposed||initialized||starting||!target.isConnected||!container.getClientRects().length||details.some(function(d){return !d.open;}))return;
      starting=true;var generation=initialization;
      load().then(function(tiny){if(disposed||generation!==initialization||details.some(function(d){return !d.open;}))return;return initialize(tiny);}).catch(unavailable).finally(function(){if(generation===initialization)starting=false;else ensureVisible();});
    }
    if(visibilityObserver)visibilityObserver.observe(container);
    var sizeKey = "belre3-answer-editor-size-v1:" + location.hash;
    var widthRatio = 1;
    function sync() {
      if (!initialized || disposed || !editor) return;
      var value = original.sanitize(editor.getContent());
      if (value === last) return;
      last = value; fallback.setHTML(value);
      if (typeof options.onChange === 'function') options.onChange(value);
    }
    function theme() {
      var dark = document.documentElement.getAttribute('data-study-theme') === 'dark';
      wrapper.dataset.editorTheme = dark ? 'dark' : 'light';
      if (editor && initialized) editor.getBody().dataset.editorTheme = dark ? 'dark' : 'light';
    }
    function availableWidth() { return Math.max(120, Math.floor(container.getBoundingClientRect().width / (window.StudyScale?.get() || 1) || 600)); }
    function savedSize() {
      try { return JSON.parse(sessionStorage.getItem(sizeKey) || 'null'); } catch (_) { return null; }
    }
    var size = savedSize();
    if (size && Number.isFinite(size.widthRatio)) widthRatio = Math.max(0.1, Math.min(1, size.widthRatio));
    function fullScreen() { return editor && editor.plugins.fullscreen && editor.plugins.fullscreen.isFullscreen(); }
    function resizeBounds() {
      if (!initialized || disposed || fullScreen()) return;
      var width = availableWidth();
      editor.options.set('max_width', width); editor.options.set('min_width', Math.min(260, width));
      if (width === previousWidth) return;
      previousWidth = width; applyingBounds = true;
      editor.getContainer().style.width = widthRatio >= 0.995 ? '100%' : Math.max(Math.min(260, width), width * widthRatio) + 'px';
      editor.dispatch('ResizeEditor'); applyingBounds = false;
    }
    function initialize(tiny) {
      var generation = initialization;
      size = savedSize();
      previousWidth = 0;
      if (disposed || !target.isConnected) return;
      var width = availableWidth();
      return tiny.init({
        target: target, base_url: base.href.replace(/\/$/, ''), suffix: '.min', license_key: 'gpl',
        text_patterns: false, menubar: false, elementpath: false, promotion: false, resize: 'both', height: size && Number.isFinite(size.height) ? Math.max(220, Math.min(900, size.height)) : 360,
        width: widthRatio >= 0.995 ? '100%' : Math.max(Math.min(260, width), width * widthRatio), min_height: 220, min_width: Math.min(260, width), max_width: width,
        language: 'nl', language_url: new URL('langs/nl.js', base).href,
        plugins: 'table lists charmap fullscreen',
        toolbar: 'undo redo | blocks | bold italic underline subscript superscript | bullist numlist | alignleft aligncenter alignright | table charmap | removeformat fullscreen',
        toolbar_mode: 'sliding', contextmenu: 'table',
        table_toolbar: 'tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells tabledelete',
        table_resize_bars: true, table_sizing_mode: 'relative', table_default_attributes: {border: '1'},
        table_default_styles: {'border-collapse': 'collapse', width: '100%'},
        block_formats: 'Normale tekst=p;Kop=h2;Tussenkop=h3;Vaste breedte=pre',
        skin: 'oxide', content_css: false, content_style: contentStyle,
        browser_spellcheck: true, paste_data_images: false, automatic_uploads: false,
        valid_elements: 'p[style],div[style],br,strong,b,em,i,u,s,strike,sub,sup,h2[style],h3[style],h4[style],ul,ol[type|start],li,blockquote,pre,code,table[style],colgroup,col[style],thead,tbody,tfoot,tr,td[style|colspan|rowspan],th[style|colspan|rowspan|scope],caption,span[style]',
        setup: function (instance) {
          editor = instance;
          instance.on('init', function () {
            if (disposed || generation !== initialization || !target.isConnected) { instance.remove(); return; }
            instance.setContent(fallback.getHTML());
            last = original.sanitize(instance.getContent()); initialized = true;
            wrapper.classList.add('has-tinymce'); theme();
            var count = wrapper.querySelector('.cae-count'), statusbar = instance.getContainer().querySelector('.tox-statusbar__right-container') || instance.getContainer().querySelector('.tox-statusbar');
            if (count && statusbar) statusbar.prepend(count);
            instance.getBody().setAttribute('aria-label', options.label || 'Vul je antwoord in');
            observer = new MutationObserver(theme); observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-study-theme']});
            if (window.StudyAnswerInput) window.StudyAnswerInput.attachEditor(instance, wrapper);
            resizeBounds();
            if (window.ResizeObserver) { widthObserver = new ResizeObserver(resizeBounds); widthObserver.observe(container); }
            window.addEventListener('resize', resizeBounds);
          });
          instance.on('input change Undo Redo blur', sync);
          instance.on('FullscreenStateChanged', function () { previousWidth = 0; resizeBounds(); });
          instance.on('ResizeEditor', function () {
            if (!initialized || applyingBounds || fullScreen()) return;
            var rect = instance.getContainer().getBoundingClientRect();
            widthRatio = Math.max(0.1, Math.min(1, rect.width / (window.StudyScale?.get() || 1) / availableWidth()));
            try { sessionStorage.setItem(sizeKey, JSON.stringify({widthRatio: widthRatio, height: rect.height / (window.StudyScale?.get() || 1)})); } catch (_) {}
          });
        }
      });
    }
    function unavailable() {
      if (!disposed) wrapper.querySelector('.cae-status').textContent = 'De eenvoudige editor blijft beschikbaar.';
    }
    var record = {
      suspend: function () {
        sync(); initialization++; starting=false;
        if (observer) observer.disconnect(); if (widthObserver) widthObserver.disconnect();
        window.removeEventListener('resize', resizeBounds);
        var count = wrapper.querySelector('.cae-count'); if (count) wrapper.querySelector('.cae-footer').append(count);
        initialized = false; wrapper.classList.remove('has-tinymce');
        if (editor) editor.remove(); editor = null;
      },
      resume: function () { if (!disposed) ensureVisible(); }
    };
    instances.set(wrapper, record);
    ensureVisible();
    return {
      getHTML: function () { return initialized && editor ? original.sanitize(editor.getContent()) : fallback.getHTML(); },
      setHTML: function (value) { last = original.sanitize(value); fallback.setHTML(last); if (initialized && editor) editor.setContent(last); },
      focus: function () { if (initialized && editor) editor.focus(); else fallback.focus(); },
      destroy: function () { if (disposed) return; sync(); disposed = true; instances.delete(wrapper); if(visibilityObserver)visibilityObserver.disconnect();details.forEach(function(detail){detail.removeEventListener('toggle',ensureVisible);});if (observer) observer.disconnect(); if (widthObserver) widthObserver.disconnect(); window.removeEventListener('resize', resizeBounds); if (editor) editor.remove(); fallback.destroy(); }
    };
  }
  window.CafaAnswerEditor = {mount: mount, sanitize: original.sanitize, moveNode: moveNode};
})();
