import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from mc_short_questions import apply_short_questions
from mc_context import apply_context


class ShortQuestionTests(unittest.TestCase):
    def setUp(self):
        self.extension = json.loads((ROOT / 'content-authoring/mc-short-questions.json').read_text(encoding='utf-8'))
        self.current = json.loads((ROOT / 'oefenen/content/mc.json').read_text(encoding='utf-8'))
        self.context = json.loads((ROOT / 'content-authoring/mc-context.json').read_text(encoding='utf-8'))
        self.base = copy.deepcopy(self.current)
        self.base['previousRevisions'] = self.base['previousRevisions'][:-1]
        for edit in self.context['questions']:
            next(q for q in self.base['questions'] if q['id'] == edit['id']).update(edit['before'])
        self.base['questions'] = [q for q in self.base['questions'] if not q.get('authoringBaseQuestionId')]
        self.base['contentRevision'] = self.extension['baseRevision']
        self.base['previousRevisions'] = [r for r in self.base['previousRevisions'] if r['revision'] != self.extension['baseRevision']]

    def test_reproducible_extension_and_unchanged_previous_questions(self):
        before = copy.deepcopy(self.base)
        result = apply_short_questions(self.base, self.extension)
        self.assertEqual(apply_context(result, self.context), self.current)
        self.assertEqual(self.base, before)
        self.assertEqual(result['questions'][:594], before['questions'])
        self.assertEqual(result['retiredQuestions'], before['retiredQuestions'])
        self.assertEqual(result['previousRevisions'][:-1], before['previousRevisions'])

    def test_invalid_extension_fails_before_mutation(self):
        for failure in ('wrong_revision', 'missing_topic', 'duplicate_id', 'missing_explanation', 'missing_source', 'long_prompt'):
            extension = copy.deepcopy(self.extension)
            if failure == 'wrong_revision': extension['baseRevision'] = 'other'
            elif failure == 'missing_topic': extension['questions'] = extension['questions'][5:]
            elif failure == 'duplicate_id': extension['questions'][0]['id'] = extension['questions'][1]['id']
            elif failure == 'missing_explanation': extension['questions'][0]['options'][0]['explanation'] = ''
            elif failure == 'missing_source': extension['questions'][0]['sourceRefs'] = []
            elif failure == 'long_prompt': extension['questions'][0]['prompt'] = 'woord ' * 61
            before = copy.deepcopy(self.base)
            with self.subTest(failure=failure), self.assertRaises(ValueError):
                apply_short_questions(self.base, extension)
            self.assertEqual(self.base, before)


if __name__ == '__main__':
    unittest.main()
