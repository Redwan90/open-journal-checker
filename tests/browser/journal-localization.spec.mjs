import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CONFIG } from '../../js/config.js';
import { journalText } from '../../js/journal-i18n.js';

for (const locale of ['en','ar','ku','tr']) {
  test(`Demo journal translates completely in ${locale} and preserves consent and selections`, async ({page}) => {
    await page.goto('/open-journal-checker/');
    await expect(page.locator('#journal-website')).toHaveAttribute('href','https://mwsjournal.com/');
    await page.locator('#article-type').selectOption(DEFAULT_CONFIG.articleTypes[0]);
    await page.locator('#subject').selectOption(DEFAULT_CONFIG.subjects[0].name);
    await page.locator('#confirmations input').first().check();
    await page.locator('#language').selectOption(locale);
    await expect(page.locator('#journal-name')).toHaveText(journalText(locale,'name',DEFAULT_CONFIG.journalName));
    await expect(page.locator('#guidance')).toHaveText(journalText(locale,'guidance',DEFAULT_CONFIG.extraGuidance));
    await expect(page.locator('#article-type')).toHaveValue(DEFAULT_CONFIG.articleTypes[0]);
    await expect(page.locator('#subject')).toHaveValue(DEFAULT_CONFIG.subjects[0].name);
    for (const [index,value] of DEFAULT_CONFIG.articleTypes.entries()) {
      await expect(page.locator('#article-type option').nth(index+1)).toHaveText(journalText(locale,'article',value));
    }
    for (const [index,value] of DEFAULT_CONFIG.subjects.entries()) {
      await expect(page.locator('#subject option').nth(index+1)).toHaveText(journalText(locale,'subject',value.name));
    }
    for (const [index,value] of DEFAULT_CONFIG.confirmations.entries()) {
      await expect(page.locator('#confirmations input').nth(index)).toHaveAccessibleName(journalText(locale,'confirmation',value));
    }
    await expect(page.locator('#confirmations input').first()).toBeChecked();
    await expect(page.locator('.footer a[href="https://ridwanmarqas.com/"]')).toHaveText('Ridwan Shamoun');
    const download=page.waitForEvent('download');
    await page.locator('#download-report').click();
    const html=await readFile(await (await download).path(),'utf8');
    for (const value of DEFAULT_CONFIG.confirmations) expect(html).toContain(journalText(locale,'confirmation',value));
    expect(html).toContain(journalText(locale,'article',DEFAULT_CONFIG.articleTypes[0]));
    await page.locator('#language').selectOption('en');
    await expect(page.locator('#confirmations input').first()).toBeChecked();
  });
}

test('Custom journal wording remains intact when changing language',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('open-journal-checker-config-v1',JSON.stringify({journalName:'Custom journal',confirmations:['Custom declaration','The manuscript is original and is not under review elsewhere.'],articleTypes:['Custom type'],extraGuidance:'Custom policy'})));
  await page.goto('/open-journal-checker/');
  await page.locator('#language').selectOption('ar');
  await expect(page.locator('#journal-name')).toHaveText('Custom journal');
  await expect(page.locator('#guidance')).toHaveText('Custom policy');
  await expect(page.locator('#confirmations input').first()).toHaveAccessibleName('Custom declaration');
  await expect(page.locator('#confirmations input').nth(1)).toHaveAccessibleName(journalText('ar','confirmation',DEFAULT_CONFIG.confirmations[0]));
  await expect(page.locator('#article-type option').nth(1)).toHaveText('Custom type');
});
