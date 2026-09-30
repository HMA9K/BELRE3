"""Validate a local authoring delivery and build BELRE3 publication copies.

Usage: python tools/import-content.py --source <delivery-directory>
Original source packages stay local; only checked runtime copies are published.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import shutil
from mc_curation import apply_curation
from exam_model_review import apply_review, fingerprint

READY = 'ready_for_manual_2026_model_comparison'
PENDING = 'needs_2026_answer_review'
# These source questions ask for a written explanation, not a completed balance.
TEXT_PRESENTATION_IDS = {'belre3-20161220-s2-qa', 'belre3-20211122-s1-q2'}
ARCHIVE_HASH = '83e207643cecef4555fa26a1954d2cd58af7958ef30763994cd0d711c53f0c7d'
ROOT_PDFS = {
    'Oefenbundel BELR 3 VJ26.pdf', 'Onderwijsprogramma BELR 3 VJ26.pdf',
    'Uitwerkingen Oefenbundel BELR 3 (2023).pdf',
    'Wet op de vennootschapsbelasting 1969 24-05-2026.pdf',
}
SOURCE_FOLDERS = {'Artikelen', 'Collegeslides', 'Tentamen',
                  'Uitwerkingen oefenbundel (na ieder college gepubliceerd)'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(root, name):
    return json.loads((root / name).read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_path(root, relative):
    path = (root / relative).resolve()
    require(path.is_relative_to(root.resolve()), 'Pad buiten aanlevering')
    require(path.is_file() and not path.is_symlink(), 'Bronbestand ontbreekt')
    return path


def prose(text):
    return ''.join('<p>' + html.escape(p).replace('\n', '<br>') + '</p>'
                   for p in str(text or '').strip().split('\n\n') if p.strip())


def validate_delivery(root):
    manifest = read(root, 'manifest-sha256.json')
    require(manifest['algorithm'] == 'SHA-256', 'Onbekend hashformaat')
    for entry in manifest['files']:
        path = checked_path(root, entry['path'])
        require(path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'],
                'Aanlevering gewijzigd: ' + entry['path'])
    index = read(root, 'sources/source-index.json')
    require(index['archiveSha256'] == ARCHIVE_HASH, 'Andere bronselectie')
    docs = index['documents']
    require(len(docs) == 57 and len({d['sha256'] for d in docs}) == 55,
            'Verwacht 57 bronpaden met 55 unieke documenten')
    for d in docs:
        rel = Path(d['relativePath'])
        require(rel.suffix.lower() == '.pdf' and (rel.as_posix() in ROOT_PDFS or
                (len(rel.parts) > 1 and rel.parts[0] in SOURCE_FOLDERS)), 'Bron buiten selectie')
        path = checked_path(root, d['deliveryPath'])
        require(digest(path) == d['sha256'], 'PDF wijkt af van de gecontroleerde bron')
    return docs


def build(root):
    docs = validate_delivery(root)
    by_source = {d['sourceId']: d for d in docs}

    def refs(items):
        for ref in items:
            require(ref['sourceId'] in by_source, 'Onbekende bronverwijzing')
            require(all(isinstance(n, int) and 1 <= n <= by_source[ref['sourceId']]['pages']
                        for n in ref.get('pdfPages', [])), 'Paginanummer buiten bron')
        return items

    mc = read(root, 'mc/questions.json')
    mc['contentRevision'] = digest(root / 'mc/questions.json')
    require(len(mc['questions']) == 628, 'Verwacht 628 oorspronkelijke MC-vragen')
    decisions = read(Path(__file__).resolve().parents[1], 'content-authoring/mc-curation.json')
    mc = apply_curation(mc, decisions, root)
    ids = set()
    topics = {t['id'] for t in mc['topicOrder']}
    for q in mc['questions']:
        require(q['id'] not in ids, 'Dubbel MC-ID'); ids.add(q['id'])
        require(q['status'] == 'ready_for_import' and q['topicId'] in topics, 'Onvrijgegeven MC-vraag')
        require(q['category'] in {'syllabus', 'tentamen', 'kort'} and
                q['difficulty'] in {'basis', 'toepassing', 'tentamenniveau'}, 'Ongeldig MC-filter')
        opts = q['options']
        require(len(opts) == 4 and len({o['id'] for o in opts}) == 4 and
                q['correctOptionId'] in {o['id'] for o in opts}, 'Ongeldig antwoord MC')
        refs(q['sourceRefs'])
    require(len(ids) == 628 - len(decisions['retired']) + len(decisions['additions']), 'MC-redactie onvolledig')

    exams, review = [], []
    for item in read(root, 'exams/exam-index.json')['exams']:
        e = read(root, item['jsonPath'])
        models = {m['questionId']: m for m in read(root, 'exams/2026-models/' + e['examId'] + '.json')['questions']}
        allowlist = e['simulation']['questionIds']
        all_questions = {q['id']: q for s in e['sections'] for q in s['questions']}
        all_cases = {c['id']: c for s in e['sections'] for c in s['cases']}
        require(len(set(allowlist)) == len(allowlist) and set(allowlist) <= all_questions.keys(), 'Ongeldige selectie')
        selected, sections = {}, []
        for s in e['sections']:
            for q in s['questions']:
                if q['id'] not in allowlist:
                    continue
                require(q['selectionForBelre32026']['included'], 'Uitgesloten BELRE2-vraag')
                require(q['id'] in models, '2026-model ontbreekt')
                m = models[q['id']]
                require(m['status'] in {READY, PENDING}, 'Onbekende modelstatus')
                ready = (m['status'] == READY and q['model2026Status'] == READY and
                         m['manualModelComparisonAllowed'] and q['manualModelComparisonAllowed'])
                require(ready or m['status'] == PENDING, 'Tegenstrijdige vrijgavestatus')
                case = all_cases[q['caseId']]
                context_ids = case['contextCaseIds']
                require(all(i in all_cases for i in context_ids), 'Casuscontext ontbreekt')
                context = ''.join(prose(all_cases[i]['exactNarrativeText']) for i in context_ids)
                deps = q.get('dependsOnQuestionIds', [])
                require(set(deps) <= set(allowlist), 'Vraagafhankelijkheid buiten selectie')
                require(len(deps) == len(q.get('contextQuestionTexts', [])), 'Vraagcontext onvolledig')
                if deps:
                    context += '<h3>Eerdere vraagtekst bij deze casus</h3>' + ''.join(
                        prose(t) for t in q['contextQuestionTexts'])
                # Separate case IDs prevent context from leaking between questions or cases.
                section_id = q['id'] + '-context'
                sections.append({'id': section_id, 'title': s['title'], 'groupId': s['id'],
                                 'contentHtml': context, 'contextCaseIds': context_ids,
                                 'dependsOnQuestionIds': deps})
                model_html = prose(m['model2026Text']) if ready else '<p>Uitwerking wordt nog gecontroleerd. Zelfbeoordeling met punten is nog niet beschikbaar.</p>'
                if ready and m.get('practiceAssumptions2026'):
                    model_html += '<h3>Oefenuitgangspunten</h3>' + ''.join(prose(a) for a in m['practiceAssumptions2026'])
                selected[q['id']] = {
                    'id': q['id'], 'type': 'open', 'title': 'Vraag ' + str(q['sourceQuestionNumber']),
                    'sourceQuestionNumber': q['sourceQuestionNumber'], 'sectionId': section_id,
                    'groupId': s['id'], 'groupTitle': s['title'],
                    'points': q['points'], 'prompt': q['fullPromptText'],
                    'promptHtml': prose(q['fullPromptText']),
                    'solutionHtml': model_html, 'modelStatus': 'ready' if ready else 'pending',
                    'manualModelComparisonAllowed': ready, 'automaticScoringAllowed': False,
                    'sourceAnswerPresentation': q['answerPresentation'],
                    'answerPresentation': 'open_text' if q['id'] in TEXT_PRESENTATION_IDS else q['answerPresentation'],
                    'balanceCount': 2 if q['id'] == 'belre3-20250611-s6-q26' else 1,
                    'answerKind': 'journal' if q['answerPresentation'] == 'journal_table' else 'open',
                    'sourceRef': q['sourceRef'], 'contextPdfPages': q.get('contextPdfPages', []),
                    'dependsOnQuestionIds': deps, 'contextQuestionTexts': q.get('contextQuestionTexts', []),
                    'sourceRefs2026': refs(m.get('sourceRefs2026', [])) if ready else [],
                }
                if not ready:
                    review.append({'examId': e['examId'], 'questionId': q['id']})
        questions = [selected[i] for i in allowlist]
        partial = len(questions) != e['originalQuestionCount']
        eligible = e['applicabilityAssessment']['eligibleForDefaultBelre3ExamList']
        max_score = sum(q['points'] for q in questions)
        require(max_score == e['simulation']['maximumPoints'], 'Puntentotaal wijkt af')
        exams.append({
            'id': e['examId'], 'title': 'BELRE3 tentamen' if eligible else 'Tax 2: selectie Vpb',
            'date': e['date'], 'durationMinutes': e['durationMinutes'], 'maxScore': max_score,
            'defaultUntimed': partial, 'partialSelection': partial, 'supplemental': not eligible,
            'originalQuestionCount': e['originalQuestionCount'],
            'originalPassPoints': e['passThreshold'], 'originalDurationMinutes': e['durationMinutes'],
            'introduction': 'Oefenen met de oorspronkelijke casus en een afzonderlijk oefenmodel voor 2026.',
            'instructions': [
                'Casusjaren en bronvragen blijven behouden. De uitwerkingen zijn oefenmodellen voor 2026, geen officiële gecorrigeerde antwoordmodellen.',
                'Gebruik het oorspronkelijke PDF-bestand voor tabellen, schema’s en de originele exameninstructies.',
                ('Dit is een Vpb-selectie. Oorspronkelijke tijd en cesuur gelden voor het volledige brontentamen. Je start standaard zonder tijdslimiet.' if partial else
                 'De klok volgt de oorspronkelijke toetsduur. Punten ken je zelf toe door je antwoord met het oefenmodel te vergelijken.'),
                'Een antwoordmodel dat nog wordt gecontroleerd, verschijnt pas na inhoudelijke vrijgave.',
            ],
            'sections': sections, 'questions': questions, 'pdfReferences': e['pdfReferences'],
            'sourceSectionCount': len({q['groupId'] for q in questions}),
        })
    require(len(exams) == 16 and sum(len(e['questions']) for e in exams) == 336, 'Onvolledige tentamenbank')
    expected = read(root, 'exams/2026-review-items.json')['items']
    require({r['questionId'] for r in review} == {r['questionId'] for r in expected}, 'Reviewlijst wijkt af')
    sources = {sid: {'id': sid, 'title': d['relativePath'], 'pages': d['pages'],
                     'sha256': d['sha256'], 'url': 'pdf/' + d['sha256'] + '.pdf'}
               for sid, d in by_source.items()}
    authoring = Path(__file__).resolve().parents[1] / 'content-authoring'
    release = read(authoring, 'exam-model-review-release.json')
    model_review = read(authoring, 'exam-model-review.json')
    require(fingerprint(model_review) == release['reviewSha256'],
            'Modelreview gewijzigd sinds inhoudelijke vrijgave')
    exams, review = apply_review(exams, review, sources, model_review, release)
    return mc, exams, sources, review, docs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    mc, exams, sources, review, docs = build(args.source)
    target = Path(__file__).resolve().parents[1] / 'oefenen' / 'content'
    target.mkdir(parents=True, exist_ok=True)
    (target / 'pdf').mkdir(exist_ok=True)
    # All validation finishes before modifying an existing runtime bank.
    for d in docs:
        output = target / 'pdf' / (d['sha256'] + '.pdf')
        if not output.exists() or digest(output) != d['sha256']:
            shutil.copyfile(checked_path(args.source, d['deliveryPath']), output)
    result = {'mc': len(mc['questions']), 'examQuestions': sum(len(e['questions']) for e in exams),
              'exams': len(exams), 'readyModels': 336 - len(review), 'pendingModels': len(review),
              'sourcePaths': len(docs), 'uniquePdfs': len(sources)}
    result['reviewedModels'] = sum('modelReviewVerdict' in q for e in exams for q in e['questions'])
    result['conditionalModels'] = sum(q.get('modelReviewVerdict') == 'conditional_on_explicit_assumption'
                                      for e in exams for q in e['questions'])
    result['mcCategories'] = {category: sum(q['category'] == category for q in mc['questions'])
                              for category in ('syllabus', 'tentamen', 'kort')}
    for name, data in [('mc', mc), ('exams', exams), ('sources', sources), ('review-ids', review), ('summary', result)]:
        temporary = target / (name + '.json.tmp')
        temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        temporary.replace(target / (name + '.json'))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
