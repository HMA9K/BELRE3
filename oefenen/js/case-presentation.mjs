import {createCaseRegistry} from './case-presentation-core.mjs?v=belre3-20261002-question-cases1';

function readText(node) {
  if (node.nodeType === 3) return node.data;
  if (node.nodeType !== 1 && node.nodeType !== 11) return '';
  if (node.nodeName === 'BR') return ' ';
  return [...node.childNodes].map(readText).join('') + (/^(?:P|DIV|LI|H[2-4]|TR)$/.test(node.nodeName) ? ' ' : '');
}
function fragment(html) {
  const template = document.createElement('template'); template.innerHTML = html; return template.content;
}
function enhance(root) {
  for (const table of root.querySelectorAll('table')) {
    table.dataset.tableStatic = 'true';
    const wrapper = document.createElement('div'); wrapper.className = 'exam-case-table-scroll'; wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', 'Gegevens uit de oorspronkelijke casus');
    table.before(wrapper); wrapper.append(table);
    const columns = table.querySelector('thead tr')?.children || [];
    if (columns.length === 4 && /Activa|Debetzijde/.test(columns[0].textContent)) table.classList.add('exam-case-balance');
    for (const row of table.querySelectorAll('tbody tr')) {
      if (/^(?:Totaal|Brutowinst|Winst \()/i.test(row.cells[0]?.textContent || '')) row.classList.add('exam-case-total');
    }
  }
  const previous = [...root.querySelectorAll('h3')].find(h => h.textContent === 'Eerdere vraagtekst bij deze casus');
  previous?.parentElement.classList.add('exam-case-previous');
}

export function createCasePresentations(exams, sanitize) {
  const registry = createCaseRegistry(exams, html => readText(fragment(sanitize(html))).replace(/\s+/g, ' ').trim());
  return {
    render(id, html, plain) {
      const safe = sanitize(html || '<p>' + String(plain || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) + '</p>');
      const root = document.createElement('div'); root.className = 'exam-source-document exam-document exam-source-case';
      root.innerHTML = sanitize(registry.select(id, safe)); enhance(root); return root.outerHTML;
    }
  };
}
