import copy
import json
from pathlib import Path
import sys
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from question_case_scope import apply_question_case_scope
from case_presentation import fingerprint
from model_presentation import tree, text

class QuestionCaseScopeTests(unittest.TestCase):
    def setUp(self):
        self.exams = json.loads((ROOT/'oefenen/content/exams.json').read_text(encoding='utf-8'))
        self.review = json.loads((ROOT/'content-authoring/question-case-scope.json').read_text(encoding='utf-8'))
        self.presentation = json.loads((ROOT/'content-authoring/case-presentation.json').read_text(encoding='utf-8'))

    def test_rebuild_preserves_every_source_question_answer_and_full_case(self):
        self.assertEqual(apply_question_case_scope(copy.deepcopy(self.exams),self.review,self.presentation),self.exams)
        clean=copy.deepcopy(self.exams)
        for e in clean:
            for s in e['sections']:
                s.pop('questionContentPresentationHtml',None)
                s.pop('questionContentPresentationRevision',None)
        updated=apply_question_case_scope(copy.deepcopy(clean),self.review,self.presentation)
        for e in updated:
            for s in e['sections']:
                s.pop('questionContentPresentationHtml',None)
                s.pop('questionContentPresentationRevision',None)
        self.assertEqual(updated,clean)

    def test_withdrawn_selection_is_removed(self):
        section=self.exams[0]['sections'][0]
        section['questionContentPresentationHtml']='<p>Oude selectie</p>'
        section['questionContentPresentationRevision']='old'
        result=apply_question_case_scope(self.exams,dict(self.review,questions=[]),self.presentation)
        self.assertNotIn('questionContentPresentationHtml',result[0]['sections'][0])
        self.assertNotIn('questionContentPresentationRevision',result[0]['sections'][0])

    def test_edited_source_and_invented_excerpt_are_rejected(self):
        changed=copy.deepcopy(self.review)
        changed['questions'][0]['sourceSha256']='changed'
        with self.assertRaisesRegex(ValueError,'Broncasus gewijzigd'):
            apply_question_case_scope(self.exams,changed,self.presentation)
        changed=copy.deepcopy(self.review)
        section = next(s for e in self.exams for s in e['sections'] if s['id']==changed['questions'][0]['sectionId'])
        node = list(tree(section['contentHtml']))[0]
        changed['questions'][0]['blocks']=[{'sourceSha256':fingerprint(text(node)), 'excerpts':[{'text':'Niet in de bron aanwezig.'}]}]
        with self.assertRaisesRegex(ValueError,'Passage wijkt af'):
            apply_question_case_scope(self.exams,changed,self.presentation)

if __name__=='__main__':
    unittest.main()
