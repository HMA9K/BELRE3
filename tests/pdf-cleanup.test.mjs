import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
test('cleaned PDFs retain source IDs, correct hashes and physical page references',()=>{
  const sources=read('oefenen/content/sources.json'),report=read('docs/pdf-cover-cleanup.json');
  const corpus=read('assistant/sources/pages.json');
  assert.equal(report.sources.length,14);
  for(const entry of report.sources){
    const source=sources[entry.sourceId];
    assert.equal(source.pages,entry.originalPages-1);
    assert.equal(source.sha256,entry.sha256);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('oefenen/content/'+source.url,root))).digest('hex'),source.sha256);
    assert.equal(corpus.sources[entry.sourceId].sha256,source.sha256);
    assert.ok(!fs.existsSync(new URL('oefenen/content/pdf/'+entry.originalSha256+'.pdf',root)));
  }
  const marker=new RegExp('stud'+'(?:ocu|eersnel)|messages\\.downloaded_by','i');
  assert.ok(corpus.pages.every(page=>!marker.test(page.text)));
});
