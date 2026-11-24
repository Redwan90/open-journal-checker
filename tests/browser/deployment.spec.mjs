import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { pdfFixture, docxFixture } from './fixtures.mjs';
import { VERSION } from '../../js/version.js';

test('Release build inspects PDF/DOCX with external requests blocked',async({page,request})=>{
  const external=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!=='http://127.0.0.1:8765') {
      // Endpoint security may inject telemetry into branded browsers and Firefox; all external
      // requests stay blocked, including that instrumentation.
      if(!url.hostname.endsWith('.kaspersky-labs.com')) external.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/built/');
  await expect(page.locator('#summary-total')).toHaveText('15');
  const policy=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(policy).not.toContain('cdn.jsdelivr.net');
  await expect(page.locator('[data-i18n=fileLimitLocal]')).toContainText('on this device');
  for(const type of ['pdf','docx']) {
    await page.locator('#manuscript-file').setInputFiles({name:`synthetic.${type}`,mimeType:type==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:type==='pdf'?pdfFixture():docxFixture()});
    await expect(page.locator('#file-info')).toContainText(`synthetic.${type}`,{timeout:30000});
    await expect(page.locator('#file-info')).toContainText('Abstract heading: Detected');
  }
  const download=page.waitForEvent('download');await page.locator('#download-json').click();
  const json=JSON.parse(await readFile(await (await download).path(),'utf8'));
  expect(json.version).toBe(VERSION);
  expect((await (await request.get('/built/version.json')).json()).version).toBe(VERSION);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('Release bundle exposes licenses and excludes repository internals',async({request})=>{
  for(const path of ['licenses/unicode-LICENSE','docs/OCR.md','vendor/ocr/licenses/tesseract-LICENSE','vendor/ocr/licenses/core-LICENSE','vendor/ocr/licenses/tessdata-LICENSE','vendor/ocr/licenses/eng-package.json','vendor/ocr/licenses/ara-package.json','vendor/ocr/licenses/tur-package.json','docs/OJS-INTEGRATION.md','docs/ACCESSIBILITY.md','LICENSE','vendor/pdfjs/LICENSE','vendor/pdfjs/standard_fonts/LICENSE_FOXIT','vendor/pdfjs/wasm/LICENSE_OPENJPEG']) {
    expect((await request.get('/built/'+path)).status()).toBe(200);
  }
  for(const path of ['.git/config','node_modules/pdfjs-dist/package.json','.github/workflows/ci.yml','tests/server.mjs']) {
    expect((await request.get('/built/'+path)).status()).toBe(404);
  }
});
