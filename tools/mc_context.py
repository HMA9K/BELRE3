"""Apply source-bound wording improvements while preserving answers and run IDs."""
import copy
import hashlib
import json
from mc_curation import require


def apply_context(bank, edits):
    require(edits['version'] == 1, 'Onbekende contextversie')
    require(bank['contentRevision'] == edits['baseRevision'], 'Context hoort bij andere vragenbank')
    questions = {q['id']: q for q in bank['questions']}
    seen = set()
    for edit in edits['questions']:
        require(edit['id'] in questions and edit['id'] not in seen, 'Onbekend of dubbel context-ID')
        seen.add(edit['id'])
        require(edit['reason'].strip(), 'Redactionele reden ontbreekt')
        require(edit['before'].keys() == edit['after'].keys() and
                set(edit['after']) <= {'title', 'caseText', 'prompt'}, 'Context mag alleen vraagtekst wijzigen')
        require(all(questions[edit['id']][key] == value for key, value in edit['before'].items()),
                'Brontekst gewijzigd sinds contextcontrole')
        require(all(isinstance(value, str) and value.strip() for value in edit['after'].values()),
                'Lege contexttekst')
    result = copy.deepcopy(bank)
    result['previousRevisions'].append({'revision': bank['contentRevision'], 'questionIds': list(questions)})
    for question in result['questions']:
        if question['id'] in seen:
            edit = next(e for e in edits['questions'] if e['id'] == question['id'])
            question.update(edit['after'])
    payload = {key: result[key] for key in ('questions', 'retiredQuestions', 'previousRevisions')}
    result['contentRevision'] = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return result
