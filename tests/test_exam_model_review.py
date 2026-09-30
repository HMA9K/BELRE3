import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from exam_model_review import apply_review, fingerprint


class ModelReviewTests(unittest.TestCase):
    def setUp(self):
        self.exams = [{'id': 'exam', 'questions': [{
            'id': 'question', 'type': 'open', 'modelStatus': 'pending',
            'manualModelComparisonAllowed': False, 'automaticScoringAllowed': False,
            'points': 5, 'prompt': 'Oorspronkelijke vraag',
            'sourceRef': {'sourceId': 'source', 'pdfPages': [1]},
        }]}]
        self.pending = [{'examId': 'exam', 'questionId': 'question'}]
        self.sources = {'source': {'pages': 3}}
        self.item = {
            'questionId': 'question', 'verdict': 'definitive',
            'model2026Text': 'Berekening: 2 + 3 = 5. <script>geen HTML</script>',
            'sourceRefs2026': [{'sourceId': 'source', 'pdfPages': [1],
                                'role': 'question', 'locator': 'Vraag 1'}],
            'calculationChecks': [{'expression': '2+3', 'expected': 5}],
            'practiceAssumptions2026': [], 'missingData2026': [], 'reviewNotes2026': [],
        }
        self.review = {'schemaVersion': 1, 'targetLawYear': 2026, 'count': 1,
                       'verdictCounts': {'definitive': 1}, 'items': [self.item]}
        self.release = {'schemaVersion': 1, 'baseExamsSha256': fingerprint(self.exams),
                        'approvedQuestionIds': ['question']}

    def apply(self):
        return apply_review(self.exams, self.pending, self.sources, self.review, self.release)

    def test_release_preserves_question_and_input_and_escapes_model(self):
        original = copy.deepcopy(self.exams)
        result, pending = self.apply()
        self.assertEqual(self.exams, original)
        self.assertEqual(pending, [])
        q = result[0]['questions'][0]
        self.assertEqual(q['prompt'], 'Oorspronkelijke vraag')
        self.assertEqual(q['points'], 5)
        self.assertTrue(q['manualModelComparisonAllowed'])
        self.assertFalse(q['automaticScoringAllowed'])
        self.assertIn('&lt;script&gt;', q['solutionHtml'])
        self.assertNotIn('<script>', q['solutionHtml'])

    def test_invalid_reviews_fail_without_changing_inputs(self):
        original = copy.deepcopy(self.exams)
        for key, value in [
            ('questionId', 'other'), ('verdict', 'unknown'),
            ('calculationChecks', [{'expression': '2+3', 'expected': 6}]),
            ('calculationChecks', [{'expression': '__import__("os")', 'expected': 0}]),
            ('sourceRefs2026', [{'sourceId': 'source', 'pdfPages': [4], 'role': 'question', 'locator': '4'}]),
            ('sourceRefs2026', [{'sourceId': 'source', 'pdfPages': [2], 'role': 'question', 'locator': '2'}]),
            ('practiceAssumptions2026', ['Geen definitief oordeel']),
            ('missingData2026', ['Nog onzeker']),
        ]:
            before = self.item[key]
            self.item[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.apply()
            self.assertEqual(self.exams, original)
            self.item[key] = before
        self.review['items'].append(copy.deepcopy(self.item))
        self.review['count'] = 2
        with self.assertRaises(ValueError):
            self.apply()

    def test_changed_bank_rejects_old_review(self):
        self.exams[0]['questions'][0]['points'] = 6
        with self.assertRaisesRegex(ValueError, 'andere tentamenbank'):
            self.apply()

    def test_conditional_model_requires_and_displays_assumptions(self):
        self.item['verdict'] = 'conditional_on_explicit_assumption'
        self.review['verdictCounts'] = {'conditional_on_explicit_assumption': 1}
        with self.assertRaises(ValueError):
            self.apply()
        self.item['practiceAssumptions2026'] = ['Belang minstens vijf jaar gehouden.']
        self.item['missingData2026'] = ['Houdperiode niet vermeld.']
        result, pending = self.apply()
        q = result[0]['questions'][0]
        self.assertFalse(pending)
        self.assertIn('Oefenmodel met expliciete aannames', q['solutionHtml'])
        self.assertIn(self.item['practiceAssumptions2026'][0], q['solutionHtml'])
        self.assertEqual(q['missingData2026'], self.item['missingData2026'])

    def test_unresolved_or_unapproved_model_stays_pending(self):
        self.item['verdict'] = 'unresolved'
        self.review['verdictCounts'] = {'unresolved': 1}
        with self.assertRaises(ValueError):
            self.apply()
        self.release['approvedQuestionIds'] = []
        result, pending = self.apply()
        self.assertEqual(result, self.exams)
        self.assertEqual(pending, self.pending)

    def test_published_review_changes_only_49_model_fields(self):
        def read(name):
            return json.loads((ROOT / name).read_text(encoding='utf-8'))
        def before(name):
            return json.loads(subprocess.check_output(
                ['git', 'show', '7daa01bc594c4eb32eccff7ac322d6e0c56a3d65:' + name], cwd=ROOT))
        review = read('content-authoring/exam-model-review.json')
        release = read('content-authoring/exam-model-review-release.json')
        self.assertEqual(fingerprint(review), release['reviewSha256'])
        exams, pending = apply_review(before('oefenen/content/exams.json'),
                                     before('oefenen/content/review-ids.json'),
                                     read('oefenen/content/sources.json'), review, release)
        self.assertEqual(exams, read('oefenen/content/exams.json'))
        self.assertEqual(pending, [])
        changed = set(release['approvedQuestionIds'])
        self.assertEqual(len(changed), 49)
        allowed = {'solutionHtml', 'modelStatus', 'manualModelComparisonAllowed', 'sourceRefs2026',
                   'modelReviewVerdict', 'practiceAssumptions2026', 'missingData2026'}
        for old, new in zip(before('oefenen/content/exams.json'), exams):
            self.assertEqual({k: v for k, v in old.items() if k != 'questions'},
                             {k: v for k, v in new.items() if k != 'questions'})
            for a, b in zip(old['questions'], new['questions']):
                if a['id'] not in changed:
                    self.assertEqual(a, b)
                else:
                    self.assertEqual({k: v for k, v in a.items() if k not in allowed},
                                     {k: v for k, v in b.items() if k not in allowed})
        self.assertEqual(before('oefenen/content/mc.json'), read('oefenen/content/mc.json'))
        self.assertEqual(before('oefenen/content/sources.json'), read('oefenen/content/sources.json'))


if __name__ == '__main__':
    unittest.main()
