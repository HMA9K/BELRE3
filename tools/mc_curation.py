"""Apply explicit MC editorial decisions without changing the original delivery."""
import ast
import hashlib
import json
import math
import operator
import re


def require(condition, message):
    if not condition:
        raise ValueError(message)


def calculate(expression):
    """Only arithmetic and min/max; never execute authored Python expressions."""
    operations = {ast.Add: operator.add, ast.Sub: operator.sub,
                  ast.Mult: operator.mul, ast.Div: operator.truediv}

    def value(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -value(node.operand)
        if isinstance(node, ast.BinOp) and type(node.op) in operations:
            return operations[type(node.op)](value(node.left), value(node.right))
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id in {'min', 'max'} and not node.keywords and node.args):
            return (min if node.func.id == 'min' else max)(value(a) for a in node.args)
        raise ValueError('Onveilige of onbekende rekenexpressie')
    return value(ast.parse(expression, mode='eval').body)


def apply_curation(bank, decisions, root):
    require(decisions['version'] == 1, 'Onbekende redactieversie')
    require(bank['contentRevision'] == decisions['baseRevision'], 'Redactie hoort bij andere aanlevering')
    original = {q['id']: q for q in bank['questions']}
    retired = {r['id']: r for r in decisions['retired']}
    additions = decisions['additions']
    added_ids = {q['id'] for q in additions}
    require(len(retired) == len(decisions['retired']) and retired.keys() <= original.keys(), 'Ongeldige vervallijst')
    require(len(added_ids) == len(additions) and not added_ids & original.keys(), 'Nieuw MC-ID bestaat al')
    active = (original.keys() - retired.keys()) | added_ids
    for r in retired.values():
        require(r['reason'].strip() and r['replacementIds'] and set(r['replacementIds']) <= active,
                'Vervallen leerdoel zonder actieve opvolger')
        require(r['category'] == original[r['id']]['category'] and r['topicId'] == original[r['id']]['topicId'],
                'Vervalmelding wijkt af van bronvraag')
    exams = {}
    for q in additions:
        require(q['category'] == 'tentamen' and q['caseText'].strip() and q['prompt'].strip(), 'Nieuwe casus onvolledig')
        require(q['explanationSteps'] and q['recognition'] and q['pitfall'], 'Nieuwe uitleg onvolledig')
        require(all(o['explanation'] for o in q['options']), 'Toelichting op afleider ontbreekt')
        require(q['examAlignment'] and q['sourceRefs'] and q['legalReferences'], 'Nieuwe brononderbouwing ontbreekt')
        for alignment in q['examAlignment']:
            eid = alignment['examId']
            # An exam ID is data, never a freely supplied filesystem path.
            require(re.fullmatch(r'belre3-\d{8}', eid), 'Ongeldig tentamen-ID')
            if eid not in exams:
                e = json.loads((root / f'exams/{eid}.json').read_text(encoding='utf-8'))
                m = json.loads((root / f'exams/2026-models/{eid}.json').read_text(encoding='utf-8'))
                exams[eid] = e, {x['questionId']: x for x in m['questions']}
            e, models = exams[eid]
            anchors = [item for s in e['sections'] if s['title'] == alignment['sourceSection']
                       for item in s['questions'] if str(item['sourceQuestionNumber']) == str(alignment['sourceQuestion'])]
            require(len(anchors) == 1, 'Tentamenherkomst is niet uniek')
            anchor = anchors[0]
            require(anchor['id'] in e['simulation']['questionIds'], 'Nieuwe MC buiten toegelaten tentamenselectie')
            require(anchor['model2026Status'] == models[anchor['id']]['status'] == 'ready_for_manual_2026_model_comparison',
                    'Nieuwe MC gebruikt nog te beoordelen open model')
            require(alignment['relation'] == 'mc-variant' and alignment['changesFromSource'], 'Bewerking niet verantwoord')
            require(any(r['sourceId'] == anchor['sourceRef']['sourceId'] and
                        set(anchor['sourceRef']['pdfPages']) <= set(r['pdfPages']) for r in q['sourceRefs']),
                    'Oorspronkelijke opgave ontbreekt bij MC-bronnen')
        for check in q.get('calculationChecks', []):
            require(math.isclose(calculate(check['expression']), check['expected'], rel_tol=1e-10, abs_tol=1e-8),
                    'Rekencontrole faalt: ' + q['id'])
    bank['questions'] = [q for q in bank['questions'] if q['id'] not in retired] + additions
    # Original objects remain byte-for-byte equivalent as JSON values, including option IDs.
    bank['retiredQuestions'] = [original[id] for id in retired]
    bank['previousRevisions'] = [{'revision': bank['contentRevision'], 'questionIds': list(original)}]
    revision_input = json.dumps({'questions': bank['questions'], 'retiredQuestions': bank['retiredQuestions'],
                                 'previousRevisions': bank['previousRevisions']}, sort_keys=True, ensure_ascii=False).encode()
    bank['contentRevision'] = hashlib.sha256(revision_input).hexdigest()
    normalized = [re.sub(r'\s+', ' ', (q['caseText'] + '\n' + q['prompt']).casefold()).strip() for q in bank['questions']]
    require(len(normalized) == len(set(normalized)), 'Letterlijk dubbele casus en vraag')
    return bank
