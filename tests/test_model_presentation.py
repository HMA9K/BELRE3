import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from model_presentation import apply_presentation, tokens, format_model, sentences, semicolon_parts, tree, text, list_parts, lines, paragraph


class ModelPresentationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.exams = json.loads((ROOT / 'oefenen/content/exams.json').read_text(encoding='utf-8'))
        cls.plans = json.loads((ROOT / 'content-authoring/model-presentation.json').read_text(encoding='utf-8'))
        cls.questions = {q['id']: q for e in cls.exams for q in e['questions']}

    def test_every_model_keeps_all_original_words_and_numbers(self):
        self.assertEqual(len(self.questions), 336)
        for plan in self.plans['items']:
            q = self.questions[plan['questionId']]
            with self.subTest(question=q['id']):
                self.assertEqual(hashlib.sha256(q['solutionHtml'].encode()).hexdigest(), plan['sourceSha256'])
                self.assertEqual(tokens(q['solutionHtml']), tokens(q['solutionPresentationHtml'], True))
                self.assertEqual(format_model(q, plan), q['solutionPresentationHtml'])

    def test_all_journals_and_balances_have_actual_tables(self):
        for q in self.questions.values():
            if q['answerPresentation'] in ('journal_table', 'balance_table'):
                with self.subTest(question=q['id']):
                    self.assertIn('<table ', q['solutionPresentationHtml'])
                    if q['answerPresentation'] == 'journal_table':
                        self.assertIn('Debet', q['solutionPresentationHtml'])
                        self.assertIn('Credit', q['solutionPresentationHtml'])

    def test_journal_amounts_keep_their_debit_or_credit_side(self):
        for q in self.questions.values():
            if q['answerPresentation'] != 'journal_table':
                continue
            for row in tree(q['solutionPresentationHtml']).findall('.//tbody/tr'):
                cells = [text(cell).strip() for cell in row]
                with self.subTest(question=q['id'], account=cells[0]):
                    self.assertEqual(len(cells), 3)
                    credit = cells[0].lower().startswith(('aan ', 'credit '))
                    self.assertTrue(cells[2 if credit else 1])
                    self.assertFalse(cells[1 if credit else 2])

    def test_numbered_steps_and_parenthetical_explanations_stay_together(self):
        self.assertEqual(sentences('1. Aantal aandelen: 130. Dit is de ruilverhouding.'),
                         ['1. Aantal aandelen: 130.', 'Dit is de ruilverhouding.'])
        self.assertEqual(semicolon_parts('kapitaal 200; winstreserves 580 (sluitpost: 780 min 200; onbelast); totaal 780'),
                         ['kapitaal 200', ' winstreserves 580 (sluitpost: 780 min 200; onbelast)', ' totaal 780'])

    def test_law_references_and_amounts_are_not_list_markers(self):
        self.assertIsNone(list_parts('1. De wet (art. 13d lid 1) geldt, zie art. 15 lid 4 onderdeel c. De aftrek is € 0.'))
        self.assertEqual(lines('De regel staat in (art. 10a lid 3 onderdeel\na) of\nonderdeel b).'),
                         ['De regel staat in (art. 10a lid 3 onderdeel a) of onderdeel b).'])
        self.assertEqual(list_parts('De eisen zijn: (1) winstafhankelijk; (2) achtergesteld; (3) geen vaste looptijd.')[1],
                         ['(1) winstafhankelijk;', '(2) achtergesteld;', '(3) geen vaste looptijd.'])

    def test_calculation_tables_exclude_general_explanation(self):
        self.assertNotIn('<table', paragraph('Omdat de FE-winst onder € 1 miljoen blijft, heeft het plafond geen aanvullende beperking.', 'calculation'))
        self.assertIn('<table', paragraph('De fiscale winst bedraagt € 100.000 + € 20.000 = € 120.000.', 'calculation'))

    def test_rebuild_changes_only_presentation_fields(self):
        before = copy.deepcopy(self.exams)
        after = apply_presentation(copy.deepcopy(before), self.plans)
        for old_e, new_e in zip(before, after):
            for old, new in zip(old_e['questions'], new_e['questions']):
                for key in ('solutionPresentationHtml', 'solutionPresentationLayout'):
                    old.pop(key, None)
                    new.pop(key, None)
        self.assertEqual(before, after)

    def test_changed_source_fails_before_using_a_stale_layout(self):
        changed = copy.deepcopy(self.exams)
        changed[0]['questions'][0]['solutionHtml'] += '<p>Gewijzigde bron.</p>'
        with self.assertRaisesRegex(ValueError, 'Model gewijzigd'):
            apply_presentation(changed, self.plans)


if __name__ == '__main__':
    unittest.main()
