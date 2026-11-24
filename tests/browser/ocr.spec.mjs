import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { scannedPdfFixture, docxFixture } from './fixtures.mjs';
import { t } from '../../js/i18n.js';

test('Image-only PDF OCR uses real self-hosted assets only after consent and exports marked results',async({page,context})=>{
 test.setTimeout(120000);
 const requests=[],external=[];
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());requests.push({url:url.href,method:route.request().method(),body:route.request().postData()});
  if(url.origin!=='http://127.0.0.1:8765') {if(!url.hostname.endsWith('kaspersky-labs.com'))external.push(url.href);return route.abort();}
  return route.continue();
 });
 await page.goto('/built/');
 const pdf=await scannedPdfFixture(page);
 await page.locator('#manuscript-file').setInputFiles({name:'private-scanned.pdf',mimeType:'application/pdf',buffer:pdf});
 await expect(page.locator('#file-info')).toContainText(t('en','pdfNoText'),{timeout:30000});
 await expect(page.locator('#ocr-zone')).toBeVisible({timeout:30000});
 expect(requests.filter(r=>r.url.includes('/vendor/ocr/'))).toEqual([]);
 await page.locator('#start-ocr').click();
 await expect(page.locator('#ocr-status')).toHaveText(t('en','ocrDone'),{timeout:90000});
 await expect(page.locator('#file-info')).toContainText('Abstract heading: Detected');
 await expect(page.locator('#file-info')).toContainText('References heading: Detected');
 await expect(page.locator('#file-info')).toContainText('10.1234/synthetic');
 await expect(page.locator('#summary-count')).toHaveText('0');
 const pending=page.waitForEvent('download');await page.locator('#download-json').click();
 const report=JSON.parse(await readFile(await (await pending).path(),'utf8'));
 expect(report.fileInspection.ocr).toEqual({language:'eng',pagesProcessed:1,pageLimit:5});
 expect(report.fileInspection.ocrWarning).toBe(t('en','ocrAccuracy'));expect(report.fileInspection.partial).toBe(false);
 expect(report.fileInspection.words).toBeGreaterThan(10);
 const htmlPending=page.waitForEvent('download');await page.locator('#download-report').click();
 expect(await readFile(await (await htmlPending).path(),'utf8')).toContain(t('en','ocrAccuracy'));
 expect(external).toEqual([]);expect(requests.every(r=>r.method==='GET' && !r.body)).toBe(true);
 expect(requests.some(r=>r.url.includes('crossref.org'))).toBe(false);
 await expect.poll(()=>page.workers().filter(w=>w.url().includes('/vendor/ocr/')).length).toBe(0);
});

for(const language of ['ara+eng','tur+eng'])test(`Pinned ${language} OCR model initializes and recognizes an image`,async({page})=>{
 test.setTimeout(90000);await page.goto('/built/');
 const text=await page.evaluate(async language=>{
  const {createOcrEngine}=await import('/built/js/ocr.js');
  const controller=new AbortController();const engine=createOcrEngine(controller.signal);
  const timer=setTimeout(()=>controller.abort(),60000);
  try {
   await engine.initialize(language);const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=700;
   const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1240,700);context.fillStyle='black';context.font='60px Arial';
   if(language.startsWith('ara')) {
    context.direction='rtl';context.textAlign='right';
    ['الملخص','هذه دراسة علمية عن التعليم والبحث العلمي','تهدف هذه الدراسة إلى تحليل البيانات والنتائج','المراجع'].forEach((line,index)=>context.fillText(line,1150,140+index*120));
   } else context.fillText('Özet',70,150);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return await engine.recognize(new Uint8Array(await blob.arrayBuffer()));
  } finally {clearTimeout(timer);engine.terminate();}
 },language);
 expect(text.trim().length).toBeGreaterThan(2);
 if(language.startsWith('ara'))expect(text).toMatch(/[\u0600-\u06ff]/u);
});

