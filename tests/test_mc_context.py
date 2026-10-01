import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from mc_context import apply_context


class ContextTests(unittest.TestCase):
    def setUp(self):
        self.current = json.loads((ROOT / 'oefenen/content/mc.json').read_text(encoding='utf-8'))
        self.edits = json.loads((ROOT / 'content-authoring/mc-context.json').read_text(encoding='utf-8'))
        self.base = copy.deepcopy(self.current)
        self.base['contentRevision'] = self.edits['baseRevision']
        self.base['previousRevisions'] = self.base['previousRevisions'][:-1]
        for edit in self.edits['questions']:
            next(q for q in self.base['questions'] if q['id'] == edit['id']).update(edit['before'])

    def test_reproducible_and_only_wording_changes(self):
        original = copy.deepcopy(self.base)
        result = apply_context(self.base, self.edits)
        self.assertEqual(result, self.current)
        self.assertEqual(original, self.base)
        self.assertEqual(result['retiredQuestions'], original['retiredQuestions'])
        self.assertEqual(result['previousRevisions'][:-1], original['previousRevisions'])
        for before, after in zip(original['questions'], result['questions']):
            self.assertEqual({k: v for k, v in before.items() if k not in {'title', 'caseText', 'prompt'}},
                             {k: v for k, v in after.items() if k not in {'title', 'caseText', 'prompt'}})

    def test_invalid_context_rejected_before_mutation(self):
        for failure in ('revision', 'answer', 'stale', 'duplicate', 'missing'):
            edits = copy.deepcopy(self.edits)
            if failure == 'revision': edits['baseRevision'] = 'other'
            elif failure == 'answer':
                edits['questions'][0]['before']['correctOptionId'] = 'C'
                edits['questions'][0]['after']['correctOptionId'] = 'A'
            elif failure == 'stale': edits['questions'][0]['before']['caseText'] = 'other'
            elif failure == 'duplicate': edits['questions'].append(edits['questions'][0])
            elif failure == 'missing': edits['questions'][0]['id'] = 'missing'
            original = copy.deepcopy(self.base)
            with self.subTest(failure=failure), self.assertRaises(ValueError):
                apply_context(self.base, edits)
            self.assertEqual(original, self.base)


if __name__ == '__main__':
    unittest.main()
