import test from 'node:test';
import assert from 'node:assert/strict';
import {scoringRanges} from '../oefenen/js/answer-model-core.mjs';

test('normeringen herkennen verschillende puntennoteringen zonder bedragen of wetsleden te kleuren',()=>{
  const value='1p; 2p; 3p; 1 g/f; 2 g/f; 1 punt; 2 punten; ½ p; 0,5 punt; 1/2 punt; 1 punt g/f. Art. 13 lid 1, € 35.000 en 2026.';
  assert.deepEqual(scoringRanges(value).map(r=>r.text),['1p','2p','3p','1 g/f','2 g/f','1 punt','2 punten','½ p','0,5 punt','1/2 punt','1 punt g/f']);
});
test('genummerde voorwaarden zijn geen puntentoekenning',()=>{
  assert.deepEqual(scoringRanges('De eisen zijn: (1) winstafhankelijk; (2) achtergesteld; (3) geen vaste looptijd.'),[]);
  assert.deepEqual(scoringRanges('Bedrag € 100.000. Art. 15 lid 1.'),[]);
});
test('losse scores in een puntenkolom en bij berekeningen blijven herkenbaar',()=>{
  assert.deepEqual(scoringRanges('(½)',{pointsColumn:true}).map(r=>r.text),['(½)']);
  assert.deepEqual(scoringRanges('Totaal € 200.000 (1)').map(r=>r.text),['(1)']);
  assert.deepEqual(scoringRanges('60% (1)').map(r=>r.text),['(1)']);
  assert.deepEqual(scoringRanges('60% × € 35.000 (1) + 9.600 × € 100 (1) = € 1.218.000').map(r=>r.text),['(1)','(1)']);
});
