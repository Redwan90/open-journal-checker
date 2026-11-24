import test from 'node:test';
import assert from 'node:assert/strict';
import { abortable, createOcrEngine, recognizePdf } from '../js/ocr.js';

test('OCR rejects unsupported inputs before accessing files or creating workers',async()=>{
 await assert.rejects(recognizePdf({name:'x.docx',size:10},'eng'),{code:'ocrPdfOnly'});
 await assert.rejects(recognizePdf({name:'x.pdf',size:16*1024*1024},'eng'),{code:'pdfTooLarge'});
 await assert.rejects(recognizePdf({name:'x.pdf',size:10},'not-a-language'),{code:'ocrLanguageInvalid'});
});
test('Abort racing a deferred operation rejects immediately and consumes late completion',async()=>{
 const controller=new AbortController();let finish;
 const pending=abortable(new Promise(resolve=>{finish=resolve;}),controller.signal);
 controller.abort();await assert.rejects(pending,{name:'AbortError'});finish('late private result');
 await assert.rejects(abortable(Promise.reject(new Error('late failure')),controller.signal),{name:'AbortError'});
});
test('OCR worker is owned and terminated during initialization, with all pending work rejected',async()=>{
 const previous=globalThis.Worker;let worker;
 globalThis.Worker=class {constructor(){worker=this;}postMessage(message){this.message=message;}terminate(){this.terminated=(this.terminated||0)+1;}};
 try {
  const controller=new AbortController(),engine=createOcrEngine(controller.signal);
  const started=engine.initialize('eng');assert.equal(worker.message.action,'load');
  controller.abort();await assert.rejects(started,{name:'AbortError'});assert.equal(worker.terminated,1);
  engine.terminate();assert.equal(worker.terminated,1);
  await assert.rejects(engine.recognize(new Uint8Array()),{name:'AbortError'});
 } finally {globalThis.Worker=previous;}
});
