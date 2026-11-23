import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { readPdfDocument, readPdfTask } from '../js/files.js';
import { inspectText } from '../js/checker.js';

const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function app(readManuscriptFile, fetch = () => {}, timers = {}) {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, {value:'',textContent:'',hidden:false,disabled:false,files:[],classList:{toggle(){}},replaceChildren(){}}); return nodes.get(id); };
  const source = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace("attach(); updateLanguage('en'); loadHostedConfig();", '');
  const context = vm.createContext({document:{getElementById:node}, localStorage:{getItem:()=>null}, normalizeConfig:()=>({}),
    readManuscriptFile, inspectText, isDoi:()=>true, t:(_,key)=>key, AbortController, setTimeout:()=>0, clearTimeout(){}, fetch, ...timers});
  vm.runInContext(source + '\nrenderFile = () => {}; renderConfirmations = () => {}; update = () => {};', context);
  return {node, run:code=>vm.runInContext(code, context)};
}

test('Clear prevents pending extraction from restoring manuscript data', async () => {
  const pending = deferred(); const a = app(()=>pending.promise);
  a.node('manuscript-file').files = [{name:'old.docx',size:100}];
  const upload = a.run('onUpload()'); a.run('clearEntries()');
  pending.resolve({text:'Private manuscript',pages:null}); await upload;
  assert.equal(a.run('fileSummary'),null);
  assert.equal(a.node('file-info').textContent,'fileIdle');
});

test('New selection clears exportable inspection immediately and ignores older failures', async () => {
  const pending = [deferred(),deferred()]; let i=0; const a=app(()=>pending[i++].promise);
  a.run("fileSummary = {preview:'old private text'}");
  a.node('manuscript-file').files=[{name:'a.docx',size:100}]; const first=a.run('onUpload()');
  assert.equal(a.run('fileSummary'),null);
  a.node('manuscript-file').files=[{name:'b.docx',size:100}]; const second=a.run('onUpload()');
  pending[1].resolve({text:'New manuscript'}); await second;
  pending[0].reject(new Error('Old failure')); await first;
  assert.equal(a.run('fileDescription.name'),'b.docx');
  assert.equal(a.run('fileSummary.preview'),'New manuscript');
});

test('Clear aborts DOI lookup and ignores a late JSON response', async () => {
  const pending=deferred(); let options;
  const a=app(()=>{}, async (_,opts)=>{options=opts; return {ok:true,status:200,json:()=>pending.promise};});
  a.run("fileSummary = {dois:['10.1234/test']}"); const lookup=a.run('verifyDoi()');
  await Promise.resolve(); a.run('clearEntries()');
  assert.equal(options.signal.aborted,true);
  assert.equal(options.referrerPolicy,'no-referrer');
  pending.resolve({message:{title:['Old record']}}); await lookup;
  assert.equal(a.run('checkedDoi'),null);
  assert.equal(a.node('doi-result').textContent,'');
  assert.equal(a.node('verify-doi').disabled,false);
});

test('Crossref timeout aborts the request and restores the lookup button',async()=>{
  let timeout,signal,cleared=false;
  const a=app(()=>{},(_,opts)=>new Promise((_,reject)=>{
    signal=opts.signal;signal.addEventListener('abort',()=>reject(new Error('Aborted')));
  }),{setTimeout(fn,ms){assert.equal(ms,15000);timeout=fn;return 1;},clearTimeout(){cleared=true;}});
  a.run("fileSummary={dois:['10.1234/test']}");
  const lookup=a.run('verifyDoi()'); timeout(); await lookup;
  assert.equal(signal.aborted,true);
  assert.equal(a.node('doi-result').textContent,'verifyTimeout');
  assert.equal(a.node('verify-doi').disabled,false);
  assert.equal(cleared,true);
});

test('Crossref rate limits produce retry guidance instead of a generic HTTP error',async()=>{
  const a=app(()=>{},async()=>({status:429,ok:false}));
  a.run("fileSummary={dois:['10.1234/test']}"); await a.run('verifyDoi()');
  assert.equal(a.node('doi-result').textContent,'verifyRateLimit');
  assert.equal(a.node('verify-doi').disabled,false);
});

test('PDF line endings preserve headings and release document resources', async () => {
  let destroyed=false;
  const doc={numPages:1,getPage:async()=>({getTextContent:async()=>({items:[
    {str:'Abstract',hasEOL:true},{str:'Some results',hasEOL:true},
    {str:'Methods',hasEOL:true},{str:'Analysis',hasEOL:true},{str:'References',hasEOL:true}
  ]})})};
  const result=await readPdfTask({promise:Promise.resolve(doc),destroy:async()=>{destroyed=true;}});
  assert.equal(inspectText(result.text).headings.abstract,true);
  assert.equal(inspectText(result.text).headings.methods,true);
  assert.equal(destroyed,true);
});

test('PDF resources are released on extraction failure and inspection stays capped', async () => {
  let destroyed=0, pages=0;
  const doc={numPages:40,getPage:async()=>{pages++;return {getTextContent:async()=>({items:[]})};}};
  const task={promise:Promise.resolve(doc),destroy:async()=>{destroyed++;}};
  assert.equal((await readPdfTask(task)).partial,true); assert.equal(pages,30);
  doc.getPage=async()=>{throw new Error('Unreadable page');};
  await assert.rejects(readPdfTask(task),/Unreadable page/);
  assert.equal(destroyed,2);
});

test('PDF loading task is destroyed when document loading fails',async()=>{
  let destroyed=false;
  await assert.rejects(readPdfTask({promise:Promise.reject(new Error('Invalid PDF')),destroy:async()=>{destroyed=true;}}),/Invalid PDF/);
  assert.equal(destroyed,true);
});
