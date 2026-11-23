import { test, expect } from '@playwright/test';
import { t } from '../../js/i18n.js';
for(const locale of ['en','ar','ku','tr']) test(`Section shortcuts explain editable rules in ${locale} and focus the relevant settings`,async({page})=>{
 await page.goto('/open-journal-checker/');await page.locator('#language').selectOption(locale);
 await page.setViewportSize({width:320,height:800});
 const targets={articleTypes:'metadataSettingsHint',confirmations:'declarationSettingsHint',extraGuidance:'guidanceSettingsHint'};
 await page.locator('#confirmations input').first().check();
 for(const [field,key] of Object.entries(targets)) {
  const button=page.locator(`[data-settings-target=${field}]`);
  await expect(button).toHaveText(t(locale,'changeSettings'));
  await expect(button.locator('..')).toContainText(t(locale,key));
  await button.scrollIntoViewIfNeeded();await button.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator(`[name=${field}]`)).toBeFocused();
  await expect(page.locator(`[name=${field}]`)).toBeInViewport();
  await page.keyboard.press('Escape');await expect(button).toBeFocused();
  await expect(page.locator('#confirmations input').first()).toBeChecked();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
