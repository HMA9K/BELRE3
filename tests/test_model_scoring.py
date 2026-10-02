import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from model_scoring import apply_model_scoring
class ModelScoringTests(unittest.TestCase):
    def setUp(self):
        read=lambda name:json.loads((ROOT/name).read_text(encoding='utf-8'))
        self.exams=read('oefenen/content/exams.json');self.review=read('content-authoring/model-scoring.json');self.corpus=read('assistant/sources/pages.json')
    def test_rebuild_is_identical_and_answers_and_cases_are_unchanged(self):
        self.assertEqual(apply_model_scoring(copy.deepcopy(self.exams),self.review,self.corpus),self.exams)
        clean=copy.deepcopy(self.exams)
        for e in clean:
            for q in e['questions']:q.pop('modelScoring')
        built=apply_model_scoring(copy.deepcopy(clean),self.review,self.corpus)
        for e in built:
            for q in e['questions']:q.pop('modelScoring')
        self.assertEqual(clean,built)
    def test_missing_evidence_changed_model_and_invented_totals_are_rejected(self):
        for field,value,message in [('modelSha256','changed','Antwoordmodel gewijzigd'),('total',99,'Puntentotaal wijkt af')]:
            changed=copy.deepcopy(self.review);changed['questions'][0][field]=value
            with self.assertRaisesRegex(ValueError,message):apply_model_scoring(self.exams,changed,self.corpus)
        changed=copy.deepcopy(self.review);changed['questions'][0]['items'][0]['evidence']=['Niet in de bron']
        with self.assertRaisesRegex(ValueError,'Puntenbewijs ontbreekt'):apply_model_scoring(self.exams,changed,self.corpus)
if __name__=='__main__':unittest.main()
