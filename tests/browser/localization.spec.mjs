import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { t, rtl } from '../../js/i18n.js';
import { docxFixture } from './fixtures.mjs';

for(const locale of ['en','ar','ku','tr']) {
  test(`Localized ${locale} messages, inspection, Crossref feedback and HTML/JSON reports`,async({page,context},testInfo)=>{
    let lookups=0;
    await page.route('https://api.crossref.org/works/*',route=>{lookups++;return route.fulfill({status:429,body:'Rate limit'});});
    await page.goto('/open-journal-checker/');
    await page.locator('#language').selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('html')).toHaveAttribute('dir',rtl(locale)?'rtl':'ltr');
    await expect(page.locator('#language')).toHaveAccessibleName(t(locale,'displayLanguage'));
    await expect(page.locator('.stat-overline')).toHaveText(t(locale,'submissionPulse'));
    await expect(page.locator('#checks')).toContainText(t(locale,'checkTitleValue',{count:0,max:20}));
    await expect(page.locator('#guidelines-url')).toHaveText(t(locale,'readGuidelines'));
    await page.locator('#manuscript-file').setInputFiles({name:'broken.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('not a zip')});
    await expect(page.locator('#file-info')).toHaveText(t(locale,'docxInvalid'));
    const other=locale==='en'?'ar':'en';
    await page.locator('#language').selectOption(other);
    await expect(page.locator('#file-info')).toHaveText(t(other,'docxInvalid'));
    await page.locator('#language').selectOption(locale);
    await page.locator('#manuscript-file').setInputFiles({name:'synthetic.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docxFixture()});
    await expect(page.locator('#file-info')).toContainText(t(locale,'headingAbstract'));
    await expect(page.locator('#file-info')).toContainText(t(locale,'headingNote'));
    await page.locator('#verify-doi').click();
    await expect(page.locator('#doi-result')).toHaveText(t(locale,'verifyRateLimit'));
    await page.locator('#language').selectOption(other);
    await expect(page.locator('#doi-result')).toHaveText(t(other,'verifyRateLimit'));
    expect(lookups).toBe(1);
    await page.locator('#language').selectOption(locale);
    await page.locator('#title').fill('<img src=x onerror=unsafe()>');
    const download=page.waitForEvent('download');
    await page.locator('#download-report').click();
    const html=await readFile(await (await download).path(),'utf8');
    expect(html).toContain(`lang="${locale}" dir="${rtl(locale)?'rtl':'ltr'}"`);
    expect(html).toContain(t(locale,'reportTitle'));
    expect(html).toContain(t(locale,'fileInspection'));
    expect(html).toContain('&lt;img src=x onerror=unsafe()&gt;');
    expect(html).not.toContain('<img');
    const jsonDownload=page.waitForEvent('download');
    await page.locator('#download-json').click();
    const json=JSON.parse(await readFile(await (await jsonDownload).path(),'utf8'));
    expect(json.language).toBe(locale);
    expect(json.fileInspection.note).toBe(t(locale,'headingNote'));
    expect(json.crossrefResult).toBe(t(locale,'verifyRateLimit'));
    expect(json.evaluation.checks[0].values).toBe(t(locale,'checkTitleValue',{count:json.evaluation.words.title,max:20}));
    if(locale==='ar') {
      const report=await context.newPage();
      await report.setContent(html);
      await expect(report.locator('html')).toHaveAttribute('dir','rtl');
      await report.screenshot({path:testInfo.outputPath('arabic-report.png'),fullPage:true});
    }
  });
}
