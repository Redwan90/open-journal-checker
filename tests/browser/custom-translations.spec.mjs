import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
const preset={journalName:'Custom journal',extraGuidance:'Custom guidance',articleTypes:['Custom type'],subjects:[{name:'Custom subject',terms:['data']}],confirmations:['Custom declaration','Untranslated declaration']};
const importConfig=async(page,config)=>page.locator('#config-import').setInputFiles({name:'journal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});

for(const locale of ['en','ar','ku','tr']) test(`Editor saves ${locale} journal translations, exports and reports them, and preserves consent on language changes`,async({page})=>{
 await page.goto('/open-journal-checker/');
 await page.locator('#open-settings').click();
 await importConfig(page,preset);
 await page.locator('#journal-translations summary').click();
 await page.locator('#translation-language').selectOption(locale);
 const values={name:`${locale} <img src=x onerror=unsafe()>`,guidance:`${locale} guidance`,article:`${locale} article`,subject:`${locale} subject`,confirmation:`${locale} declaration`};
 for(const [kind,value] of Object.entries(values)) await page.locator(`#translation-fields [data-kind=${kind}]`).first().fill(value);
 await page.locator('#translation-language').selectOption(locale==='ar'?'tr':'ar');
 await page.locator('#translation-language').selectOption(locale);
 await expect(page.locator('#translation-fields [data-kind=name]')).toHaveValue(values.name);
 await page.locator('#settings-form [type=submit]').click();
 await page.locator('#article-type').selectOption('Custom type');
 await page.locator('#subject').selectOption('Custom subject');
 await page.locator('#confirmations input').first().check();
 await page.locator('#language').selectOption(locale);
 await expect(page.locator('#journal-name')).toHaveText(values.name);
 await expect(page.locator('#journal-name img')).toHaveCount(0);
 await expect(page.locator('#guidance')).toHaveText(values.guidance);
 await expect(page.locator('#article-type option:checked')).toHaveText(values.article);
 await expect(page.locator('#subject option:checked')).toHaveText(values.subject);
 await expect(page.locator('#confirmations input').first()).toHaveAccessibleName(values.confirmation);
 await expect(page.locator('#confirmations input').nth(1)).toHaveAccessibleName('Untranslated declaration');
 await expect(page.locator('#confirmations input').first()).toBeChecked();
 const pending=page.waitForEvent('download');await page.locator('#download-report').click();
 const html=await readFile(await (await pending).path(),'utf8');
 expect(html).toContain(values.name.replace('<','&lt;').replace('>','&gt;'));
 expect(html).not.toContain('<img');expect(html).toContain(values.confirmation);
 const jsonPending=page.waitForEvent('download');await page.locator('#download-json').click();
 const report=JSON.parse(await readFile(await (await jsonPending).path(),'utf8'));
 expect(report.manuscript.articleType).toBe('Custom type');
 expect(report.evaluation.confirmations[0].sourceDescription).toBe('Custom declaration');
 expect(report.evaluation.confirmations[0].description).toBe(values.confirmation);
 await page.locator('#open-settings').click();
 const exported=page.waitForEvent('download');await page.locator('#config-export').click();
 const config=JSON.parse(await readFile(await (await exported).path(),'utf8'));
 expect(config.translations[locale].confirmation['Custom declaration']).toBe(values.confirmation);
 await importConfig(page,config);
 await expect(page.locator('#confirmations input:checked')).toHaveCount(0);
 await page.locator('#close-settings').click();
 await page.reload();await page.locator('#language').selectOption(locale);
 await expect(page.locator('#journal-name')).toHaveText(values.name);
});

test('Editing original declarations drops stale translations and clears confirmations',async({page})=>{
 await page.goto('/open-journal-checker/');await page.locator('#open-settings').click();
 await importConfig(page,{...preset,translations:{ar:{confirmation:{'Custom declaration':'الإقرار المخصص'}}}});
 await page.locator('#close-settings').click();await page.locator('#language').selectOption('ar');
 await page.locator('#confirmations input').first().check();await page.locator('#open-settings').click();
 await page.locator('[name=confirmations]').fill('Changed declaration');
 await page.locator('#settings-form [type=submit]').click();
 await expect(page.locator('#confirmations input').first()).toHaveAccessibleName('Changed declaration');
 await expect(page.locator('#confirmations input:checked')).toHaveCount(0);
});

test('Expanded translation editor fits mobile layouts and passes automated accessibility checks',async({page})=>{
 await page.goto('/open-journal-checker/');await page.locator('#open-settings').click();await importConfig(page,preset);
 await page.locator('#journal-translations summary').click();
 for(const locale of ['en','ar','ku','tr']) {
  await page.setViewportSize({width:320,height:800});
  await page.locator('#translation-language').selectOption(locale);
  expect(await page.locator('#settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 }
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
 expect(scan.violations).toEqual([]);
});

test('Oversized translation imports preserve the current journal and author confirmations',async({page})=>{
 await page.goto('/open-journal-checker/');await page.locator('#confirmations input').first().check();
 await page.locator('#open-settings').click();
 await page.locator('#config-import').setInputFiles({name:'too-big.json',mimeType:'application/json',buffer:Buffer.alloc(1000001,32)});
 await expect(page.locator('#toast')).toContainText('under 1 MB');
 await expect(page.locator('#confirmations input:checked')).toHaveCount(1);
});
