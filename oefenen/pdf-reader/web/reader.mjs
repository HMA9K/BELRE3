import {PDFViewerApplication as app,PDFViewerApplicationOptions as options} from './viewer.mjs';
import {AnnotationEditorType,AnnotationEditorParamsType} from '../build/pdf.mjs';
import {originalPdfs} from '../../data/exam-original-pdfs.mjs';
import {installContentView} from './content-view.mjs?v=belre3-20261002-view-position1';

// All annotations stay in this browser. Published source files are never written.
const root=new URL('../../',import.meta.url),source=new URL(new URLSearchParams(location.search).get('file')||'',location.href);
const entry=Object.entries(originalPdfs).flatMap(([id,exam])=>['questions','solutions'].map(kind=>({id,kind,file:exam[kind]}))).find(e=>e.file.url&&new URL(e.file.url,root).href===source.href);
const key=entry?entry.id+':'+entry.kind+':'+entry.file.sha256:null;
const viewKey='belre3-pdf-view-v1:'+key,status=document.getElementById('cafa-save-status');
let revision=0,savedRevision=0,timer=null,saving=null,ready=false,storageAvailable=true,dbPromise=null;
const report=message=>status.textContent=message;
const storedView=()=>{try{return localStorage.getItem(viewKey)||'';}catch{return '';}};
function database(){
 return dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('belre3-pdf-annotations-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('documents');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
async function read(){const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('documents').objectStore('documents').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(bytes){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').put({bytes},key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
function changed(){
 revision++;report('Arceringen opslaan…');clearTimeout(timer);timer=setTimeout(flush,250);
 // Observe each later edit, including changing the colour or deleting a mark.
 app.pdfDocument?.annotationStorage.resetModified();
}
async function flush(){
 clearTimeout(timer);if(saving)return saving;if(!ready||revision===savedRevision)return;
 saving=(async()=>{try{while(savedRevision!==revision){const pending=revision,document=app.pdfDocument;
  const bytes=await document.saveDocument();await write(bytes);savedRevision=pending;
 }report('Arceringen lokaal opgeslagen');}catch(error){console.error('PDF annotations could not be stored:',error.message,error.details);report('Opslaan mislukt. Download je PDF om de arceringen te bewaren.');}finally{saving=null;}})();return saving;
}
options.setAll({locale:'nl',disablePreferences:true,disableHistory:true,defaultZoomValue:'page-width',enableScripting:false,enableAltText:false,enableAltTextModelDownload:false,enableGuessAltText:false,enableSignatureEditor:false,enableComment:false,enableNova:false,enableHighlightFloatingButton:true,viewerCssTheme:1});
const originalOpen=app.open.bind(app);
app.open=async args=>{
 if(!entry||source.origin!==location.origin||args.url!==source.href){report('Dit document hoort niet bij een tentamen.');throw new Error('Unsupported PDF source');}
 try{const stored=await read();if(stored?.bytes)args={...args,data:stored.bytes.slice()};}catch{storageAvailable=false;report('Lokale opslag is niet beschikbaar. Arceringen blijven alleen in dit venster.');}
 const view=storedView();if(view)app.initialBookmark=view;
 return originalOpen(args);
};
await app.initializedPromise;
const toolbar=document.createElement('div');toolbar.className='cafa-mark-toolbar';toolbar.innerHTML='<button id="cafa-highlight" type="button" aria-pressed="false" title="Selecteer tekst om te arceren">Arceren</button><label>Kleur <select id="cafa-highlight-colour" aria-label="Arceerkleur"><option value="#FFFF98">Geel</option><option value="#53FFBC">Groen</option><option value="#80EBFF">Blauw</option><option value="#FFCBE6">Roze</option><option value="#FF4F5F">Rood</option></select></label><button id="cafa-highlight-delete" type="button" disabled title="Selecteer een arcering om deze te verwijderen">Verwijderen</button>';
document.body.append(toolbar);toolbar.addEventListener('pointerdown',event=>event.stopPropagation());
installContentView(app,{key,restored:!!storedView(),bookmark:storedView()});
const toggle=document.getElementById('cafa-highlight'),colour=document.getElementById('cafa-highlight-colour'),remove=document.getElementById('cafa-highlight-delete');
toggle.addEventListener('click',()=>app.eventBus.dispatch('switchannotationeditormode',{source:toolbar,mode:app.pdfViewer.annotationEditorMode===AnnotationEditorType.HIGHLIGHT?AnnotationEditorType.NONE:AnnotationEditorType.HIGHLIGHT}));
colour.addEventListener('change',()=>app.eventBus.dispatch('switchannotationeditorparams',{source:toolbar,type:AnnotationEditorParamsType.HIGHLIGHT_COLOR,value:colour.value}));
remove.addEventListener('click',()=>app.pdfViewer._layerProperties.annotationEditorUIManager?.delete());
app.eventBus.on('annotationeditormodechanged',e=>toggle.setAttribute('aria-pressed',String(e.mode===AnnotationEditorType.HIGHLIGHT)));
app.eventBus.on('editingstateschanged',e=>{remove.disabled=!e.details.hasSelectedEditor;if(ready&&app.pdfDocument.annotationStorage.size)changed();});
app.eventBus.on('annotationeditorparamschanged',e=>{for(const [type,value] of e.details)if(type===AnnotationEditorParamsType.HIGHLIGHT_COLOR)colour.value=value;if(ready&&app.pdfDocument.annotationStorage.size)changed();});
app.eventBus.on('documentloaded',()=>{
 ready=true;parent.postMessage('belre3:pdf-ready',location.origin);const storage=app.pdfDocument.annotationStorage,previous=storage.onSetModified;
 storage.onSetModified=()=>{previous?.();changed();};
 report(storageAvailable?'Arceringen worden lokaal bewaard':'Lokale opslag is niet beschikbaar. Download je PDF om arceringen te bewaren.');
});
app.eventBus.on('updateviewarea',e=>{if(!ready)return;try{localStorage.setItem(viewKey,e.location.pdfOpenParams.slice(1));}catch{}});
window.addEventListener('pagehide',()=>{void flush();});
window.addEventListener('beforeunload',e=>{if(revision!==savedRevision){void flush();e.preventDefault();e.returnValue='';}});
window.CafaPdfReader={flush,goToPage(page){if(ready&&Number.isInteger(page)&&page>=1&&page<=app.pagesCount){window.CafaPdfContentView?.cancelRestore();app.pdfViewer.currentPageNumber=page;}},get key(){return key;},get ready(){return ready;},get pending(){return revision!==savedRevision;}};
