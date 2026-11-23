// Opt-in check against an already configured OJS test journal; makes no OJS writes.
import assert from 'node:assert/strict';
import { chromium, firefox, expect } from '@playwright/test';
import { docxFixture, pdfFixture } from '../tests/browser/fixtures.mjs';
function requiredUrl(name) {
  if (!process.env[name]) throw new Error(`Set ${name} to your isolated test URL. See docs/OJS-INTEGRATION.md.`);
  const url=new URL(process.env[name]);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error(`${name} must be an HTTP(S) URL without credentials.`);
  return url;
}
const journal=requiredUrl('OJS_JOURNAL_URL'), checker=requiredUrl('CHECKER_URL'), submission=requiredUrl('OJS_SUBMISSION_URL');
if (journal.origin === checker.origin) throw new Error('This strict privacy smoke test requires distinct checker and OJS origins. Same-origin deployments need a static-asset allowlist.');
const engine=process.env.OJS_TEST_BROWSER || 'chromium';
if (!['chromium','firefox'].includes(engine)) throw new Error('OJS_TEST_BROWSER must be chromium or firefox.');
const browser=await ({chromium,firefox}[engine]).launch();
try {
  const context=await browser.newContext();
  const page=await context.newPage();
  const response=await page.goto(journal.href);assert.equal(response.status(),200);
  const link=page.getByRole('link',{name:process.env.OJS_CHECKER_LINK_TEXT || 'Prepare your manuscript',exact:true});
  assert.equal(await link.evaluate(el=>el.href),checker.href);
  await link.click();await expect(page).toHaveURL(checker.href);
  await page.locator('#language').selectOption('en');
  await expect(page.locator('#submission-url')).toHaveAttribute('href',submission.href);
  const sent=[];const record=request=>sent.push({url:request.url(),method:request.method(),body:request.postData() || ''});
  context.on('request',record);
  const marker='OJC_SYNTHETIC_PRIVATE_MANUSCRIPT_87421';
  await page.locator('#title').fill(marker);
  for (const [format,buffer] of [['docx',docxFixture()],['pdf',pdfFixture()]]) {
    await page.locator('#manuscript-file').setInputFiles({name:`${marker}.${format}`,mimeType:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer});
    await expect(page.locator('#file-info')).toContainText('Abstract heading: Detected');
    await expect(page.locator('#file-info')).toContainText('References heading: Detected');
  }
  assert.equal(sent.filter(request=>new URL(request.url).origin===journal.origin).length,0,'File inspection must not contact OJS.');
  await page.locator('#submission-url').scrollIntoViewIfNeeded();
  const [ojsPage]=await Promise.all([context.waitForEvent('page'),page.locator('#submission-url').click({timeout:10000})]);
  await ojsPage.waitForLoadState('domcontentloaded');await expect(ojsPage).toHaveURL(submission.href);
  assert.equal((await ojsPage.request.get(submission.href)).status(),200);
  assert.ok(sent.some(request=>request.url===submission.href && request.method==='GET' && !request.body));
  assert.ok(sent.every(request=>!request.url.includes(marker) && !request.body.includes(marker)),'Manuscript content and filename must stay local.');
  context.off('request',record);
  console.log(JSON.stringify({status:'pass',browser:engine,checks:['OJS navigation link','hosted journal return URL','local DOCX inspection','local PDF inspection','no OJS requests during inspection','return via GET without manuscript data']}));
} finally {await browser.close();}
