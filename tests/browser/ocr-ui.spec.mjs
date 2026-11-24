import {test,expect} from '@playwright/test';
import {scannedPdfFixture} from './fixtures.mjs';
import {t} from '../../js/i18n.js';
for(const language of ['en','ar','ku','tr'])test(`OCR controls, loading and cancellation translate and reflow in ${language}`,async({page,context})=>{
 test.setTimeout(60000);await page.goto('/built/');await page.setViewportSize({width:320,height:800});
 await page.locator('#language').selectOption(language);
 await page.locator('#manuscript-file').setInputFiles({name:'scan.pdf',mimeType:'application/pdf',buffer:await scannedPdfFixture(page)});
 await expect(page.locator('#ocr-zone')).toBeVisible({timeout:30000});
 await expect(page.locator('#start-ocr')).toHaveText(t(language,'ocrStart'));
 await expect(page.locator('#ocr-language')).toHaveAccessibleName(t(language,'ocrLanguage'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 let held;const reached=new Promise(resolve=>held=resolve);
 await context.route('**/vendor/ocr/worker.min.js',route=>held(route));
 await page.locator('#start-ocr').click();const resource=await reached;
 await expect(page.locator('#ocr-status')).toHaveText(t(language,'ocrLoading'));
 await page.locator('#cancel-ocr').click();await expect(page.locator('#ocr-status')).toHaveText(t(language,'ocrCancelled'));
 await expect(page.locator('#start-ocr')).toBeFocused();try{await resource.abort();}catch{}
});
