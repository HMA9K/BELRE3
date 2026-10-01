"""Build answer-specific presentation without changing released model content."""
import hashlib
import html
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
INTRO = re.compile(r'^(?:Oefenactualisatie volgens wetgeving 2026, toegepast op de oorspronkelijke feiten en tijdlijn\. Dit beschrijft geen destijds werkelijk verschuldigde belasting\.|2026-oefenactualisatie op de oorspronkelijke casusfeiten en tijdlijn\. Dit is geen vaststelling van destijds verschuldigde belasting\.)\s*')
AMOUNT = r'€\s*[−-]?\s*\d[\d.,]*'
MARKER = re.compile(r'(?m)(?<!\S)(?:\d{1,2}[.)]|\([a-z0-9]{1,2}\)|[a-z][.)]|[-•])\s+')


def compact(text):
    return re.sub(r'\s+', ' ', text).strip()


def text(node):
    out = node.text or ''
    for child in node:
        out += ('\n' if child.tag == 'br' else text(child)) + (child.tail or '')
    return out


def tree(value):
    return ET.fromstring('<div>' + value.replace('<br>', '<br/>').replace('&nbsp;', '&#160;') + '</div>')


def source(value):
    return '<span data-model-source="true">' + html.escape(value) + '</span>'


def emphasis(value):
    match = re.match(r'^(.{1,85}?:)\s*(.+)$', value, re.S)
    if match and match[1].count('(') == match[1].count(')') and not re.search(r'[.!?]\s+[A-Z]', match[1]):
        return '<strong>' + source(match[1]) + '</strong> ' + source(match[2])
    return source(value)


def cell(value, numeric=False):
    return '<td' + (' style="text-align:right"' if numeric else '') + '>' + source(value) + '</td>'


def table(headers, rows):
    return '<div class="exam-model-table-scroll"><table data-table-static="true"><thead><tr>' + ''.join(
        '<th scope="col">' + html.escape(h) + '</th>' for h in headers) + '</tr></thead><tbody>' + ''.join(
        '<tr>' + ''.join(cell(value, i > 0 and len(value) < 100 and bool(re.match(r'^[€\d+−-]', value))) for i, value in enumerate(row)) + '</tr>' for row in rows) + '</tbody></table></div>'


def lines(value):
    """Join PDF line wraps while preserving separate entries and headings."""
    items = []
    for raw in value.splitlines():
        item = compact(raw)
        if not item:
            continue
        marker = MARKER.match(item)
        if marker and items and (items[-1].count('(') > items[-1].count(')') or
                                 re.search(r'\b(?:onderdeel|lid|leden)\s*$', items[-1])):
            marker = None
        new = (not items or marker or item.endswith(':') or
               re.match(r'^(?:Journaalpost|Correctieboeking|Fiscale gevolgen|Linkerzijde:|Rechterzijde:|Uitwerking|Toelichting:|Antwoord:|(?:Voor|Per|per) (?:een )?volledig)', item) or
               re.match(r'^(?:Fiscaal (?:eind|begin)vermogen|Winst vóór verliesverrekening|Belastbaar bedrag)\b', item) or
               re.search(r'\s{2,}€', raw) or re.match(r'^Aan\b', item) or
               re.search(r'\bBV(?: na de bedrijfsfusie)?$', item))
        if new:
            items.append(item)
        else:
            items[-1] += ' ' + item
    return items


def sentences(value):
    value = compact(value)
    marker = re.match(r'^(?:\d{1,2}[.)]|[a-z][.)])\s+', value)
    prefix = marker[0] if marker else ''
    chunks = re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-Ü])', value[len(prefix):])
    chunks[0] = prefix + chunks[0]
    return chunks


def semicolon_parts(value):
    """Keep explanations in parentheses attached to their parent statement."""
    parts, start, depth = [], 0, 0
    for i, char in enumerate(value):
        if char == '(':
            depth += 1
        elif char == ')':
            depth = max(0, depth - 1)
        elif char == ';' and depth == 0:
            parts.append(value[start:i])
            start = i + 1
    parts.append(value[start:])
    return parts


