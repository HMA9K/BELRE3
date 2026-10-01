import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from case_presentation import apply_case_presentation, present_section, source_tokens, tokens
from model_presentation import tree, text


class CasePresentationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.exams = json.loads((ROOT / 'oefenen/content/exams.json').read_text(encoding='utf-8'))
        cls.review = json.loads((ROOT / 'content-authoring/case-presentation.json').read_text(encoding='utf-8'))
        cls.plans = {p['sourceSha256']: p for p in cls.review['blocks']}
        cls.sections = {s['id']: s for e in cls.exams for s in e['sections']}

    def test_all_contexts_keep_every_original_word_number_sign_and_order(self):
        self.assertEqual(len(self.sections), 336)
        self.assertEqual(len(self.plans), 228)
        for s in self.sections.values():
            with self.subTest(section=s['id']):
                original = tokens(' '.join(text(n) for n in tree(s['contentHtml'])))
                self.assertEqual(source_tokens(s['contentPresentationHtml']), original)
                self.assertEqual(present_section(s, self.plans), s['contentPresentationHtml'])

    def test_rebuild_changes_only_case_presentation_fields(self):
        before = copy.deepcopy(self.exams)
        after = apply_case_presentation(copy.deepcopy(before), self.review)
        for collection in (before, after):
            for e in collection:
                for s in e['sections']:
                    s.pop('contentPresentationHtml', None)
                    s.pop('contentPresentationRevision', None)
        self.assertEqual(before, after)

    def test_changed_source_cannot_use_an_old_review(self):
        changed = copy.deepcopy(self.exams)
        changed[0]['sections'][0]['contentHtml'] = changed[0]['sections'][0]['contentHtml'].replace('65.000', '66.000')
        with self.assertRaisesRegex(ValueError, 'geen beoordeelde opmaak'):
            apply_case_presentation(changed, self.review)

    def test_pdf_page_continuations_do_not_split_sentences(self):
        for s in self.sections.values():
            nodes = tree(s['contentPresentationHtml'])
            for p in nodes.findall('.//p'):
                value = text(p).strip()
                self.assertFalse(value.startswith(('€ 500.000.', 'bedoeld in art. 13, lid 12, onderdeel b', 'van een derde. Voor de financiering')))

    def test_original_matrix_retains_company_columns_and_loss_signs(self):
        s = self.sections['belre3-20150623-s3-qf-context']
        table = tree(s['contentPresentationHtml']).find('.//table')
        self.assertEqual([text(x) for x in table.findall('./thead/tr/th')], ['Jaar','M BV','D BV','E BV','F BV','Fiscale eenheid'])
        self.assertEqual([text(x) for x in table.findall('./tbody/tr')[0]], ['2013','- 340','- 25','+ 250','+ 90','n.v.t'])
        self.assertIn('(bedragen x € 1.000)', s['contentPresentationHtml'])

    def test_results_split_by_pdf_extraction_form_one_table(self):
        s = self.sections['belre3-20260608-s2-q8-context']
        tables = tree(s['contentPresentationHtml']).findall('.//table')
        self.assertEqual(len(tables), 1)
        rows = [[text(c) for c in row] for row in tables[0].findall('./tbody/tr')]
        self.assertEqual(len(rows), 8)
        self.assertIn(['Rentelasten', '-/- 100'], rows)
        self.assertEqual(rows[-1], ['Winst (vóór toepassing art. 15b Wet Vpb 1969)', '190'])

    def test_restored_2024_balances_match_the_identified_source_and_sides(self):
        s = self.sections['belre3-20240611-s5-q19-context']
        tables = tree(s['contentPresentationHtml']).findall('.//table')
        self.assertEqual(len(tables), 3)
        d2rows = [[text(c) for c in row] for row in tables[2].findall('./tbody/tr')]
        self.assertEqual(d2rows[1], ['Fiscaal vermogen', '€ 125.000', '', ''])
        self.assertEqual(d2rows[-1], ['Totaal', '€ 500.000', 'Totaal', '€ 500.000'])
        restored = next(p['restoredTables'] for p in self.review['blocks'] if p.get('restoredTables'))
        ref = restored[0]['sourceRef']
        path = ROOT / 'oefenen/content/pdf' / (ref['sha256'] + '.pdf')
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), ref['sha256'])
        self.assertEqual(ref['pdfPages'], [5])
        expected = [cell for table in restored for row in table['rows'] for cell in row]
        self.assertEqual(source_tokens(s['contentPresentationHtml'], 'data-restored-source'), tokens(' '.join(expected)))

    def test_case_tables_are_rectangular(self):
        for s in self.sections.values():
            for table in tree(s['contentPresentationHtml']).findall('.//table'):
                columns = len(table.findall('./thead/tr/th'))
                self.assertTrue(columns)
                self.assertTrue(all(len(row) == columns for row in table.findall('./tbody/tr')))


if __name__ == '__main__':
    unittest.main()
