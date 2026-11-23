import { test, expect } from '@playwright/test';
import { docxFixture } from './fixtures.mjs';
for(const path of ['/open-journal-checker/','/built/']) for(const locale of ['en','ar','ku','tr']) test(`Journal return link is clickable after inspection in ${locale} at ${path}`,async({page,context})=>{
 const target='http://127.0.0.1:8765/synthetic-ojs-submissions';
 await page.route('**/journal-settings.json',route=>route.fulfill({json:{submissionUrl:target}}));
 await context.route(target,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic submissions</title><h1>OJS return target</h1>'}));
 await page.setViewportSize({width:1280,height:720});
 await page.goto(path);await page.locator('#language').selectOption(locale);
 await page.locator('#manuscript-file').setInputFiles({name:'synthetic.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docxFixture()});
 await expect(page.locator('#file-info')).toContainText('synthetic.docx');
 await expect(page.locator('#submission-url')).toHaveAttribute('href',target);
 const popup=context.waitForEvent('page');await page.locator('#submission-url').click();
 const returned=await popup;await expect(returned.getByRole('heading')).toHaveText('OJS return target');
});
