import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, DEFAULT_CONFIG } from '../js/config.js';
import { journalText } from '../js/journal-i18n.js';

const preset={journalName:'Custom journal',extraGuidance:'Custom guidance',articleTypes:['Research','Review'],subjects:[{name:'Science',terms:['data']}],confirmations:['First declaration','Second declaration'],translations:{ar:{name:{'Custom journal':'مجلة مخصصة'},guidance:{'Custom guidance':'تعليمات مخصصة'},article:{Research:'بحث'},subject:{Science:'علوم'},confirmation:{'First declaration':'الإقرار الأول','Second declaration':'الإقرار الثاني'}}}};
test('Custom translations round-trip with canonical source values and missing-language fallback',()=>{
 const config=normalizeConfig(preset);
 assert.deepEqual(normalizeConfig(JSON.parse(JSON.stringify(config))),config);
 assert.equal(journalText('ar','name',config.journalName,config.translations),'مجلة مخصصة');
 assert.equal(journalText('ar','article','Research',config.translations),'بحث');
 assert.equal(journalText('ar','article','Review',config.translations),'Review');
 assert.equal(journalText('tr','name',config.journalName,config.translations),'Custom journal');
 assert.deepEqual(config.articleTypes,['Research','Review']);
});
test('Reordered declarations retain their own translations; edited and removed text loses stale translations',()=>{
 const reordered=normalizeConfig({...preset,confirmations:['Second declaration','First declaration']});
 assert.equal(journalText('ar','confirmation',reordered.confirmations[0],reordered.translations),'الإقرار الثاني');
 const edited=normalizeConfig({...preset,confirmations:['Changed declaration']});
 assert.equal(edited.translations.ar.confirmation,undefined);
 assert.equal(journalText('ar','confirmation','Changed declaration',edited.translations),'Changed declaration');
});
test('Translation validation ignores unknown languages, arrays, nonstrings and absent sources and bounds long text',()=>{
 const config=normalizeConfig({...preset,translations:{fr:{name:{'Custom journal':'French'}},ar:{name:{'Custom journal':'x'.repeat(500)},guidance:[],confirmation:{'First declaration':42,'Second declaration':' ',Unknown:'not a rule'}}}});
 assert.equal(config.translations.fr,undefined);
 assert.equal(config.translations.ar.name['Custom journal'].length,100);
 assert.equal(config.translations.ar.confirmation,undefined);
 assert.equal(config.translations.ar.guidance,undefined);
 assert.deepEqual(normalizeConfig({}).translations,{});
 const overridden=normalizeConfig({translations:{ar:{name:{[DEFAULT_CONFIG.journalName]:'اختيار المجلة'}}}});
 assert.equal(journalText('ar','name',DEFAULT_CONFIG.journalName,overridden.translations),'اختيار المجلة');
});
test('Prototype-shaped source text stays plain data and cannot pollute configuration',()=>{
 const input=JSON.parse('{"confirmations":["__proto__"],"translations":{"ar":{"confirmation":{"__proto__":"نص عادي"}}}}');
 const config=normalizeConfig(input);
 assert.equal(journalText('ar','confirmation','__proto__',config.translations),'نص عادي');
 assert.equal(Object.getPrototypeOf(config.translations.ar.confirmation),Object.prototype);
 assert.equal({}.polluted,undefined);
});
