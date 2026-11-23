import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { docxFixture, unicodePdfFixture } from './fixtures.mjs';

const samples={en:['Abstract','Keywords','Materials and methods','References'],ar:['الملخص','الكلمات المفتاحية','المنهجية','المراجع'],ku:['پوختە','پەیڤێن سەرەکی','ڕێباز','ژێدەر'],tr:['Özet','Anahtar kelimeler','Yöntem','Kaynakça']};
for(const [language,lines] of Object.entries(samples)) for(const format of ['docx','pdf']) {
 test(`${language} ${format.toUpperCase()} headings survive real extraction and JSON export`,async({page})=>{
  await page.goto('/open-journal-checker/');
  // Manuscript detection must not depend on the selected interface language.
  const buffer=format==='pdf'?unicodePdfFixture(lines,['ar','ku'].includes(language)):docxFixture({document:`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(line=>`<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`});
  await page.locator('#manuscript-file').setInputFiles({name:`synthetic-${language}.${format}`,mimeType:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer});
  for(const label of ['Abstract','Keywords','Methods','References']) await expect(page.locator('#file-info')).toContainText(`${label} heading: Detected`);
  await page.locator('#language').selectOption(language);
  const pending=page.waitForEvent('download');
  await page.locator('#download-json').click();
  const report=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  expect(report.fileInspection.headings).toEqual({abstract:true,keywords:true,references:true,methods:true});
  expect(report.evaluation.passed).toBe(0);
 });
}