def list_parts(value):
    matches, depths, depth = [], [], 0
    for char in value:
        depths.append(depth)
        if char == '(':
            depth += 1
        elif char == ')':
            depth = max(0, depth - 1)
    for marker in MARKER.finditer(value):
        prefix = value[:marker.start()].rstrip()
        boundary = not prefix or prefix[-1] in ';:' or value[marker.start()-1] == '\n'
        if depths[marker.start()] == 0 and boundary:
            matches.append(marker)
    if len(matches) < 2:
        return None
    return value[:matches[0].start()], [value[m.start():matches[i+1].start() if i+1 < len(matches) else len(value)].strip()
                                        for i, m in enumerate(matches)]


def paragraph(value, layout):
    value = compact(value)
    if not value:
        return ''
    parts = list_parts(value)
    if parts:
        lead, entries = parts
        return ('<p>' + emphasis(lead.strip()) + '</p>' if lead.strip() else '') + '<ul>' + ''.join(
            '<li>' + emphasis(item) + '</li>' for item in entries) + '</ul>'
    if layout in ('steps', 'explanation') and ':' in value and value.count(';') >= 2:
        lead, remainder = value.split(':', 1)
        entries = semicolon_parts(remainder)
        if len(lead) < 160 and lead.count('(') == lead.count(')') and len(entries) >= 3:
            return '<p><strong>' + source(lead + ':') + '</strong></p><ul>' + ''.join('<li>' + emphasis(part.strip()) + '</li>'
                for part in entries if part.strip()) + '</ul>'
    if layout == 'calculation':
        out, rows = [], []
        def flush():
            if rows:
                out.append(table(['Onderdeel', 'Berekening / bedrag'], rows[:]))
                rows.clear()
        for sentence in sentences(value):
            amount = re.search(AMOUNT, sentence)
            if not amount and '=' in sentence:
                start = re.search(r'\b(?:is|bedraagt)\s+(?=[−-]?\d)', sentence)
                if start:
                    amount = re.search(r'\d', sentence[start.end():])
                    offset = start.end() + amount.start()
                    rows.append([sentence[:offset].strip(), sentence[offset:]])
                    continue
            arithmetic = re.search(r'[=+×−]|\b(?:min|minus|plus)\b', sentence)
            just_amount = amount and not re.search(r'[A-Za-z]', sentence[amount.end():])
            if amount and amount.start() > 0 and len(sentence) < 330 and (arithmetic or just_amount):
                rows.append([sentence[:amount.start()].strip(), sentence[amount.start():]])
            else:
                flush()
                out.append('<p>' + emphasis(sentence) + '</p>')
        flush()
        return ''.join(out)
    chunks = sentences(value)
    if len(chunks) > 1 and len(chunks[0]) < 260:
        return '<p><strong>' + source(chunks[0]) + '</strong></p><p>' + emphasis(' '.join(chunks[1:])) + '</p>'
    return '<p>' + emphasis(value) + '</p>'


def journal(value):
    out, rows = [], []
    def flush():
        if rows:
            out.append(table(['Rekening / toelichting', 'Debet', 'Credit'], rows[:]))
            rows.clear()
    for line in lines(value):
        amount = re.search(AMOUNT, line)
        if amount and amount.start() and not re.match(r'^(?:Toelichting|\d+[.)]|Bij de|Bij het|De |Art\.)', line):
            account, rest = line[:amount.start()].strip(), line[amount.start():]
            rows.append([account, '' if account.lower().startswith('aan ') else rest,
                         rest if account.lower().startswith('aan ') else ''])
        else:
            flush()
            if re.match(r'^(?:Journaalpost|Correctieboeking|Fiscale gevolgen)', line) or re.search(r'\bBV:?$', line):
                out.append('<h3>' + source(line) + '</h3>')
            else:
                out.append(paragraph(line, 'explanation'))
    flush()
    return ''.join(out)


