import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from mc_curation import apply_curation, calculate


class CurationTests(unittest.TestCase):
    def test_published_calculations(self):
        data = json.loads((ROOT / 'content-authoring/mc-curation.json').read_text(encoding='utf-8'))
        for question in data['additions']:
            for check in question['calculationChecks']:
                with self.subTest(id=question['id'], check=check['description']):
                    self.assertAlmostEqual(calculate(check['expression']), check['expected'])

    def test_expressions_cannot_execute_code(self):
        for expression in ['__import__("os")', '(1).__class__', '2 ** 1000000', '[1, 2]', 'min(x=1)']:
            with self.subTest(expression=expression), self.assertRaises(ValueError):
                calculate(expression)

    def test_bad_decisions_do_not_mutate_the_bank(self):
        bank = {'contentRevision': 'base', 'questions': [{'id': 'a', 'category': 'syllabus', 'topicId': 't'}]}
        decisions = {'version': 1, 'baseRevision': 'base', 'retired': [], 'additions': []}
        for patch in [
            {'baseRevision': 'other'},
            {'retired': [{'id': 'missing'}]},
            {'retired': [{'id': 'a', 'reason': 'Duplicate', 'replacementIds': ['missing']}]},
            {'additions': [{'id': 'a'}]},
        ]:
            original = copy.deepcopy(bank)
            with self.assertRaises(ValueError):
                apply_curation(bank, {**decisions, **patch}, ROOT)
            self.assertEqual(bank, original)


if __name__ == '__main__':
    unittest.main()
