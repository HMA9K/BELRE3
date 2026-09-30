"""Apply a checked, separately approved review to pending open answer models."""
import copy
import hashlib
import html
import json
import math
from collections import Counter

from mc_curation import calculate

DEFINITIVE = 'definitive'
CONDITIONAL = 'conditional_on_explicit_assumption'
UNRESOLVED = 'unresolved'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fingerprint(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def prose(value):
    return ''.join('<p>' + html.escape(part).replace('\n', '<br>') + '</p>'
                   for part in value.strip().split('\n\n') if part.strip())


def text_list(value):
    return isinstance(value, list) and all(isinstance(s, str) and s.strip() for s in value)


def apply_review(exams, pending, sources, review, release):
    """Validate everything before copying; never mutate the original delivery."""
    require(release.get('schemaVersion') == review.get('schemaVersion') == 1,
            'Onbekende modelreviewversie')
    require(review.get('targetLawYear') == 2026, 'Modelreview hoort bij ander wetsjaar')
    require(fingerprint(exams) == release.get('baseExamsSha256'),
            'Modelreview hoort bij een andere tentamenbank')
    items = review.get('items')
    require(isinstance(items, list) and len(items) == review.get('count'),
            'Aantal modelreviews wijkt af')
    by_id = {q['id']: q for exam in exams for q in exam['questions']}
    expected = {r['questionId'] for r in pending}
    ids = [item.get('questionId') for item in items]
    require(len(set(ids)) == len(ids) and set(ids) == expected,
            'Modelreview bevat dubbele, ontbrekende of onverwachte vraag-IDs')
    approved = release.get('approvedQuestionIds')
    require(isinstance(approved, list) and len(set(approved)) == len(approved)
            and set(approved) <= expected, 'Ongeldige modelvrijgave')
    approved = set(approved)
    actual = Counter(item.get('verdict') for item in items)
    require(set(actual) <= {DEFINITIVE, CONDITIONAL, UNRESOLVED}, 'Onbekend reviewoordeel')
    declared = review.get('verdictCounts', {})
    require(set(declared) <= {DEFINITIVE, CONDITIONAL, UNRESOLVED}
            and all(type(declared.get(key, 0)) is int and declared.get(key, 0) == actual[key]
                    for key in (DEFINITIVE, CONDITIONAL, UNRESOLVED)),
            'Tellingen van reviewoordelen wijken af')
    for item in items:
        q = by_id.get(item['questionId'])
        require(q and q['type'] == 'open' and q['modelStatus'] == 'pending'
                and q['manualModelComparisonAllowed'] is False
                and q['automaticScoringAllowed'] is False,
                'Modelreview overschrijft een bestaand vrijgegeven model')
        require(isinstance(item.get('model2026Text'), str) and item['model2026Text'].strip(),
                'Modeltekst ontbreekt')
        for key in ('practiceAssumptions2026', 'missingData2026', 'reviewNotes2026'):
            require(text_list(item.get(key)), 'Ongeldige reviewtoelichting: ' + key)
        assumptions, missing = item['practiceAssumptions2026'], item['missingData2026']
        if item['verdict'] == DEFINITIVE:
            require(not assumptions and not missing, 'Definitief model bevat open voorwaarden')
        elif item['verdict'] == CONDITIONAL:
            require(assumptions and missing, 'Voorwaardelijk model mist expliciete aannames')
        else:
            require(item['questionId'] not in approved, 'Onopgelost model mag niet worden vrijgegeven')
        refs = item.get('sourceRefs2026')
        require(isinstance(refs, list) and refs, 'Bronverwijzingen ontbreken')
        for ref in refs:
            source = sources.get(ref.get('sourceId'))
            pages = ref.get('pdfPages')
            require(source and isinstance(pages, list) and pages
                    and all(type(p) is int and 1 <= p <= source['pages'] for p in pages),
                    'Onbekende bron of paginanummer buiten bron')
            require(ref.get('role') in {'question', 'original_solution', 'law', 'course'}
                    and isinstance(ref.get('locator'), str) and ref['locator'].strip(),
                    'Bronrol of vindplaats ontbreekt')
        require(any(ref['role'] == 'question' and ref['sourceId'] == q['sourceRef']['sourceId']
                    and set(q['sourceRef']['pdfPages']) <= set(ref['pdfPages']) for ref in refs),
                'Modelreview verwijst niet naar de oorspronkelijke bronvraag')
        checks = item.get('calculationChecks')
        require(isinstance(checks, list), 'Rekencontroles ontbreken')
        for check in checks:
            require(isinstance(check.get('expression'), str)
                    and type(check.get('expected')) in (int, float)
                    and math.isfinite(check['expected']), 'Ongeldige rekencontrole')
            require(math.isclose(calculate(check['expression']), check['expected'],
                                 rel_tol=1e-10, abs_tol=1e-8),
                    'Rekencontrole faalt: ' + item['questionId'])

    result = copy.deepcopy(exams)
    output = {q['id']: q for exam in result for q in exam['questions']}
    for item in items:
        if item['questionId'] not in approved:
            continue
        q = output[item['questionId']]
        assumptions = item['practiceAssumptions2026']
        intro = ''
        if assumptions:
            intro = '<h3>Oefenmodel met expliciete aannames</h3>' + prose(
                'Dit model geldt onder de onderstaande oefenaannames. '
                'Deze zijn een aanvulling voor het oefenen en staan niet vast in de oorspronkelijke opgave.')
            intro += '<ul>' + ''.join('<li>' + html.escape(s) + '</li>' for s in assumptions) + '</ul>'
        q.update({
            'solutionHtml': intro + prose(item['model2026Text']),
            'modelStatus': 'ready', 'manualModelComparisonAllowed': True,
            'automaticScoringAllowed': False,
            'sourceRefs2026': copy.deepcopy(item['sourceRefs2026']),
            'modelReviewVerdict': item['verdict'],
            'practiceAssumptions2026': list(assumptions),
            'missingData2026': list(item['missingData2026']),
        })
    return result, [r for r in pending if r['questionId'] not in approved]