def balance_side(value):
    label, entries = value.split(':', 1)
    rows = []
    for item in entries.strip().split(';'):
        item = item.strip()
        match = re.search(r'\s([\d.]+\.?)$', item)
        if not match:
            raise ValueError('Onbekende balansregel: ' + item)
        rows.append([item[:match.start()].strip(), match[1]])
    return '<h4>' + source(label + ':') + '</h4>' + table(['Balanspost', 'Bedrag × € 1.000'], rows)


def region(value, kind):
    if kind == 'inline_journal':
        heading, rest = value.split(':', 1)
        rows = []
        for part in rest.strip().split(';'):
            match = re.search(AMOUNT, part)
            if not match:
                raise ValueError('Journaalregel zonder bedrag')
            account, amount = part[:match.start()].strip(), part[match.start():].strip()
            credit = account.startswith('credit ')
            rows.append([account, '' if credit else amount, amount if credit else ''])
        return '<h3>' + source(heading + ':') + '</h3>' + table(['Rekening / toelichting', 'Debet', 'Credit'], rows)
    if kind == 'consolidated_balance':
        heading, remainder = value.split(' debet ', 1)
        debit, credit = remainder.split('; credit ', 1)
        out = '<h3>' + source(heading) + '</h3>'
        for side, entries in [('debet', debit), ('credit', credit)]:
            rows = []
            for entry in entries.split(', '):
                match = re.search(AMOUNT, entry)
                if not match:
                    raise ValueError('Balansregel zonder bedrag')
                rows.append([entry[:match.start()].strip(), entry[match.start():]])
            out += '<h4>' + source(side) + '</h4>' + table(['Balanspost', 'Bedrag'], rows)
        return out
    raise ValueError('Onbekend presentatieregio')


def ordinary(value, q, plan):
    if plan['layout'] == 'journal' and q['id'] != 'belre3-20211122-s4-q12':
        return journal(value)
    if q['id'] == 'belre3-20250611-s6-q26':
        out = []
        for line in lines(value):
            if line.startswith(('Linkerzijde:', 'Rechterzijde:')):
                out.append(balance_side(line))
            elif line.endswith('BV na de bedrijfsfusie') or line == 'Uitwerking:':
                out.append('<h3>' + source(line) + '</h3>')
            else:
                out.append(paragraph(line, 'explanation'))
        return ''.join(out)
    if plan['layout'] == 'reconciliation' and re.search(r'(?:Uitwerking|vermogensvergelijking|Vermogensvooruitgang|eindvermogen|Eindvermogen)', value):
        out, rows = [], []
        for line in lines(value):
            if line.startswith('Uitwerking'):
                out.append('<h3>' + source(line) + '</h3>')
                continue
            if ':' in line:
                label, detail = line.split(':', 1)
                rows.append([label + ':', detail.strip()])
            else:
                match = re.search(AMOUNT, line)
                if match and match.start() > 0:
                    rows.append([line[:match.start()].strip(), line[match.start():]])
                else:
                    rows.append(['', line])
        return ''.join(out) + table(['Onderdeel', 'Berekening en toelichting'], rows)
    return ''.join(paragraph(line, plan['layout']) for line in lines(value))


def format_model(q, plan):
    root, out = tree(q['solutionHtml']), []
    for node in root:
        if node.tag != 'p':
            def preserve(n):
                return '<' + n.tag + '>' + source(n.text or '') + ''.join(preserve(c) + source(c.tail or '') for c in n) + '</' + n.tag + '>'
            out.append(preserve(node))
            continue
        value = text(node)
        intro = INTRO.match(value)
        if intro:
            out.append('<p class="exam-model-context">' + source(intro[0].strip()) + '</p>')
            value = value[intro.end():]
        rest = value
        for part in plan.get('regions', []):
            if part['text'] not in rest:
                continue
            before, rest = rest.split(part['text'], 1)
            out.append(ordinary(before, q, plan))
            out.append(region(part['text'], part['kind']))
        out.append(ordinary(rest, q, plan))
    if plan['layout'] == 'ownership':
        out.append('<h3>Aandelenstructuur na de bedrijfsfusie</h3><div><div><h4>Jansen</h4><p>alle aandelen ↓</p><h4>Jansen BV</h4><p>nieuw uitgegeven aandelen ↓</p></div><div><h4>De heer Kroos</h4><p>bestaande aandelen ↓</p></div><div><h4>Kroos BV</h4></div></div>')
    value = ''.join(out)
    # Consecutive calculation entries belong in one table, not many single-row tables.
    boundary = '</tbody></table></div><div class="exam-model-table-scroll"><table data-table-static="true"><thead><tr><th scope="col">Onderdeel</th><th scope="col">Berekening / bedrag</th></tr></thead><tbody>'
    return value.replace(boundary, '')


