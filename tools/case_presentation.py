"""Apply reviewed, source-preserving layouts to original examination cases."""
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from model_presentation import compact, text, tree

ROOT = Path(__file__).resolve().parents[1]


def fingerprint(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def tokens(value):
    # Keep signs, dates, percentages and punctuation, in their original order.
    return re.findall(r'\w+|[^\w\s]', value, re.UNICODE)


class SourceText(HTMLParser):
    def __init__(self, attribute='data-case-source'):
        super().__init__()
        self.attribute, self.depth, self.parts = attribute, 0, []

    def handle_starttag(self, tag, attrs):
        if self.depth:
            self.depth += 1
        elif dict(attrs).get(self.attribute) == 'true':
            self.depth = 1

    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1

    def handle_data(self, value):
        if self.depth:
            self.parts.append(value)


def source_tokens(value, attribute='data-case-source'):
    parser = SourceText(attribute)
    parser.feed(value)
    return tokens(' '.join(parser.parts))


def source(value, restored=False):
    attribute = 'data-restored-source' if restored else 'data-case-source'
    return '<span ' + attribute + '="true">' + html.escape(value) + '</span>'


FIGURES = re.compile(r'€\s*\d[\d.,]*(?:\s*(?:miljoen|miljard))?|\b\d+(?:[.,]\d+)?%')


def inline(value, phrases=()):
    ranges = [(m.start(), m.end()) for m in FIGURES.finditer(value)]
    for phrase in phrases:
        ranges.extend((m.start(), m.end()) for m in re.finditer(re.escape(phrase), value))
    ranges.sort()
    merged = []
    for start, end in ranges:
        if merged and start < merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    result, cursor = '', 0
    for start, end in merged:
        result += source(value[cursor:start]) + '<strong>' + source(value[start:end]) + '</strong>'
        cursor = end
    return result + source(value[cursor:])


def paragraphs(value, phrases=()):
    # Abbreviations (BV, art., SA) and decimal amounts are not sentence endings.
    parts = re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-Ü])', compact(value))
    groups, current = [], ''
    for part in parts:
        current += (' ' if current else '') + part
        if len(current) >= 230:
            groups.append(current)
            current = ''
    if current:
        groups.append(current)
    return ''.join('<p>' + inline(part, phrases) + '</p>' for part in groups)


def heading(value, level=3):
    return '<h' + str(level) + '>' + html.escape(value) + '</h' + str(level) + '>' if value else ''


def item(value, title, phrases=()):
    value = compact(value)
    marker = re.match(r'^([a-j][.)]|[ivx]{1,3}[.)]|[12][.)])\s+', value)
    if title and marker:
        return '<h4>' + source(marker[1]) + ' ' + html.escape(title) + '</h4>' + paragraphs(value[marker.end():], phrases)
    return heading(title, 4) + paragraphs(value, phrases)


def table(plan, restored=False):
    headers = plan['headers']
    rows = plan['rows']
    if not headers or any(len(row) != len(headers) for row in rows):
        raise ValueError('Onregelmatig aantal cellen in casustabel')
    original_header = plan.get('sourceHeaders', False) and not restored
    result = '<table><thead><tr>' + ''.join('<th scope="col">' +
        (source(h) if original_header else html.escape(h)) + '</th>' for h in headers) + '</tr></thead><tbody>'
    for row in rows:
        result += '<tr>' + ''.join('<td' + (' style="text-align:right"' if i in plan.get('numericColumns', []) else '') +
            '>' + source(cell, restored) + '</td>' for i, cell in enumerate(row)) + '</tr>'
    return result + '</tbody></table>'


