import { test, expect } from '@playwright/test';
import { docxFixture } from './fixtures.mjs';

test('A late hosted response cannot replace saved rules or renewed declarations',async({page})=>{
  let release;
  const intercepted=new Promise(r=>{release=r;});
  await page.route('**/journal-settings.json',route=>release(route));
  await page.goto('/open-journal-checker/');
  const hosted=await intercepted;
  await page.locator('#open-settings').click();
  await page.locator('[name=journalName]').fill('Locally edited journal');
  await page.locator('[type=submit]').click();
  await page.locator('#confirmations input').first().check();
  await hosted.fulfill({json:{journalName:'Stale hosted journal',confirmations:['Stale requirement']}});
  // Wait for fetch and JSON processing, not an arbitrary timeout.
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#journal-name')).toHaveText('Locally edited journal');
  await expect(page.locator('#confirmations input:checked')).toHaveCount(1);
});

test('Blocked browser storage still permits hosted defaults and session settings',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
  await page.route('**/journal-settings.json',route=>route.fulfill({json:{journalName:'Hosted defaults'}}));
  await page.goto('/open-journal-checker/');
  await expect(page.locator('#journal-name')).toHaveText('Hosted defaults');
  await page.locator('#open-settings').click();
  await page.locator('[name=journalName]').fill('Session journal');
  await page.locator('[type=submit]').click();
  await expect(page.locator('#journal-name')).toHaveText('Session journal');
  await expect(page.locator('#toast')).toContainText('this session only');
  await page.locator('#open-settings').click();
  await page.locator('#config-import').setInputFiles({name:'journal.json',mimeType:'application/json',buffer:Buffer.from('{"journalName":"Imported session journal"}')});
  await expect(page.locator('#journal-name')).toHaveText('Imported session journal');
  await page.locator('#config-reset').click();
  await expect(page.locator('#journal-name')).toHaveText('Open Journal Demo');
  expect(errors).toEqual([]);
});

test('Crossref rate-limit feedback permits retry and lookup stays opt-in',async({page})=>{
  let lookups=0;
  await page.route('https://api.crossref.org/works/*',route=>{lookups++;return route.fulfill({status:429,body:'Rate limit'});});
  await page.goto('/open-journal-checker/');
  await page.locator('#manuscript-file').setInputFiles({name:'synthetic.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docxFixture()});
  await expect(page.locator('#doi-zone')).toBeVisible();
  expect(lookups).toBe(0);
  await page.locator('#verify-doi').click();
  await expect(page.locator('#doi-result')).toContainText('limiting requests');
  await expect(page.locator('#verify-doi')).toBeEnabled();
  expect(lookups).toBe(1);
});
