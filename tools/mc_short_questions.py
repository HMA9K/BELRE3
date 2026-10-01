"""Add authored short drills while keeping all previous MC revisions resumable."""
import copy
import hashlib
import json
import re
from collections import Counter
from mc_curation import require, calculate


def apply_short_questions(bank, extension):
    require(extension['version'] == 1, 'Onbekende kortevragenversie')
    require(bank['contentRevision'] == extension['baseRevision'], 'Korte vragen horen bij een andere vragenbank')
    old = {q['id']: q for q in bank['questions']}
    additions = extension['questions']
    topics = {t['id'] for t in bank['topicOrder']}
    require(len(old) == extension['baseQuestionCount'], 'Onverwacht aantal bestaande vragen')
    require(len({q['id'] for q in additions}) == len(additions), 'Dubbele nieuwe vraag')
    require(not set(q['id'] for q in additions) & (old.keys() | {q['id'] for q in bank.get('retiredQuestions', [])}), 'Nieuw ID bestaat al')
    counts = Counter(q['topicId'] for q in additions)
    require(set(counts) == topics and all(n >= 5 for n in counts.values()), 'Niet ieder MC-onderwerp krijgt vijf korte vragen')
    for q in additions:
        require(q['category'] == 'kort' and q['shortKind'] == 'kennistoets', 'Verkeerd vraagtype')
        require(q['status'] == 'ready_for_import' and not q['caseText'], 'Korte vraag heeft een aparte lange casus')
        require(5 <= len(q['prompt'].split()) <= 60, 'Korte vraag is te lang of onvolledig')
        require(q['authoringBaseQuestionId'] in old, 'Onbekende cursusvraag als oefenbasis')
        require(q['sourceRefs'] and any(r['role'] in ('course', 'law', 'solution') for r in q['sourceRefs']), 'College-, wets- of uitwerkingsbron ontbreekt')
        require(q['explanationSteps'] and q['recognition'] and q['pitfall'], 'Uitleg ontbreekt')
        require(len(q['options']) == 4 and len({o['id'] for o in q['options']}) == 4 and
                len({o['text'] for o in q['options']}) == 4 and
                sum(o['id'] == q['correctOptionId'] for o in q['options']) == 1 and
                all(o['explanation'] for o in q['options']), 'Antwoord of afleider onvolledig')
        for check in q.get('calculationChecks', []):
            require(abs(calculate(check['expression']) - check['expected']) < 1e-7, 'Rekencontrole faalt')
    combined = bank['questions'] + additions
    stems = [re.sub(r'\s+', ' ', (q['caseText'] + '\n' + q['prompt']).casefold()).strip() for q in combined]
    require(len(stems) == len(set(stems)), 'Letterlijk dubbele vraag')
    result = copy.deepcopy(bank)
    result.setdefault('previousRevisions', []).append({'revision': bank['contentRevision'], 'questionIds': list(old)})
    result['questions'] = copy.deepcopy(combined)
    payload = {key: result[key] for key in ('questions', 'retiredQuestions', 'previousRevisions')}
    result['contentRevision'] = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return result
