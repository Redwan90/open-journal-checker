import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { translations, t, rtl } from '../js/i18n.js';
import { normalizeConfig } from '../js/config.js';
import { evaluate } from '../js/checker.js';

const placeholders = value => [...new Set(value.match(/\{\w+\}/g) || [])].sort();
test('All four locales explicitly cover the same keys and template parameters',()=>{
  const keys=Object.keys(translations.en).sort();
  for(const locale of ['en','ar','ku','tr']) {
    assert.deepEqual(Object.keys(translations[locale]).sort(),keys,locale);
    for(const key of keys) {
      assert.ok(translations[locale][key].trim(),`${locale}.${key}`);
      assert.deepEqual(placeholders(translations[locale][key]),placeholders(translations.en[key]),`${locale}.${key}`);
    }
  }
});

test('HTML text, placeholder and accessibility translation keys exist',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const [,key] of html.matchAll(/data-(?:i18n|placeholder|aria-label)="([^"]+)"/g)) assert.ok(translations.en[key],key);
});

test('Translation parameters remain literal and fallback remains available',()=>{
  assert.equal(t('en','verifyFound',{title:'<script>{count}</script>'}),'Crossref record found: <script>{count}</script>.');
  assert.equal(t('unknown','important'),'Important');
});

for(const locale of ['en','ar','ku','tr']) {
  test(`Downloaded ${locale} report uses its language and direction and escapes author content`,()=>{
    const source=readFileSync(new URL('../js/main.js',import.meta.url),'utf8')
      .replace(/^import .*;\r?\n/gm,'').replace("attach(); updateLanguage('en'); loadHostedConfig();",'');
    const context=vm.createContext({document:{},localStorage:{getItem:()=>null},normalizeConfig,t,rtl});
    vm.runInContext(source,context);
    const config=normalizeConfig({confirmations:['Original journal declaration <script>unsafe()</script>']});
    const manuscript={title:'<img src=x onerror=unsafe()>',abstract:'',keywords:'<b>keywords</b>',confirmed:[]};
    context.data={language:locale,generatedAt:'2026-11-23T08:00:00Z',journal:'Journal <svg onload=unsafe()>',manuscript,evaluation:evaluate(manuscript,config),fileInspection:null};
    const html=vm.runInContext('renderReportHtml(data)',context);
    assert.ok(html.includes(`lang="${locale}" dir="${rtl(locale)?'rtl':'ltr'}"`));
    assert.ok(html.includes(t(locale,'reportTitle')));
    assert.ok(html.includes(t(locale,'notInspected')));
    assert.ok(html.includes('&lt;img src=x onerror=unsafe()&gt;'));
    assert.ok(html.includes('Original journal declaration &lt;script&gt;unsafe()&lt;/script&gt;'));
    assert.equal(/<(?:script|img|svg)\b/.test(html),false);
  });
}
