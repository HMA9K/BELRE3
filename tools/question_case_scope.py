"""Select reviewed source passages for a question without changing its full case."""
import json
import html
from pathlib import Path
from xml.etree.ElementTree import tostring
from case_presentation import fingerprint, present_section
from model_presentation import compact, text, tree

ROOT = Path(__file__).resolve().parents[1]


def apply_question_case_scope(exams, review, presentation):
    sections = {s['id']: s for e in exams for s in e['sections']}
    # Remove stale selections when an authoring entry is withdrawn.
    for section in sections.values():
        section.pop('questionContentPresentationHtml', None)
        section.pop('questionContentPresentationRevision', None)
    plans = {p['sourceSha256']: p for p in presentation['blocks']}
    seen = set()
    for entry in review['questions']:
        sid = entry['sectionId']
        if sid in seen or sid not in sections:
            raise ValueError('Onbekende of dubbele vraagcasus: ' + sid)
        seen.add(sid)
        section = sections[sid]
        if fingerprint(section['contentHtml']) != entry['sourceSha256']:
            raise ValueError('Broncasus gewijzigd: ' + sid)
        nodes = list(tree(section['contentHtml']))
        previous_at = next((i for i, n in enumerate(nodes) if n.tag == 'h3'), len(nodes))
        source_nodes = nodes[:previous_at]
        selected = []
        selected_plans = dict(plans)
        last = -1
        for block in entry['blocks']:
            matches = [i for i, n in enumerate(source_nodes) if fingerprint(text(n)) == block['sourceSha256']]
            if len(matches) != 1 or matches[0] <= last:
                raise ValueError('Bronblok ontbreekt of volgorde gewijzigd: ' + sid)
            last = matches[0]
            node = source_nodes[last]
            if 'excerpts' not in block:
                selected.append(tostring(node, encoding='unicode', method='html'))
                continue
            value, cursor = compact(text(node)), 0
            for excerpt in block['excerpts']:
                fragment = excerpt['text']
                pos = value.find(fragment, cursor)
                if not fragment or pos < 0:
                    raise ValueError('Passage wijkt af van bron of volgorde: ' + sid)
                cursor = pos + len(fragment)
                key = fingerprint(fragment)
                selected_plans[key] = {'layout': 'prose', 'title': excerpt.get('title')}
                selected.append('<p>' + html.escape(fragment) + '</p>')
        # Explicit question dependencies always accompany the selected facts.
        selected.extend(tostring(n, encoding='unicode', method='html') for n in nodes[previous_at:])
        scoped = dict(section, contentHtml=''.join(selected))
        section['questionContentPresentationHtml'] = (
            present_section(scoped, selected_plans) if selected else
            '<p>Voor deze theorievraag zijn geen afzonderlijke casusgegevens nodig.</p>')
        section['questionContentPresentationRevision'] = review['revision']
    return exams


def main():
    target = ROOT / 'oefenen/content/exams.json'
    exams = json.loads(target.read_text(encoding='utf-8'))
    review = json.loads((ROOT / 'content-authoring/question-case-scope.json').read_text(encoding='utf-8'))
    presentation = json.loads((ROOT / 'content-authoring/case-presentation.json').read_text(encoding='utf-8'))
    apply_question_case_scope(exams, review, presentation)
    target.write_text(json.dumps(exams, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps({'vraagcasussen': len(review['questions'])}))


if __name__ == '__main__':
    main()