for(const action of ['cancel','clear','replace'])test(`OCR ${action} during model loading terminates work and cannot restore stale results`,async({page,context})=>{
 test.setTimeout(90000);await page.goto('/built/');
 await page.locator('#manuscript-file').setInputFiles({name:'old-scanned.pdf',mimeType:'application/pdf',buffer:await scannedPdfFixture(page)});
 await expect(page.locator('#ocr-zone')).toBeVisible({timeout:30000});
 let held;const reached=new Promise(resolve=>held=resolve);
 const pattern='**/vendor/ocr/lang/eng.traineddata.gz';
 await context.route(pattern,route=>held(route));
 await page.locator('#start-ocr').click();const resource=await reached;
 if(action==='cancel') {
  await page.locator('#cancel-ocr').click();await expect(page.locator('#ocr-status')).toHaveText(t('en','ocrCancelled'));
  await expect(page.locator('#file-info')).toContainText('old-scanned.pdf');await expect(page.locator('#start-ocr')).toBeEnabled();await expect(page.locator('#start-ocr')).toBeFocused();
 } else if(action==='clear') {
  await page.locator('#clear').click();await expect(page.locator('#file-info')).toHaveText(t('en','fileIdle'));await expect(page.locator('#ocr-zone')).toBeHidden();
 } else {
  await page.locator('#manuscript-file').setInputFiles({name:'new.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docxFixture()});
  await expect(page.locator('#file-info')).toContainText('new.docx');await expect(page.locator('#ocr-zone')).toBeHidden();
 }
 await expect.poll(()=>page.workers().filter(w=>w.url().includes('/vendor/ocr/')).length).toBe(0);
 try {await resource.abort();} catch { /* Terminated worker may have already closed its request. */ }
 await context.unroute(pattern);
 const pending=page.waitForEvent('download');await page.locator('#download-json').click();const report=JSON.parse(await readFile(await (await pending).path(),'utf8'));
 if(action==='clear')expect(report.fileInspection).toBeNull();
 else {expect(report.fileInspection.ocr).toBeUndefined();expect(report.fileInspection.filename).toBe(action==='replace'?'new.docx':'old-scanned.pdf');}
});

test('OCR limits a six-page scan to five pages and marks both report formats as partial',async({page})=>{
 test.setTimeout(150000);await page.goto('/built/');
 await page.locator('#manuscript-file').setInputFiles({name:'six-pages.pdf',mimeType:'application/pdf',buffer:await scannedPdfFixture(page,{pages:6})});
 await expect(page.locator('#ocr-zone')).toBeVisible({timeout:30000});await page.locator('#start-ocr').click();
 await expect(page.locator('#ocr-status')).toHaveText(t('en','ocrDone'),{timeout:120000});
 await expect(page.locator('#file-info')).toContainText(t('en','ocrPartial',{count:5,total:6}));
 const pending=page.waitForEvent('download');await page.locator('#download-json').click();const report=JSON.parse(await readFile(await (await pending).path(),'utf8'));
 expect(report.fileInspection.partial).toBe(true);expect(report.fileInspection.ocr.pagesProcessed).toBe(5);expect(report.fileInspection.pages).toBe(6);
 const htmlPending=page.waitForEvent('download');await page.locator('#download-report').click();expect(await readFile(await (await htmlPending).path(),'utf8')).toContain(t('en','ocrPartial',{count:5,total:6}));
});

test('A bounded OCR timeout terminates its worker while a language asset is delayed',async({page,context})=>{
 test.setTimeout(30000);await page.goto('/built/');let release;
 await context.route('**/vendor/ocr/lang/eng.traineddata.gz',route=>{release=route;});
 const pdf=await scannedPdfFixture(page);
 const code=await page.evaluate(async bytes=>{
  const {recognizePdf}=await import('/built/js/ocr.js');
  try {await recognizePdf(new File([new Uint8Array(bytes)],'scan.pdf'),'eng',{timeoutMs:1000});return 'unexpected-success';}catch(e){return e.code;}
 },[...pdf]);
 expect(code).toBe('ocrTimeout');await expect.poll(()=>page.workers().filter(w=>w.url().includes('/vendor/ocr/')).length).toBe(0);
 if(release)try{await release.abort();}catch{}
});
