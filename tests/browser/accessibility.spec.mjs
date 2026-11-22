import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
import { docxFixture, pdfFixture } from './fixtures.mjs';

test.beforeEach(async({page})=>{
  await page.goto('/open-journal-checker/');
  await expect(page.locator('#summary-total')).toHaveText('15');
  await expect(page.locator('#subject option')).toHaveCount(5);
});

for(const language of ['en','ar','ku','tr']) {
  test(`320px reflow and settings dialog in ${language}`,async({page})=>{
    await page.setViewportSize({width:320,height:800});
    await page.locator('#language').selectOption(language);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('#open-settings')).toBeInViewport();
    await page.locator('#open-settings').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('#open-settings')).toBeFocused();
  });
}

test('Configuration import is reachable with Tab and opens using Enter',async({page})=>{
  await page.locator('#open-settings').click();
  // Start from the preceding action, then use the actual keyboard order.
  await page.locator('#config-export').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Import journal JSON',exact:true})).toBeFocused();
  const chooser=page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  expect(await chooser).toBeTruthy();
});

test('Manuscript file picker has a visible focus indicator',async({page})=>{
  await page.locator('#keywords').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#manuscript-file')).toBeFocused();
  expect(await page.locator('.drop-zone').evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
});

test('Default page and settings have no automated WCAG A/AA violations',async({page})=>{
  const scan=()=>new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const result=await scan();
  expect(result.violations).toEqual([]);
  await page.locator('#open-settings').click();
  const settings=await scan();
  expect(settings.violations).toEqual([]);
});

test('Real hosted modules and CSP support scoring, reports and declaration resets',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
  const policy=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  const scripts=policy.split(';').find(d=>d.trim().startsWith('script-src '));
  expect(scripts).toContain("'self'");
  expect(scripts).not.toContain("'unsafe-inline'");
  expect(scripts).not.toContain("'unsafe-eval'");
  await page.locator('#title').fill('A Machine Learning Framework for Research Data Analysis');
  await page.locator('#abstract').fill('Machine learning systems assist researchers with reliable data analysis and decisions. '.repeat(20));
  await page.locator('#keywords').fill('Algorithm; Data; Machine learning');
  await page.locator('#subject').selectOption('Computer Science & AI');
  for(const checkbox of await page.locator('#confirmations input').all()) await checkbox.check();
  await expect(page.locator('#summary-count')).toHaveText('15');
  const download=page.waitForEvent('download');
  await page.locator('#download-report').click();
  expect((await download).suggestedFilename()).toBe('manuscript-preparation-report.html');
  await page.locator('#language').selectOption('tr');
  await expect(page.locator('#confirmations input:checked')).toHaveCount(10);
  await page.locator('#open-settings').click();
  await page.locator('[name=confirmations]').fill('A different declaration.');
  await page.locator('[type=submit]').click();
  await expect(page.locator('#confirmations input:checked')).toHaveCount(0);
  await expect(page.locator('#summary-count')).toHaveText('5');
  expect(errors).toEqual([]);
});

for(const type of ['docx','pdf']) {
  test(`Inspect a synthetic ${type.toUpperCase()} locally with CSP enabled`,async({page})=>{
    const requests=[];
    page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
    // Supply the exact pinned PDF.js distribution locally for deterministic,
    // offline CI. The production CDN URLs and CSP are unchanged.
    await page.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/*',async route=>{
      const name=new URL(route.request().url()).pathname.split('/').pop();
      if(!['pdf.min.mjs','pdf.worker.min.mjs'].includes(name)) throw new Error('Unexpected PDF asset');
      await route.fulfill({path:resolve('node_modules/pdfjs-dist/build',name),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
    });
    await page.locator('#manuscript-file').setInputFiles({name:`synthetic.${type}`,mimeType:type==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:type==='pdf'?pdfFixture():docxFixture()});
    await expect(page.locator('#file-info')).toContainText(`synthetic.${type}`);
    await expect(page.locator('#file-info')).toContainText('Abstract heading: Detected');
    await expect(page.locator('#file-info')).toContainText('Methods heading: Detected');
    await expect(page.locator('#file-info')).toContainText('10.1234/synthetic');
    await expect(page.locator('#doi-zone')).toBeVisible();
    // Local endpoint security can add its own telemetry. Check application
    // origins without disabling or changing that software.
    const applicationRequests=requests.filter(r=>/^(http:\/\/127\.0\.0\.1:8765\/|https:\/\/(cdn\.jsdelivr\.net|api\.crossref\.org)\/)/.test(r.url));
    expect(applicationRequests.every(r=>r.method==='GET')).toBe(true);
    expect(requests.some(r=>r.url.includes('api.crossref.org'))).toBe(false);
    await page.locator('#clear').click();
    await expect(page.locator('#file-info')).toHaveText('No manuscript inspected yet.');
    await expect(page.locator('#doi-zone')).toBeHidden();
  });
}
