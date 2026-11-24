import test from 'node:test';
import assert from 'node:assert/strict';
import {createKurdishLatinCollator} from '../js/kurdish-collation.js';
import {evaluate} from '../js/checker.js';import {normalizeConfig} from '../js/config.js';
const alphabet=[...'abcçdeêfghiîjklmnopqrsştuûvwxyz'];
test('Portable Hawar ordering covers every letter, prefixes, case and Unicode decomposition',()=>{
 const words=[...alphabet,'cizre','çay','car','cz','c','ê','é','î','í','û','ú','ù','ḧ','h','ẍ','x'];const collation=createKurdishLatinCollator(words);
 for(let i=1;i<alphabet.length;i++)assert.ok(collation.compare(alphabet[i-1],alphabet[i])<0);
 for(const word of words){assert.equal(collation.compare(word,word.toUpperCase()),0);assert.equal(collation.compare(word,word.normalize('NFD')),0);}
 for(const [a,b] of [['ê','é'],['î','í'],['û','ú'],['û','ù'],['ḧ','h'],['ẍ','x']])assert.equal(collation.compare(a,b),0);
 assert.ok(collation.compare('cizre','çay')<0);assert.ok(collation.compare('c','car')<0);assert.ok(collation.compare('cz','çay')<0);
});
test('Portable tailoring agrees with native Kurdish primary collation on a reproducible representative corpus',()=>{
 assert.ok(Intl.Collator.supportedLocalesOf(['ku']).length,'Reference ICU must provide Kurdish collation');
 let state=37;const random=()=>{state=(state*1664525+1013904223)>>>0;return state;};
 const letters=[...alphabet,'é','í','ú','ù','ḧ','ẍ'];const words=[...alphabet,'cizre','çay','rêbazên lêkolînê','jêder','peyvên sereke','AI-2','AI 3',"c'ar"];
 for(let i=0;i<500;i++){let word='';for(let j=0,n=1+random()%12;j<n;j++)word+=letters[random()%letters.length];words.push(i%3===0?word.toUpperCase():word);}
 const portable=createKurdishLatinCollator(words),native=new Intl.Collator('ku',{usage:'sort',sensitivity:'base'});
 for(let i=0;i<2000;i++){const a=words[random()%words.length],b=words[random()%words.length];assert.equal(Math.sign(portable.compare(a,b)),Math.sign(native.compare(a,b)),JSON.stringify({a,b}));}
});
test('Kurdish ordering works without a native Kurdish locale and records the portable method',()=>{
 const original=Intl.Collator.supportedLocalesOf;Intl.Collator.supportedLocalesOf=locales=>original.call(Intl.Collator,locales.filter(x=>x!=='ku'));
 try {const result=evaluate({manuscriptLanguage:'ku',keywords:'cizre; çay; dar'},normalizeConfig());assert.equal(result.keywordOrderAvailable,true);assert.equal(result.keywordOrderingMethod,'hawar-v1');assert.equal(result.keywordLocale,'ku');assert.equal(result.checks[3].pass,true);}finally{Intl.Collator.supportedLocalesOf=original;}
});
test('Unhandled scripts and isolated marks remain pending and preserve entered keywords',()=>{
 for(const text of ['پوختە','α','\u0301','ı'])assert.equal(createKurdishLatinCollator(['cizre',text]),null,text);
 const keywords='cizre; پوختە; dar',result=evaluate({manuscriptLanguage:'ku',keywords},normalizeConfig());assert.equal(result.keywordOrderAvailable,false);assert.equal(result.keywordLocale,null);assert.equal(result.checks[3].pass,false);assert.deepEqual(result.keywords,['cizre','پوختە','dar']);
});
