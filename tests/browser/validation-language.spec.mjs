import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {t} from '../../js/i18n.js';
const rules={journalName:'Language test',subjects:[{name:'Light',terms:['IŞIK','İZMİR']}],confirmations:['Original declaration']};
const jsonReport=async page=>{const download=page.waitForEvent('download');await page.locator('#download-json').click();return JSON.parse(await readFile(await (await download).path(),'utf8'));};
for(const locale of ['en','ar','ku','tr'])test(`Manuscript language controls validation independently of the ${locale} interface`,async({page})=>{
 await page.addInitScript(rules=>localStorage.setItem('open-journal-checker-config-v1',JSON.stringify(rules)),rules);
 await page.goto('/built/');await page.locator('#language').selectOption(locale);
 await expect(page.locator('#manuscript-language')).toHaveAccessibleName(t(locale,'manuscriptLanguage'));
 await page.locator('#subject').selectOption('Light');await page.locator('#manuscript-language').selectOption('tr');
 await page.locator('#title').fill('ışık');await page.locator('#keywords').fill('ırmak; izmir; veri');await page.locator('#confirmations input').first().check();
 await expect(page.locator('#checks .check-row').nth(3)).toHaveClass(/is-good/);await expect(page.locator('#checks .check-row').nth(4)).toHaveClass(/is-good/);
 const score=await page.locator('#summary-count').textContent();
 for(const display of ['en','ar','ku','tr']){await page.locator('#language').selectOption(display);await expect(page.locator('#manuscript-language')).toHaveValue('tr');await expect(page.locator('#summary-count')).toHaveText(score);await expect(page.locator('#confirmations input').first()).toBeChecked();}
 await page.locator('#language').selectOption(locale);const report=await jsonReport(page);
 expect(report.manuscript.manuscriptLanguage).toBe('tr');expect(report.evaluation.manuscriptLanguage).toBe('tr');expect(report.evaluation.keywordLocale).toBe('tr');expect(report.evaluation.scope.matches).toContain('IŞIK');expect(report.manuscript.title).toBe('ışık');
 await page.locator('#manuscript-language').selectOption('en');await expect(page.locator('#checks .check-row').nth(3)).not.toHaveClass(/is-good/);await expect(page.locator('#checks .check-row').nth(4)).not.toHaveClass(/is-good/);
 await expect(page.locator('#confirmations input').first()).toBeChecked();
 await page.locator('#keywords').fill('cizre; çay; dar');await page.locator('#manuscript-language').selectOption('ku');
 await expect(page.locator('#validation-note')).toBeHidden();expect((await jsonReport(page)).evaluation.keywordOrderingMethod).toBe('hawar-v1');
 await page.locator('#manuscript-language').selectOption('ku-Arab');await expect(page.locator('#validation-note')).toHaveText(t(locale,'validationOrderNote'));await expect(page.locator('#validation-note')).toBeVisible();
 expect((await jsonReport(page)).evaluation.keywordLocale).toBe('ar');
 const download=page.waitForEvent('download');await page.locator('#download-report').click();const html=await readFile(await (await download).path(),'utf8');expect(html).toContain(t(locale,'validationKurdishArabic'));expect(html).toContain(t(locale,'validationOrderNote'));
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#clear').click();await expect(page.locator('#manuscript-language')).toHaveValue('en');await expect(page.locator('#validation-note')).toBeHidden();
});

test('Subject comparisons handle extracted whitespace and canonical spelling without substring false positives',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('open-journal-checker-config-v1',JSON.stringify({subjects:[{name:'Scope',terms:['résumé','machine learning','بيانات','data']}]})));
 await page.goto('/built/');await page.locator('#subject').selectOption('Scope');
 for(const title of ['re\u0301sume\u0301','machine\tlearning','بَيَانَات']){await page.locator('#title').fill(title);await expect(page.locator('#checks .check-row').nth(4)).toHaveClass(/is-good/);expect((await jsonReport(page)).manuscript.title).toBe(title);}
 await page.locator('#title').fill('');await page.locator('#abstract').fill('machine\nlearning');await expect(page.locator('#checks .check-row').nth(4)).toHaveClass(/is-good/);
 await page.locator('#abstract').fill('data\u0338base');await expect(page.locator('#checks .check-row').nth(4)).not.toHaveClass(/is-good/);
});


test('Native Kurdish Latin and Arabic ordering and Turkish uniqueness use the chosen language',async({page})=>{
 await page.goto('/built/');
 for(const [language,keywords,pass] of [['ku','cizre; çay; dar',true],['en','cizre; çay; dar',false],['ar','بحث؛ بيانات؛ تعليم',true]]){
  await page.locator('#manuscript-language').selectOption(language);await page.locator('#keywords').fill(keywords);
  const supported=language==='ku' || await page.evaluate(language=>Intl.Collator.supportedLocalesOf([language]).length>0,language);
  if(pass && supported)await expect(page.locator('#checks .check-row').nth(3)).toHaveClass(/is-good/);else await expect(page.locator('#checks .check-row').nth(3)).not.toHaveClass(/is-good/);
  if(!supported){await expect(page.locator('#validation-note')).toHaveText(t('en','validationUnavailable'));const report=await jsonReport(page);expect(report.evaluation.keywordOrderAvailable).toBe(false);expect(report.evaluation.keywordLocale).toBeNull();expect(report.evaluation.keywordOrderWarning).toBe(t('en','validationUnavailable'));}
 }
 await page.locator('#manuscript-language').selectOption('tr');await page.locator('#keywords').fill('IŞIK; ışık; veri');await expect(page.locator('#checks .check-row').nth(2)).not.toHaveClass(/is-good/);
 await page.locator('#keywords').fill('IŞIK; işik; veri');await expect(page.locator('#checks .check-row').nth(2)).toHaveClass(/is-good/);
});


test('Portable Kurdish ordering rejects inversions and exposes mixed-script limits in reports',async({page})=>{
 await page.goto('/built/');await page.locator('#manuscript-language').selectOption('ku');
 await page.locator('#keywords').fill('cizre; çay; dar');await expect(page.locator('#checks .check-row').nth(3)).toHaveClass(/is-good/);
 await page.locator('#keywords').fill('çay; cizre; dar');await expect(page.locator('#checks .check-row').nth(3)).not.toHaveClass(/is-good/);
 await page.locator('#keywords').fill('cizre; پوختە; dar');await expect(page.locator('#validation-note')).toHaveText(t('en','validationUnavailable'));
 const report=await jsonReport(page);expect(report.evaluation.keywordOrderAvailable).toBe(false);expect(report.evaluation.keywordOrderingMethod).toBeNull();expect(report.manuscript.keywords).toBe('cizre; پوختە; dar');
});