class ContentReader(HTMLParser):
    def __init__(self, source_only=False):
        super().__init__(convert_charrefs=True)
        self.source_only, self.depth, self.capture, self.parts = source_only, 0, 0, []
    def handle_starttag(self, tag, attrs):
        if tag == 'span' and dict(attrs).get('data-model-source'):
            self.capture += 1
        if tag == 'br' and not self.source_only:
            self.parts.append(' ')
    def handle_endtag(self, tag):
        if tag == 'span' and self.capture:
            self.capture -= 1
        if not self.source_only:
            self.parts.append(' ')
    def handle_data(self, data):
        if not self.source_only or self.capture:
            self.parts.append(data + ' ')


def tokens(value, source_only=False):
    reader = ContentReader(source_only)
    reader.feed(value)
    # Table boundaries and list punctuation are presentation; numbers and words must stay identical.
    return Counter(re.findall(r'€|\d+(?:[.,]\d+)*|[^\W\d_]+', compact(''.join(reader.parts)).lower()))


def apply_presentation(exams, plans):
    by_id = {p['questionId']: p for p in plans['items']}
    questions = [q for exam in exams for q in exam['questions']]
    if set(by_id) != {q['id'] for q in questions}:
        raise ValueError('Presentatieplan sluit niet aan op alle antwoordmodellen')
    for q in questions:
        p = by_id[q['id']]
        if hashlib.sha256(q['solutionHtml'].encode()).hexdigest() != p['sourceSha256']:
            raise ValueError('Model gewijzigd sinds presentatiecontrole: ' + q['id'])
        value = format_model(q, p)
        if tokens(q['solutionHtml']) != tokens(value, True):
            raise ValueError('Broninhoud veranderd bij opmaak: ' + q['id'])
        q['solutionPresentationHtml'] = value
        q['solutionPresentationLayout'] = p['layout']
    return exams


def choose_layout(q):
    if q['answerPresentation'] == 'journal_table':
        return 'journal'
    if q['answerPresentation'] == 'balance_table':
        return 'balance'
    if q['answerPresentation'] == 'drawing':
        return 'ownership'
    if re.search(r'\b(?:Bereken|Bepaal|Hoeveel|Hoe groot|hoe hoog|berekening|opgeofferde bedrag)\b', q['prompt'], re.I):
        return 'calculation'
    if len(list(MARKER.finditer(compact(text(tree(q['solutionHtml'])))))) > 1:
        return 'steps'
    return 'explanation'


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--init', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'oefenen/content/exams.json'
    exams = json.loads(path.read_text(encoding='utf-8'))
    plans_path = ROOT / 'content-authoring/model-presentation.json'
    if args.init:
        plans = {'schemaVersion': 1, 'scope': 'Presentation of all released open answer models; no changes to source text, grading or release policy.', 'items': [
            {'questionId': q['id'], 'sourceSha256': hashlib.sha256(q['solutionHtml'].encode()).hexdigest(), 'layout': choose_layout(q)}
            for exam in exams for q in exam['questions']]}
        plans_path.write_text(json.dumps(plans, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    plans = json.loads(plans_path.read_text(encoding='utf-8'))
    apply_presentation(exams, plans)
    path.write_text(json.dumps(exams, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps({'models': len(plans['items']), 'layouts': dict(Counter(p['layout'] for p in plans['items'])),
                      'tables': sum(q['solutionPresentationHtml'].count('<table ') for e in exams for q in e['questions'])}))


if __name__ == '__main__':
    main()
