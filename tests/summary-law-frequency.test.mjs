import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mentionsVpbArticle} from '../js/summary-core.mjs';

const corpus=JSON.parse(fs.readFileSync(new URL('../assistant/sources/pages.json',import.meta.url),'utf8'));
function page(sourceId,number){
  const found=corpus.pages.find(p=>p.sourceId===sourceId&&p.page===number);
  assert.ok(found,sourceId+' p. '+number);return found.text;
}

test('Vpb examples require an exact article number and an explicit nearby law name',()=>{
  for(const text of ['Art. 8b, lid 1, Wet Vpb 1969','artikel 8b Wet op de vennootschapsbelasting 1969','ART. 8B\nVpb','art. 8b W et Vpb 1969']){
    assert.equal(mentionsVpbArticle(text,'8b'),true,text);
  }
  for(const text of ['art. 8ba Wet Vpb 1969','art. 18b Wet Vpb 1969','art. 8b zonder wetsnaam','art. 8b Wet IB 2001; de Vpb is ook relevant']){
    assert.equal(mentionsVpbArticle(text,'8b'),false,text);
  }
  assert.equal(mentionsVpbArticle('art. 3.56 Wet Vpb 1969','3'),false);
  assert.equal(mentionsVpbArticle('art. 3 . 56 Wet Vpb 1969','3'),false);
  assert.equal(mentionsVpbArticle('art. 4.41 Wet IB 2001','4'),false);
  assert.equal(mentionsVpbArticle('art. 8b Wet Vpb 1969','8.'),false);
});

test('A following article or a different law cannot supply Vpb attribution',()=>{
  for(const text of ['art. 3 jo. art. 17, lid 3, Wet Vpb 1969','art. 3 AWR en de Wet Vpb','art. 3 Algemene wet inzake rijksbelastingen en Vpb','art. 3 Wet IB 2001 en Wet Vpb','art. 3 Besluit fiscale eenheid 2003 en Wet Vpb']){
    assert.equal(mentionsVpbArticle(text,'3'),false,text);
  }
  assert.equal(mentionsVpbArticle('art. 3 jo. art. 17, lid 3, Wet Vpb 1969','17'),true);
  assert.equal(mentionsVpbArticle('art. 4 AWR; art. 4 Wet Vpb 1969','4'),true);
  assert.equal(mentionsVpbArticle('art. 3 '+('x'.repeat(180))+' Vpb','3'),false);
});

test('Original 2014 IB references do not become Vpb articles 3 and 4',()=>{
  const text=page('pdf-f4f4fbe8d47e51e1',2);
  assert.match(text,/3\.56/);assert.match(text,/4\.41/);
  assert.equal(mentionsVpbArticle(text,'3'),false);
  assert.equal(mentionsVpbArticle(text,'4'),false);
});

test('Actual AWR references in official colleges remain outside Vpb attribution',()=>{
  for(const [sourceId,number] of [['pdf-052fabf4516feef9',5],['pdf-4483c5f28379c2ab',22]]){
    const text=page(sourceId,number);assert.match(text,/art\. 4 AWR/);
    assert.equal(mentionsVpbArticle(text,'4'),false,sourceId);
  }
});

test('Explicit Vpb references survive original PDF line breaks and OCR spacing',()=>{
  assert.equal(mentionsVpbArticle(page('pdf-59edb20dd40746af',2),'8b'),true);
  assert.equal(mentionsVpbArticle(page('pdf-f4f4fbe8d47e51e1',1),'10a'),true);
  assert.equal(mentionsVpbArticle(page('pdf-bdf6c0530cdffea1',1),'3'),true);
  assert.equal(mentionsVpbArticle(page('pdf-925afc0620bf18a3',1),'3'),false);
  assert.equal(mentionsVpbArticle(page('pdf-925afc0620bf18a3',1),'17'),true);
});