def present_block(value, plan):
    result = ''
    layout = plan['layout']
    if layout == 'table':
        if plan.get('lead'):
            result += '<p>' + source(plan['lead']) + '</p>'
        return result + table(plan)
    if layout == 'label':
        return '<h3>' + source(compact(value)) + '</h3>'
    if layout == 'item':
        return item(value, plan.get('title'), plan.get('emphasis', []))
    if layout == 'list':
        if plan.get('lead'):
            result += heading(plan.get('title')) + paragraphs(plan['lead'], plan.get('emphasis', []))
        else:
            result += heading(plan.get('title'))
        for entry in plan['items']:
            result += item(entry['text'], entry.get('title'), plan.get('emphasis', []))
        if plan.get('tail'):
            result += heading(plan['tail'].get('title')) + paragraphs(plan['tail']['text'], plan.get('emphasis', []))
        return result
    segments = plan.get('segments', [{'text': compact(value), 'title': plan.get('title')}])
    for segment in segments:
        if segment.get('sourceHeading'):
            result += '<h3>' + source(segment['text']) + '</h3>'
        else:
            result += heading(segment.get('title')) + paragraphs(segment['text'], plan.get('emphasis', []))
    for restored in plan.get('restoredTables', []):
        result += heading(restored['title']) + table(restored, restored=True)
    return result


def present_section(section, plans):
    if not section['contentHtml'].strip():
        return '<p>Deze opgave bevat geen afzonderlijke casustekst.</p>'
    root = tree(section['contentHtml'])
    result, previous, previous_table = '', False, None
    for node in root:
        if node.tag == 'h3':
            previous = True
            result += '<div><h3>' + source(text(node)) + '</h3>'
            continue
        if node.tag != 'p':
            raise ValueError('Onbekende casusstructuur: ' + section['id'])
        if previous:
            result += paragraphs(text(node))
            continue
        # Plans fingerprint the decoded source text, independent of HTML entity spelling.
        key = fingerprint(text(node))
        plan = plans.get(key)
        if not plan:
            raise ValueError('Casusblok heeft geen beoordeelde opmaak: ' + section['id'])
        rendered = present_block(text(node), plan)
        if source_tokens(rendered) != tokens(text(node)):
            raise ValueError('Casusopmaak wijzigt bronwoorden of volgorde: ' + section['id'])
        if plan['layout'] == 'table' and previous_table == plan['headers'] and result.endswith('</tbody></table>'):
            result = result[:-16] + rendered.split('<tbody>', 1)[1]
        elif plan['layout'] == 'continuation':
            # PDF page breaks can occur inside a sentence. Rejoin that sentence.
            if result.endswith('</p>') and rendered.startswith('<p>'):
                result = result[:-4] + ' ' + rendered[3:]
            else:
                result += rendered
        else:
            result += rendered
        previous_table = plan['headers'] if plan['layout'] == 'table' else None
    if previous:
        result += '</div>'
    if source_tokens(result) != tokens(' '.join(text(node) for node in root)):
        raise ValueError('Casuscontext niet volledig behouden: ' + section['id'])
    return result


def apply_case_presentation(exams, review):
    plans = {p['sourceSha256']: p for p in review['blocks']}
    if len(plans) != len(review['blocks']):
        raise ValueError('Dubbel beoordeeld casusblok')
    used = set()
    for exam in exams:
        for section in exam['sections']:
            section['contentPresentationHtml'] = present_section(section, plans)
            section['contentPresentationRevision'] = review['revision']
            used.update(fingerprint(text(p)) for p in tree(section['contentHtml']) if p.tag == 'p'
                        and fingerprint(text(p)) in plans)
    if used != set(plans):
        raise ValueError('Casusreview bevat onbekende bronblokken')
    return exams


def main():
    target = ROOT / 'oefenen/content/exams.json'
    exams = json.loads(target.read_text(encoding='utf-8'))
    review = json.loads((ROOT / 'content-authoring/case-presentation.json').read_text(encoding='utf-8'))
    apply_case_presentation(exams, review)
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(exams, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    temporary.replace(target)
    print(json.dumps({'examens': len(exams), 'casusweergaven': sum(len(e['sections']) for e in exams),
                      'beoordeeldeBronblokken': len(review['blocks']),
                      'tabellen': sum(s['contentPresentationHtml'].count('<table>') for e in exams for s in e['sections'])}))


if __name__ == '__main__':
    main()
