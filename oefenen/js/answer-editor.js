(function () {
  'use strict';

  var sequence = 0;
  var allowed = new Set(('P DIV BR STRONG B EM I U S STRIKE SUB SUP H2 H3 H4 UL OL LI BLOCKQUOTE PRE CODE TABLE COLGROUP COL THEAD TBODY TFOOT TR TH TD CAPTION SPAN').split(' '));
  var discarded = new Set(('SCRIPT STYLE SVG MATH IFRAME OBJECT TEMPLATE EMBED LINK META BASE INPUT FORM BUTTON SELECT TEXTAREA VIDEO AUDIO IMG PICTURE SOURCE NOSCRIPT').split(' '));
  var block = new Set(('P DIV H2 H3 H4 UL OL LI BLOCKQUOTE PRE TABLE TR').split(' '));

  // Rebuild from an inert fragment: no scripts, resources, URLs, IDs or event attributes survive.
  function sanitize(value) {
    var source = document.createElement('template');
    source.innerHTML = typeof value === 'string' ? value : '';
    var output = document.createElement('div');
    function copy(node, parent) {
      if (node.nodeType === 3) { parent.appendChild(document.createTextNode(node.data)); return; }
      if (node.nodeType !== 1 || discarded.has(node.tagName)) return;
      var target = parent;
      if (allowed.has(node.tagName)) {
        target = document.createElement(node.tagName.toLowerCase());
        var styles = node.style;
        if (/^(left|right|center|justify)$/.test(styles.textAlign)) target.style.textAlign = styles.textAlign;
        if (/^(bold|[6-9]00)$/.test(styles.fontWeight)) target.style.fontWeight = styles.fontWeight;
        if (styles.fontStyle === 'italic') target.style.fontStyle = 'italic';
        if (/^(underline|line-through|underline line-through)$/.test(styles.textDecorationLine || styles.textDecoration)) {
          target.style.textDecorationLine = styles.textDecorationLine || styles.textDecoration;
        }
        if (/^(sub|super)$/.test(styles.verticalAlign)) target.style.verticalAlign = styles.verticalAlign;
        // Browser-normalized colors contain no URLs or executable expressions.
        if (/^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i.test(styles.color)) target.style.color = styles.color;
        if (/^(12|14|16|18|20|24)px$/.test(styles.fontSize)) target.style.fontSize = styles.fontSize;
        if (/^(TABLE|COL|TD|TH)$/.test(node.tagName)) {
          ['width', 'height'].forEach(function (property) {
            var value = styles[property];
            if (/^(?:\d{1,4}(?:\.\d{1,4})?px|(?:100|\d{1,2})(?:\.\d{1,6})?%)$/.test(value)) target.style[property] = value;
          });
        }
        if (node.tagName === 'OL' && /^(a|A|i|I|1)$/.test(node.getAttribute('type') || '')) target.setAttribute('type', node.getAttribute('type'));
        if (node.tagName === 'OL' && /^\d{1,4}$/.test(node.getAttribute('start') || '')) target.setAttribute('start', node.getAttribute('start'));
        if (node.tagName === 'TD' || node.tagName === 'TH') {
          ['colspan', 'rowspan'].forEach(function (attribute) {
            var span = node.getAttribute(attribute) || '';
            if (/^(?:[1-9]|1\d|20)$/.test(span)) target.setAttribute(attribute, span);
          });
        }
        if (node.tagName === 'TH') {
          var scope = (node.getAttribute('scope') || '').toLowerCase();
          target.setAttribute('scope', scope === 'row' ? 'row' : 'col');
        }
        parent.appendChild(target);
      }
      Array.from(node.childNodes).forEach(function (child) { copy(child, target); });
    }
    Array.from(source.content.childNodes).forEach(function (node) { copy(node, output); });
    return output.innerHTML;
  }

  function make(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function mount(container, options) {
    if (!container || container.nodeType !== 1) throw new TypeError('Antwoordeditor heeft een container nodig.');
    options = options || {};
    var readOnly = !!options.readOnly;
    var id = 'cafa-editor-' + (++sequence);
    var wrapper = make('div', 'cafa-answer-editor' + (readOnly ? ' is-readonly' : ''));
    var toolbar = make('div', 'cae-toolbar');
    var editor = make('div', 'cae-content');
    var footer = make('div', 'cae-footer');
    var count = make('span', 'cae-count');
    var status = make('span', 'cae-status');
    var range = null, expanded = false, disposed = false, typingAt = 0, typingGroup = false, mergedNotice = false;
    var clean = sanitize(options.html || '');
    var history = [{ html: clean, bookmark: null }], historyIndex = 0;
    var commandButtons = [], tableButtons = [], undoButton, redoButton, expandButton;
    var panels = [];
    var listeners = [];
    var previousBodyOverflow = '';

    function listen(target, event, handler, settings) {
      target.addEventListener(event, handler, settings);
      listeners.push(function () { target.removeEventListener(event, handler, settings); });
    }
    function inside(node) { return !!node && (node === editor || editor.contains(node)); }
    function capture() {
      var selection = window.getSelection();
      if (selection && selection.rangeCount && inside(selection.anchorNode) && inside(selection.focusNode)) {
        range = selection.getRangeAt(0).cloneRange();
        return true;
      }
      return false;
    }
    function restore() {
      editor.focus({ preventScroll: true });
      var selection = window.getSelection();
      if (!selection) return;
      if (!range || !inside(range.startContainer) || !inside(range.endContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
    function pathTo(node) {
      var path = [];
      while (node && node !== editor) {
        var parent = node.parentNode;
        if (!parent) return null;
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, node));
        node = parent;
      }
      return node === editor ? path : null;
    }
    function bookmark() {
      if (!range || !inside(range.startContainer) || !inside(range.endContainer)) return null;
      return { start: pathTo(range.startContainer), startOffset: range.startOffset, end: pathTo(range.endContainer), endOffset: range.endOffset };
    }
    function restoreBookmark(mark) {
      range = null;
      if (mark && mark.start && mark.end) {
        function locate(path) { return path.reduce(function (node, index) { return node && node.childNodes[index]; }, editor); }
        var start = locate(mark.start), end = locate(mark.end);
        if (start && end) {
          range = document.createRange();
          range.setStart(start, Math.min(mark.startOffset, start.nodeType === 3 ? start.length : start.childNodes.length));
          range.setEnd(end, Math.min(mark.endOffset, end.nodeType === 3 ? end.length : end.childNodes.length));
        }
      }
      restore();
    }
    function textValue() {
      var pieces = [];
      function walk(node) {
        if (node.nodeType === 3) { pieces.push(node.data); return; }
        if (node.nodeType !== 1) return;
        if (node.tagName === 'BR' || block.has(node.tagName) || /^(TD|TH)$/.test(node.tagName)) pieces.push(' ');
        Array.from(node.childNodes).forEach(walk);
        if (block.has(node.tagName) || /^(TD|TH)$/.test(node.tagName)) pieces.push(' ');
      }
      walk(editor);
      return pieces.join('').replace(/\s+/g, ' ').trim();
    }
    function currentCell() {
      if (!range || !inside(range.startContainer)) return null;
      var node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      var cell = node && node.closest('td, th');
      return cell && editor.contains(cell) ? cell : null;
    }
    function hasMergedCells(table) {
      return !!table && Array.from(table.querySelectorAll('td, th')).some(function (cell) {
        return cell.colSpan > 1 || cell.rowSpan > 1;
      });
    }
    function updateToolbar() {
      if (disposed || readOnly) return;
      var cell = currentCell();
      var merged = !!cell && hasMergedCells(cell.closest('table'));
      tableButtons.forEach(function (button) { button.disabled = !cell || merged; });
      if (merged && !mergedNotice) announce('Deze tabel heeft samengevoegde cellen. Tekst wijzigen kan; rijen en kolommen wijzigen niet.');
      if (!merged && mergedNotice) announce('');
      mergedNotice = merged;
      undoButton.disabled = historyIndex === 0;
      redoButton.disabled = historyIndex >= history.length - 1;
      commandButtons.forEach(function (entry) {
        var pressed = false;
        try { pressed = !!range && document.queryCommandState(entry.command); } catch (_) { /* Optional native formatting state. */ }
        entry.button.setAttribute('aria-pressed', String(pressed));
      });
    }
    function updateCount() {
      var value = textValue();
      count.textContent = 'Woorden: ' + (value ? value.split(/\s+/).length : 0) + ' · Tekens: ' + Array.from(value).length;
      updateToolbar();
    }
    function announce(message) { status.textContent = message; }
    function changed(kind) {
      capture();
      var html = sanitize(editor.innerHTML);
      var now = Date.now();
      if (html !== clean) {
        var snapshot = { html: html, bookmark: bookmark() };
        var merge = kind === 'typing' && typingGroup && now - typingAt < 800 && historyIndex === history.length - 1 && historyIndex > 0;
        history = history.slice(0, historyIndex + 1);
        if (merge) history[historyIndex] = snapshot;
        else { history.push(snapshot); historyIndex++; }
        if (history.length > 50) { history.shift(); historyIndex--; }
        clean = html;
        if (typeof options.onChange === 'function') options.onChange(clean);
      }
      typingGroup = kind === 'typing';
      typingAt = now;
      updateCount();
    }
    function undo(step) {
      var next = historyIndex + step;
      if (next < 0 || next >= history.length) return;
      historyIndex = next;
      clean = history[next].html;
      editor.innerHTML = clean;
      restoreBookmark(history[next].bookmark);
      typingGroup = false;
      if (typeof options.onChange === 'function') options.onChange(clean);
      updateCount();
      announce(step < 0 ? 'Wijziging ongedaan gemaakt.' : 'Wijziging opnieuw uitgevoerd.');
    }
    function exec(command, value) {
      restore();
      if (typeof document.execCommand !== 'function') {
        announce('Deze browser ondersteunt deze opmaakopdracht niet. Je kunt wel tekst invoeren.');
        return false;
      }
      var succeeded = document.execCommand(command, false, value === undefined ? null : value);
      changed('command');
      return succeeded;
    }
    function insertHTML(html) {
      restore();
      if (typeof document.execCommand === 'function' && document.execCommand('insertHTML', false, html)) {
        changed('command');
        return;
      }
      range.deleteContents();
      var fragment = range.createContextualFragment(html);
      var last = fragment.lastChild;
      range.insertNode(fragment);
      if (last) { range.setStartAfter(last); range.collapse(true); }
      restore();
      changed('command');
    }
    function button(label, text, action, group) {
      var item = make('button', 'cae-button', text);
      item.type = 'button';
      item.title = label;
      item.setAttribute('aria-label', label);
      listen(item, 'mousedown', function (event) { event.preventDefault(); });
      listen(item, 'click', action);
      (group || toolbar).appendChild(item);
      return item;
    }
    function group(label) {
      var element = make('div', 'cae-toolgroup');
      element.setAttribute('role', 'group');
      element.setAttribute('aria-label', label);
      toolbar.appendChild(element);
      return element;
    }
    function command(label, text, name, parent, toggle) {
      var item = button(label, text, function () { exec(name); }, parent);
      if (toggle) { item.setAttribute('aria-pressed', 'false'); commandButtons.push({ button: item, command: name }); }
      return item;
    }
    function hidePanels() {
      panels.forEach(function (panel) { panel.element.hidden = true; panel.button.setAttribute('aria-expanded', 'false'); });
    }
    function showPanel(panel) {
      var open = panel.element.hidden;
      hidePanels();
      if (open) {
        panel.element.hidden = false;
        panel.button.setAttribute('aria-expanded', 'true');
        var field = panel.element.querySelector('input, select, button');
        if (field) field.focus();
      } else restore();
    }
    function tableAction(action) {
      restore();
      var cell = currentCell();
      if (!cell) { announce('Klik eerst in een cel van de tabel.'); return; }
      var table = cell.closest('table'), row = cell.parentElement;
      if (hasMergedCells(table)) {
        announce('Deze tabel heeft samengevoegde cellen. Tekst wijzigen kan; rijen en kolommen wijzigen niet.');
        return;
      }
      var index = cell.cellIndex, nextCell = cell;
      // Fixed-layout tables need explicit space for a newly inserted column.
      var columnWidths = Array.from(table.rows[0].cells, function (c) { return c.getBoundingClientRect().width; });
      if (action === 'row-add') {
        if (table.rows.length >= 10) { announce('Een tabel kan maximaal 10 rijen bevatten.'); return; }
        var newRow = make('tr');
        Array.from(row.cells).forEach(function () { var td = make('td'); td.appendChild(make('br')); newRow.appendChild(td); });
        row.after(newRow); nextCell = newRow.cells[Math.min(index, newRow.cells.length - 1)];
      } else if (action === 'col-add') {
        if (row.cells.length >= 10) { announce('Een tabel kan maximaal 10 kolommen bevatten.'); return; }
        Array.from(table.rows).forEach(function (r) {
          var td = make(r.parentElement.tagName === 'THEAD' ? 'th' : 'td');
          td.appendChild(make('br'));
          if (r.cells[index]) r.cells[index].after(td); else r.appendChild(td);
          if (r === row) nextCell = td;
        });
      } else if (action === 'row-delete') {
        nextCell = (row.nextElementSibling || row.previousElementSibling || {}).cells;
        nextCell = nextCell ? nextCell[Math.min(index, nextCell.length - 1)] : null;
        row.remove();
        if (!table.rows.length) table.remove();
      } else if (action === 'col-delete') {
        nextCell = cell.nextElementSibling || cell.previousElementSibling;
        Array.from(table.rows).forEach(function (r) { if (r.cells[index]) r.cells[index].remove(); });
        if (!row.cells.length) table.remove();
      }
      if ((action === 'col-add' || action === 'col-delete') && table.isConnected) {
        if (action === 'col-add') columnWidths.splice(index + 1, 0, columnWidths.reduce(function (a, b) { return a + b; }, 0) / columnWidths.length);
        else columnWidths.splice(index, 1);
        var totalWidth = columnWidths.reduce(function (a, b) { return a + b; }, 0);
        Array.from(table.rows[0].cells).forEach(function (c, i) {
          c.style.setProperty('width', (totalWidth ? columnWidths[i] / totalWidth * 100 : 100 / columnWidths.length) + '%', 'important');
        });
        document.dispatchEvent(new CustomEvent('learning:table-structure', { detail: { table: table } }));
      }
      range = document.createRange();
      range.selectNodeContents(nextCell && editor.contains(nextCell) ? nextCell : editor);
      range.collapse(!nextCell);
      restore(); changed('command');
      announce('Tabel bijgewerkt.');
    }
    function setExpanded(value) {
      expanded = value;
      wrapper.classList.toggle('is-expanded', expanded);
      expandButton.setAttribute('aria-pressed', String(expanded));
      expandButton.textContent = expanded ? 'Verkleinen' : 'Vergroten';
      expandButton.title = expanded ? 'Antwoordvenster verkleinen (Escape)' : 'Antwoordvenster vergroten';
      expandButton.setAttribute('aria-label', expandButton.title);
      if (expanded) { previousBodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
      else document.body.style.overflow = previousBodyOverflow;
      restore();
    }

    wrapper.dataset.editorId = id;
    editor.id = id;
    editor.innerHTML = clean;
    editor.setAttribute('contenteditable', readOnly ? 'false' : 'true');
    editor.setAttribute('role', readOnly ? 'document' : 'textbox');
    editor.setAttribute('aria-label', options.label || (readOnly ? 'Ingeleverd antwoord' : 'Vul je antwoord in'));
    if (!readOnly) editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('spellcheck', 'true');
    editor.dataset.placeholder = 'Schrijf hier je antwoord. Je kunt tekst opmaken en tabellen invoegen.';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    footer.append(status, count);

    if (!readOnly) {
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Antwoord opmaken');
      var stylesGroup = group('Tekststijl');
      var style = make('select', 'cae-select');
      style.setAttribute('aria-label', 'Tekststijl');
      [['p', 'Normale tekst'], ['h2', 'Kop'], ['h3', 'Tussenkop'], ['blockquote', 'Citaat'], ['pre', 'Vaste breedte']].forEach(function (choice) {
        var option = make('option', '', choice[1]); option.value = choice[0]; style.appendChild(option);
      });
      listen(style, 'change', function () { exec('formatBlock', style.value); });
      stylesGroup.appendChild(style);
      command('Vet (Ctrl+B)', 'B', 'bold', stylesGroup, true).classList.add('cae-bold');
      command('Cursief (Ctrl+I)', 'I', 'italic', stylesGroup, true).classList.add('cae-italic');
      command('Onderstrepen (Ctrl+U)', 'U', 'underline', stylesGroup, true).classList.add('cae-underline');
      command('Doorhalen', 'S', 'strikeThrough', stylesGroup, true).classList.add('cae-strike');
      command('Subscript', 'x₂', 'subscript', stylesGroup, true);
      command('Superscript', 'x²', 'superscript', stylesGroup, true);

      var lists = group('Opsomming en uitlijning');
      command('Opsomming met punten', '• Lijst', 'insertUnorderedList', lists, true);
      command('Genummerde opsomming', '1. Lijst', 'insertOrderedList', lists, true);
      command('Links uitlijnen', 'Links', 'justifyLeft', lists, true);
      command('Centreren', 'Midden', 'justifyCenter', lists, true);
      command('Rechts uitlijnen', 'Rechts', 'justifyRight', lists, true);
      command('Inspringen', '→|', 'indent', lists);
      command('Inspringing verkleinen', '|←', 'outdent', lists);

      var inserts = group('Invoegen');
      var tablePanel = { element: make('div', 'cae-panel') };
      tablePanel.element.id = id + '-table';
      tablePanel.element.hidden = true;
      tablePanel.button = button('Tabel invoegen', 'Tabel', function () { showPanel(tablePanel); }, inserts);
      tablePanel.button.setAttribute('aria-controls', tablePanel.element.id);
      tablePanel.button.setAttribute('aria-expanded', 'false');
      panels.push(tablePanel);
      function numberField(label, value) {
        var wrap = make('label', 'cae-field', label);
        var field = make('input'); field.type = 'number'; field.min = '2'; field.max = '10'; field.step = '1'; field.required = true; field.value = value;
        wrap.appendChild(field); tablePanel.element.appendChild(wrap); return field;
      }
      var rows = numberField('Rijen', '3'), cols = numberField('Kolommen', '3');
      button('Tabel invoegen met gekozen afmetingen', 'Invoegen', function () {
        if (!rows.checkValidity() || !cols.checkValidity()) {
          announce('Kies 2 tot en met 10 rijen en kolommen.');
          if (!rows.checkValidity()) rows.reportValidity(); else cols.reportValidity();
          return;
        }
        var html = '<table><tbody>';
        for (var r = 0; r < Number(rows.value); r++) {
          html += '<tr>';
          for (var c = 0; c < Number(cols.value); c++) html += '<td><br></td>';
          html += '</tr>';
        }
        html += '</tbody></table><p><br></p>';
        hidePanels(); insertHTML(html); announce('Tabel ingevoegd. Klik in een cel om de tabel te bewerken.');
      }, tablePanel.element);
      button('Tabel invoegen annuleren', 'Annuleren', function () { hidePanels(); restore(); }, tablePanel.element);
      [['Rij toevoegen', '+ Rij', 'row-add'], ['Kolom toevoegen', '+ Kolom', 'col-add'], ['Rij verwijderen', '− Rij', 'row-delete'], ['Kolom verwijderen', '− Kolom', 'col-delete']].forEach(function (item) {
        var control = button(item[0], item[1], function () { tableAction(item[2]); }, inserts);
        control.dataset.tableAction = item[2]; control.disabled = true; tableButtons.push(control);
      });

      var symbolsPanel = { element: make('div', 'cae-panel cae-symbols') };
      symbolsPanel.element.id = id + '-symbols'; symbolsPanel.element.hidden = true;
      symbolsPanel.button = button('Symbool invoegen', 'Ω', function () { showPanel(symbolsPanel); }, inserts);
      symbolsPanel.button.setAttribute('aria-controls', symbolsPanel.element.id);
      symbolsPanel.button.setAttribute('aria-expanded', 'false'); panels.push(symbolsPanel);
      ['€', '×', '÷', '±', '≤', '≥', '≠', '≈', 'Σ', 'Δ', '√', '∞', '→', 'α', 'β', 'π'].forEach(function (symbol) {
        button('Symbool ' + symbol + ' invoegen', symbol, function () { hidePanels(); insertHTML(symbol); }, symbolsPanel.element);
      });
      var actions = group('Bewerken');
      undoButton = button('Ongedaan maken (Ctrl+Z)', '↶', function () { undo(-1); }, actions);
      redoButton = button('Opnieuw (Ctrl+Shift+Z)', '↷', function () { undo(1); }, actions);
      command('Tekstopmaak verwijderen', 'Opmaak wissen', 'removeFormat', actions);
      expandButton = button('Antwoordvenster vergroten', 'Vergroten', function () { setExpanded(!expanded); }, actions);
      expandButton.setAttribute('aria-pressed', 'false');
      wrapper.appendChild(toolbar);
      panels.forEach(function (panel) { wrapper.appendChild(panel.element); });
    }
    wrapper.append(editor, footer);
    container.replaceChildren(wrapper);

    if (!readOnly) {
      listen(document, 'selectionchange', function () {
        if (capture()) {
          history[historyIndex].bookmark = bookmark();
          updateToolbar();
        }
      });
      listen(editor, 'input', function (event) { changed(event.inputType === 'insertText' || event.inputType === 'deleteContentBackward' ? 'typing' : 'command'); });
      listen(editor, 'blur', capture);
      listen(editor, 'paste', function (event) {
        event.preventDefault();
        var clipboard = event.clipboardData;
        if (!clipboard) return;
        var html = clipboard.getData('text/html');
        if (!html) {
          var plain = make('div'); plain.textContent = clipboard.getData('text/plain');
          html = plain.innerHTML.replace(/\r?\n/g, '<br>');
        }
        insertHTML(sanitize(html));
      });
      // Never allow unsanitized HTML or files to enter through drag-and-drop.
      listen(editor, 'dragover', function (event) { event.preventDefault(); });
      listen(editor, 'drop', function (event) {
        event.preventDefault();
        if (!event.dataTransfer) return;
        var value = event.dataTransfer.getData('text/plain');
        if (!value) { announce('Bestanden kunnen niet in het antwoord worden ingevoegd.'); return; }
        var plain = make('div'); plain.textContent = value;
        capture(); insertHTML(plain.innerHTML.replace(/\r?\n/g, '<br>'));
      });
      listen(wrapper, 'keydown', function (event) {
        if (event.key === 'Escape') { hidePanels(); if (expanded) setExpanded(false); else restore(); return; }
        if (event.target !== editor && !editor.contains(event.target)) return;
        if ((event.ctrlKey || event.metaKey) && !event.altKey && /^(z|y)$/i.test(event.key)) {
          event.preventDefault(); undo(event.key.toLowerCase() === 'y' || event.shiftKey ? 1 : -1);
        }
        if (event.key === 'Tab' && currentCell()) {
          var cell = currentCell(), table = cell.closest('table');
          var cells = Array.from(table.querySelectorAll('td, th'));
          var next = cells[cells.indexOf(cell) + (event.shiftKey ? -1 : 1)];
          if (next) {
            event.preventDefault(); range = document.createRange(); range.selectNodeContents(next); range.collapse(true); restore();
          }
        }
      });
    }
    updateCount();

    return {
      getHTML: function () { return sanitize(editor.innerHTML); },
      // Programmatic restoration starts a fresh undo history and does not call onChange.
      setHTML: function (value) {
        clean = sanitize(value); editor.innerHTML = clean; range = null;
        history = [{ html: clean, bookmark: null }]; historyIndex = 0; typingGroup = false; updateCount();
      },
      focus: function () { if (!readOnly && !disposed) restore(); },
      destroy: function () {
        if (disposed) return;
        if (expanded) document.body.style.overflow = previousBodyOverflow;
        disposed = true; listeners.forEach(function (remove) { remove(); }); wrapper.remove();
      }
    };
  }

  window.CafaAnswerEditor = { mount: mount, sanitize: sanitize };
})();
