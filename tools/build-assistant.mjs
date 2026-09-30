import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {questionRecord,revision} from '../js/assistant-context.mjs';
import './build-course-map.mjs';
import './build-summary.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const mc=read('oefenen/content/mc.json'),exams=read('oefenen/content/exams.json'),corpus=read('assistant/sources/pages.json'),sources=read('oefenen/content/sources.json');
for(const [id,source] of Object.entries(sources))if(corpus.sources[id]?.sha256!==source.sha256)throw Error('Bronindex is verouderd: '+id);
if(Object.keys(corpus.sources).length!==Object.keys(sources).length)throw Error('Bronafbakening wijkt af.');
for(const s of Object.values(sources)){const pages=corpus.pages.filter(p=>p.sourceId===s.id);if(pages.length!==s.pages||!pages.some(p=>p.text.length>100)||pages.some((p,i)=>p.page!==i+1))throw Error('Bron mist doorzoekbare paginas: '+s.id);}
const records={};
async function add(record){records[record.kind+':'+record.id]={...record,revision:await revision(record)};}
for(const q of [...mc.questions,...(mc.retiredQuestions||[])])await add(questionRecord('mc',q));
for(const exam of exams)for(const q of exam.questions)await add(questionRecord('exam',q,exam.sections.find(s=>s.id===q.sectionId),exam));
fs.mkdirSync(path.join(root,'assistant/server'),{recursive:true});
fs.writeFileSync(path.join(root,'assistant/server/catalog.generated.mjs'),'export default '+JSON.stringify(records)+';\n');
// Only site assets enter the public output. Corpus, tools, review records and secrets stay out.
const dist=path.resolve(root,process.env.BELRE_BUILD_OUTPUT||'dist');
if(fs.existsSync(dist))throw Error('Uitvoermap dist bestaat al. Gebruik een schone buildmap.');
fs.mkdirSync(dist);
for(const name of ['index.html','js','css','oefenen'])if(fs.existsSync(path.join(root,name)))fs.cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
fs.writeFileSync(path.join(dist,'_routes.json'),JSON.stringify({version:1,include:['/api/study-*'],exclude:[]}));
fs.writeFileSync(path.join(dist,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n');
console.log(JSON.stringify({questions:Object.keys(records).length,sourceDocuments:Object.keys(sources).length,sourcePages:corpus.pages.length,output:path.basename(dist)}));
