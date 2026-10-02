"""Apply explicit exercise scope without invalidating saved MC attempts."""
import copy
import hashlib
import json


def apply_exercise_scope(bank, decisions):
    if decisions['version'] != 1 or bank['contentRevision'] != decisions['baseRevision']:
        raise ValueError('Oefenafbakening hoort bij een andere vragenbank')
    result = copy.deepcopy(bank)
    old = {q['id']: q for q in result['questions']}
    removed = {q['id'] for q in decisions['excludedQuestions']}
    if len(removed) != len(decisions['excludedQuestions']) or not removed <= old.keys():
        raise ValueError('Ongeldige uitsluiting')
    if any(not item.get('reason') for item in decisions['excludedQuestions']):
        raise ValueError('Uitsluiting mist bronafbakening')
    result['previousRevisions'].append({'revision': bank['contentRevision'], 'questionIds': list(old)})
    result['questions'] = [q for q in result['questions'] if q['id'] not in removed]
    result['retiredQuestions'].extend(q for q in bank['questions'] if q['id'] in removed)
    active_topics = {q['topicId'] for q in result['questions']}
    result['archivedTopics'] = result.get('archivedTopics', []) + [t for t in result['topicOrder'] if t['id'] not in active_topics]
    result['topicOrder'] = [t for t in result['topicOrder'] if t['id'] in active_topics]
    for topic in result['topicOrder']:
        if topic['id'] == 'mismatches-cfc':
            topic['title'] = 'Renteprijsmismatches en omgekeerde hybride lichamen'
    result['duplicateGroups'] = decisions['duplicateGroups']
    result['exerciseScope'] = {'version': 1, 'basis': decisions['basis'], 'sourceRefs': decisions['sourceRefs']}
    payload = {key: result[key] for key in ('questions', 'retiredQuestions', 'previousRevisions', 'duplicateGroups', 'exerciseScope')}
    result['contentRevision'] = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return result
