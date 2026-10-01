import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseRegistry} from '../oefenen/js/case-presentation-core.mjs';

const exams = [{id:'exam', sections:[{id:'case',contentHtml:'<p>Huur € 65.000.</p>',contentPresentationHtml:'<h3>Huur</h3><p>Huur <strong>€ 65.000</strong>.</p>'}]}];
const signature = value => value.replace(/<br\s*\/?\s*>/g,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();

test('bestaande poging krijgt de beoordeelde casusopmaak zonder de opgeslagen poging te wijzigen', () => {
  const original = JSON.stringify(exams);
  const registry = createCaseRegistry(exams, signature);
  assert.equal(registry.select('case', '<p>Huur € 65.000.</p>'), exams[0].sections[0].contentPresentationHtml);
  assert.equal(JSON.stringify(exams), original);
});
test('gemengde onderwerpentoets gebruikt dezelfde broncasus ondanks een nieuw context-ID', () => {
  const registry = createCaseRegistry(exams, signature);
  assert.equal(registry.select('mixed-case','<p>Huur<br>€ 65.000.</p>'), exams[0].sections[0].contentPresentationHtml);
});
test('gewijzigde casus of onbekende bron krijgt nooit een opmaak met andere feiten', () => {
  const registry = createCaseRegistry(exams, signature);
  for (const html of ['<p>Huur € 66.000.</p>','<p>Een andere casus.</p>']) assert.equal(registry.select('case',html),html);
});
