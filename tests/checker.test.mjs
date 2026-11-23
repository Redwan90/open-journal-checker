import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, parseSubjects } from '../js/config.js';
import { wordCount, parseKeywords, keywordsAlphabetical, scopeMatch, evaluate, extractDois, inspectText } from '../js/checker.js';

const config = normalizeConfig(DEFAULT_CONFIG);
const goodTitle = 'A Machine Learning Framework for Research Data Analysis';
const abstract = ('Machine learning systems can assist researchers with reliable data analysis and informed decisions. ').repeat(17).trim();
const good = {
 title:goodTitle, abstract, keywords:'Algorithm; Data; Machine learning',
 subject:'Computer Science & AI', articleType:'Research Article',
 confirmed: Array.from({length:10}, (_,i)=>i)
};
test('Unicode-aware word count including Arabic and Kurdish', () => {
 assert.equal(wordCount('Machine learning for health'), 4);
 assert.equal(wordCount('الذكاء الاصطناعي في البحث'), 4);
 assert.equal(wordCount(''), 0);
});
test('Keywords are parsed, sorted, and duplicates rejected', () => {
 assert.deepEqual(parseKeywords('Ethics; AI;  Data '),['Ethics','AI','Data']);
 assert.equal(keywordsAlphabetical(['AI','Data','Ethics']),true);
 assert.equal(keywordsAlphabetical(['Data','AI']),false);
 const r=evaluate({ ...good, keywords:'Algorithm; Algorithm; Data' },config);
 assert.equal(r.checks[2].pass,false);
});
test('Scope matching uses term boundaries and selected subject', () => {
 assert.equal(scopeMatch('A machine learning model', config.subjects[0]).matched,true);
 assert.equal(scopeMatch('An unrelated history review', config.subjects[0]).matched,false);
 assert.equal(scopeMatch('counterdata test', { terms:['data'] }).matched,false);
});
test('Full checklist has five metadata checks and ten declarations', () => {
 const r=evaluate(good,config);
 assert.equal(r.total,15);
 assert.equal(r.passed,15);
 assert.equal(r.percentage,100);
 assert.equal(r.checks.length,5);
});
test('Incomplete manuscript is not incorrectly scored as complete', () => {
 const r=evaluate({ title:'',abstract:'',keywords:'',subject:'',confirmed:[] },config);
 assert.equal(r.passed,0);
 assert.equal(r.total,15);
 assert.equal(r.percentage,0);
});
test('Config validation handles malicious or invalid URL protocols', () => {
 const c=normalizeConfig({journalName:'Test',guidelinesUrl:'javascript:alert(1)',submissionUrl:'data:text/html,hello',logoUrl:'https://example.com/logo.png',accent:'red', confirmations:['One']});
 assert.equal(c.guidelinesUrl,'');
 assert.equal(c.submissionUrl,'');
 assert.equal(c.logoUrl,'https://example.com/logo.png');
 assert.equal(c.accent,DEFAULT_CONFIG.accent);
 assert.equal(evaluate(good,c).total,6);
});
test('Configuration handles invalid ranges and subject text', () => {
 const c=normalizeConfig({ abstractMinWords:180, abstractMaxWords:10, keywordsMin:7, keywordsMax:2 });
 assert.equal(c.abstractMaxWords,180);
 assert.equal(c.keywordsMax,7);
 assert.deepEqual(parseSubjects('Medicine | drug, care\nInvalid line\nAI | model, network'), [
  {name:'Medicine',terms:['drug','care']}, {name:'AI',terms:['model','network']}
 ]);
});
test('Extract DOI patterns, avoiding duplicate prefixes and punctuation', () => {
 const dois=extractDois('See https://doi.org/10.1000/ABC123. Another DOI:10.1000/ABC123; and doi: 10.5555/test-one');
 assert.deepEqual(dois,['10.1000/ABC123','10.5555/test-one']);
});

test('DOI extraction removes citation parentheses, preserves balanced suffixes and deduplicates case',()=>{
 assert.deepEqual(extractDois('(https://doi.org/10.1000/ABC). doi:10.1000/abc;'),['10.1000/ABC']);
 assert.deepEqual(extractDois('(10.1000/item(part)). 10.1000/next'),['10.1000/item(part)','10.1000/next']);
 assert.deepEqual(extractDois('110.1000/not-a-doi'),[]);
 assert.deepEqual(extractDois('10.1000/item'+')'.repeat(100000)),['10.1000/item']);
});
test('Detect document sections from plain text', () => {
 const r=inspectText('Abstract\nSome results\nKeywords: AI; Health\nMethods\nAnalysis\nReferences\nAuthor 10.1234/abc');
 assert.equal(r.headings.abstract,true);
 assert.equal(r.headings.references,true);
 assert.deepEqual(r.dois,['10.1234/abc']);
});

test('Notes contribute DOI patterns and words without becoming body headings',()=>{
 const result=inspectText('Body text\nMethods\n10.1234/note','Body text');
 assert.equal(result.headings.methods,false);
 assert.deepEqual(result.dois,['10.1234/note']);
 assert.ok(result.words>2);
});

test('Turkish translations exist and use left-to-right layout', async () => {
 const { t, rtl } = await import('../js/i18n.js');
 assert.equal(t('tr', 'settings'), 'Dergi ayarları');
 assert.equal(t('tr', 'report'), 'Raporu indir');
 assert.equal(t('tr', 'filePick'), 'Makale dosyası seçin');
 assert.equal(rtl('tr'), false);
 assert.equal(rtl('ar'), true);
 assert.equal(rtl('ku'), true);
});
