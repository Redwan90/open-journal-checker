import { journalText } from '../js/journal-i18n.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, normalizeConfig, parseSubjects } from '../js/config.js';
import { evaluate } from '../js/checker.js';
import { VERSION } from '../js/version.js';

function app(fetch = async () => ({ok:false}), storage = {getItem:()=>null,setItem(){},removeItem(){}}) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {value:'', files:[], listeners:{},
      addEventListener(event,fn){this.listeners[event]=fn;},
      classList:{toggle(){}},close(){},replaceChildren(){}});
    return nodes.get(id);
  };
  const source = readFileSync(new URL('../js/main.js',import.meta.url),'utf8')
    .replace(/^import .*;\r?\n/gm,'').replace("attach(); updateLanguage('en'); loadHostedConfig();",'');
  const context=vm.createContext({journalText,
    document:{getElementById:node,documentElement:{},querySelectorAll:()=>[]},
    localStorage:storage,
    DEFAULT_CONFIG,normalizeConfig,parseSubjects,evaluate,fetch,VERSION,
    t:(_,key)=>key,rtl:()=>false,setTimeout:()=>0,clearTimeout(){}
  });
  vm.runInContext(source + `
    renderJournal = () => {};
    openSettings = () => {};
    update = () => evaluate(getManuscript(),config);
    attach();
  `,context);
  const run=code=>vm.runInContext(code,context);
  const seed=()=>run("config = normalizeConfig({confirmations:['Original declaration','Another declaration']}); confirmationSet = new Set([0,1]);");
  function save(confirmations) {
    const c=normalizeConfig({confirmations});
    const fields=Object.fromEntries(Object.entries(c).map(([key,value])=>[key,{value}]));
    fields.articleTypes.value=c.articleTypes.join('\n');
    fields.subjects.value=c.subjects.map(s=>`${s.name} | ${s.terms.join(', ')}`).join('\n');
    fields.confirmations.value=confirmations.join('\n');
    node('settings-form').elements=fields;
    run('saveSettings({preventDefault(){}})');
  }
  return {node,run,seed,save,confirmed:()=>run('confirmationSet.size')};
}

test('Saving replacement declarations clears confirmations and report scores',()=>{
  const a=app(); a.seed(); a.save(['New ethics requirement','New funding requirement']);
  assert.equal(a.confirmed(),0);
  assert.equal(a.run('reportData().manuscript.confirmed.length'),0);
  assert.equal(a.run('reportData().evaluation.confirmations.some(c=>c.pass)'),false);
});

test('Saving reordered, shorter, or unchanged declarations always requires renewed confirmation',()=>{
  const a=app();
  for(const declarations of [
    ['Another declaration','Original declaration'], ['Original declaration'],
    ['Original declaration','Another declaration']
  ]) { a.seed(); a.save(declarations); assert.equal(a.confirmed(),0); }
});

test('Importing configuration clears checked declarations',async()=>{
  const a=app(); a.seed();
  const target={files:[{size:50,text:async()=>JSON.stringify({confirmations:['New declaration']})}],value:'config.json'};
  await a.node('config-import').listeners.change({target});
  assert.equal(a.confirmed(),0);
  assert.equal(a.run('config.confirmations[0]'),'New declaration');
});

test('Resetting configuration clears checked declarations',()=>{
  const a=app(); a.seed(); a.node('config-reset').listeners.click();
  assert.equal(a.confirmed(),0);
  assert.equal(a.run('config.confirmations[0]'),DEFAULT_CONFIG.confirmations[0]);
});

test('Hosted configuration clears confirmations made before loading finished',async()=>{
  let resolve;
  const response=new Promise(r=>{resolve=r;});
  const a=app(()=>response); a.seed();
  const loading=a.run('loadHostedConfig()');
  resolve({ok:true,json:async()=>({confirmations:['Hosted declaration']})}); await loading;
  assert.equal(a.confirmed(),0);
  assert.equal(a.run('config.confirmations[0]'),'Hosted declaration');
});

test('Invalid imported configuration preserves current rules and confirmations',async()=>{
  const a=app(); a.seed();
  const target={files:[{size:10,text:async()=>'[]'}],value:'bad.json'};
  await a.node('config-import').listeners.change({target});
  assert.equal(a.confirmed(),2);
  assert.equal(a.run('config.confirmations[0]'),'Original declaration');
});

test('Language switching preserves existing confirmations',()=>{
  const a=app(); a.seed();
  a.run("updateLanguage('tr')");
  assert.equal(a.confirmed(),2);
});

for(const action of ['save','import','reset']) {
  test(`Late hosted JSON cannot overwrite a local ${action} or renewed confirmation`,async()=>{
    let resolve;
    const pending=new Promise(r=>{resolve=r;});
    const a=app(async()=>({ok:true,json:()=>pending})); a.seed();
    const loading=a.run('loadHostedConfig()'); await Promise.resolve();
    if(action==='save') a.save(['Local declaration']);
    else if(action==='reset') a.node('config-reset').listeners.click();
    else await a.node('config-import').listeners.change({target:{files:[{size:50,text:async()=>'{"confirmations":["Imported declaration"]}'}],value:'config.json'}});
    const expected=a.run('config.confirmations[0]');
    a.run('confirmationSet.add(0)');
    resolve({confirmations:['Stale hosted declaration']}); await loading;
    assert.equal(a.run('config.confirmations[0]'),expected);
    assert.equal(a.confirmed(),1);
  });
}

test('Hosted JSON respects a storage override created by another tab',async()=>{
  let resolve, stored=null;
  const pending=new Promise(r=>{resolve=r;});
  const a=app(async()=>({ok:true,json:()=>pending}),{getItem:()=>stored});
  const loading=a.run('loadHostedConfig()'); await Promise.resolve();
  stored='{"journalName":"Other tab"}';
  resolve({journalName:'Late hosted journal'}); await loading;
  assert.equal(a.run('config.journalName'),DEFAULT_CONFIG.journalName);
});

test('Blocked storage reads do not stop hosted defaults from loading',async()=>{
  const a=app(async()=>({ok:true,json:async()=>({journalName:'Hosted journal'})}),{getItem(){throw new Error('Blocked');}});
  await a.run('loadHostedConfig()');
  assert.equal(a.run('config.journalName'),'Hosted journal');
});

test('Failed storage writes and removal still apply save, import and reset in memory',async()=>{
  const a=app(undefined,{getItem:()=>null,setItem(){throw new Error('Quota');},removeItem(){throw new Error('Blocked');}});
  a.save(['Session declaration']);
  assert.equal(a.run('config.confirmations[0]'),'Session declaration');
  assert.equal(a.node('toast').textContent,'storageUnavailable');
  await a.node('config-import').listeners.change({target:{files:[{size:50,text:async()=>'{"confirmations":["Imported session declaration"]}'}],value:'config.json'}});
  assert.equal(a.run('config.confirmations[0]'),'Imported session declaration');
  assert.equal(a.node('toast').textContent,'storageUnavailable');
  a.node('config-reset').listeners.click();
  assert.equal(a.run('config.journalName'),DEFAULT_CONFIG.journalName);
  assert.equal(a.node('toast').textContent,'storageUnavailable');
});
