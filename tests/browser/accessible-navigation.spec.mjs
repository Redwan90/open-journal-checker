import { test, expect } from '@playwright/test';
import { t, rtl } from '../../js/i18n.js';

test('The first keyboard stop bypasses the header and moves focus into the manuscript form',async({page})=>{
 await page.goto('/open-journal-checker/');await page.keyboard.press('Tab');
 await expect(page.locator('.skip-link')).toBeFocused();await expect(page.locator('.skip-link')).toBeInViewport();
 await page.keyboard.press('Enter');await expect(page.locator('#manuscript-fields')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-settings-target=articleTypes]')).toBeFocused();
});

for(const locale of ['en','ar','ku','tr']) {
 test(`Stable field names, separate instructions and meaningful progress in ${locale}`,async({page})=>{
  await page.goto('/open-journal-checker/');await page.locator('#language').selectOption(locale);
  for(const id of ['title','abstract','keywords']) await expect(page.locator('#'+id)).toHaveAccessibleName(t(locale,id));
  await expect(page.locator('#manuscript-file')).toHaveAccessibleName(t(locale,'filePick'));
  await expect(page.locator('#manuscript-file')).toHaveAccessibleDescription(new RegExp(t(locale,'fileHelp').slice(0,15)));
  await page.locator('#title').fill('Alpha Beta');
  await expect(page.locator('#title')).toHaveAccessibleName(t(locale,'title'));
  await expect(page.locator('#title')).toHaveAccessibleDescription(new RegExp(`2 ${t(locale,'words')}`));
  await expect(page.locator('#checks .check-row').first().getByRole('img')).toHaveAccessibleName(t(locale,'pass'));
  await expect(page.getByRole('heading',{name:t(locale,'step4'),exact:true})).toHaveAttribute('id','summary-heading');
  const score=page.getByRole('progressbar',{name:t(locale,'step4'),exact:true});
  await expect(score).toHaveAttribute('aria-valuemax','15');await expect(score).toHaveAttribute('aria-valuenow','1');
  await expect(score).toHaveAttribute('aria-valuetext',t(locale,'progressValue',{passed:1,total:15,percentage:7}));
  await page.locator('#confirmations input').first().check();
  await expect(page.locator('#confirmation-progress')).toHaveAttribute('aria-valuetext',t(locale,'progressValue',{passed:1,total:10,percentage:10}));
  await page.locator('#open-settings').click();await page.locator('[name=confirmations]').fill('One custom declaration');await page.locator('#settings-form [type=submit]').click();
  await expect(score).toHaveAttribute('aria-valuemax','6');await expect(score).toHaveAttribute('aria-valuenow','1');
  await expect(page.locator('#confirmation-progress')).toHaveAttribute('aria-valuemax','1');await expect(page.locator('#confirmation-progress')).toHaveAttribute('aria-valuenow','0');
 });
 test(`Text spacing at narrow width and enlarged text keep ${locale} controls usable`,async({page})=>{
  await page.setViewportSize({width:320,height:800});await page.goto('/open-journal-checker/');await page.locator('#language').selectOption(locale);
  await page.addStyleTag({content:`*{line-height:1.5!important;word-spacing:.16em!important;${rtl(locale)?'':'letter-spacing:.12em!important;'}}p{margin-block-end:2em!important}`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#open-settings').click();await page.locator('#journal-translations summary').click();
  expect(await page.locator('#settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.locator('#translation-language').selectOption(locale);await page.locator('#translation-fields [data-kind=name]').fill('Synthetic translated title');
  await page.locator('#settings-form [type=submit]').click();
  await page.locator('#language').selectOption(locale);
  // Simulate text-only enlargement from a single computed-style snapshot.
  await page.evaluate(()=>{
   const sizes=[...document.querySelectorAll('body *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
   for(const [el,size] of sizes) el.style.fontSize=`${size*2}px`;
  });
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-settings-target=confirmations]').click();await expect(page.locator('[name=confirmations]')).toBeFocused();
  expect(await page.locator('#settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.locator('#close-settings').click();await expect(page.locator('[data-settings-target=confirmations]')).toBeFocused();
 });
}

test('Built release preserves keyboard bypass, field descriptions and progress values',async({page})=>{
 await page.goto('/built/');await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.locator('#manuscript-fields')).toBeFocused();
 await expect(page.locator('#manuscript-file')).toHaveAccessibleName(t('en','filePick'));
 await expect(page.locator('#manuscript-file')).toHaveAccessibleDescription(new RegExp(t('en','fileLimitLocal').slice(0,12)));
 await page.locator('#title').fill('Alpha Beta');await expect(page.locator('#title')).toHaveAccessibleName('Manuscript title');
 await expect(page.locator('#readiness-progress')).toHaveAttribute('aria-valuenow','1');
});
