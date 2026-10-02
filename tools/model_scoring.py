"""Attach source-backed scoring criteria without changing released answers."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
compact = lambda s: re.sub(r'\s+', ' ', s).strip()

def apply_model_scoring(exams, review, corpus):
    questions = {q['id']: q for e in exams for q in e['questions']}
    source_models = {q['id']: {r['sourceId'] for r in e['pdfReferences'] if r['role'] == 'model_solution'} for e in exams for q in e['questions']}
    pages = {(p['sourceId'], p['page']): p['text'] for p in corpus['pages']}
    seen = set()
    for rubric in review['questions']:
        qid = rubric['questionId']
        if qid in seen or qid not in questions:
            raise ValueError('Onbekende of dubbele normering: ' + qid)
        seen.add(qid)
        q = questions[qid]
        if hashlib.sha256(q['solutionHtml'].encode()).hexdigest() != rubric['modelSha256']:
            raise ValueError('Antwoordmodel gewijzigd: ' + qid)
        if rubric['total'] != q['points']:
            raise ValueError('Puntentotaal wijkt af: ' + qid)
        ref = rubric['sourceRef']
        if ref['sourceId'] not in source_models[qid]:
            raise ValueError('Normering heeft geen bronuitwerking: ' + qid)
        evidence = compact(' '.join(pages[(ref['sourceId'], n)] for n in ref['pdfPages']))
        for item in rubric['items']:
            if not item['criterion'] or not isinstance(item['points'], int) or item['points'] <= 0:
                raise ValueError('Ongeldig beoordelingscriterium: ' + qid)
            if not item['evidence'] or any(compact(line) not in evidence for line in item['evidence']):
                raise ValueError('Puntenbewijs ontbreekt in bron: ' + qid)
            if item.get('modelQuote') and item['modelQuote'] not in compact(re.sub('<[^>]+>', ' ', q['solutionHtml'])):
                raise ValueError('Puntenanker ontbreekt in antwoord: ' + qid)
        total = sum(item['points'] for item in rubric['items'])
        if rubric['kind'] in ('allocated', 'alternatives') and total != q['points']:
            raise ValueError('Deelpunten tellen niet op tot maximum: ' + qid)
        if rubric['kind'] == 'total_only' and rubric['items']:
            raise ValueError('Deelpunten zonder bronverdeling: ' + qid)
        if rubric['kind'] not in ('allocated','alternatives','capped','total_only'):
            raise ValueError('Onbekende normeringsvorm: ' + qid)
        q['modelScoring'] = {key: rubric[key] for key in ('total','kind','note','sourceRef')}
        q['modelScoring']['items'] = [{key: value for key,value in item.items() if key != 'evidence'} for item in rubric['items']]
        q['modelScoring']['revision'] = review['revision']
    if seen != set(questions):
        raise ValueError('Normeringscontrole onvolledig')
    return exams

def main():
    path = ROOT / 'oefenen/content/exams.json'
    read = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8'))
    exams = apply_model_scoring(read('oefenen/content/exams.json'),read('content-authoring/model-scoring.json'),read('assistant/sources/pages.json'))
    path.write_text(json.dumps(exams, ensure_ascii=False, separators=(',', ':'))+'\n',encoding='utf-8')
    print(json.dumps({'vragen':sum(len(e['questions']) for e in exams)}))

if __name__ == '__main__': main()
