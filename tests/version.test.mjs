import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../js/version.js';
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8').replaceAll('\r\n','\n');

test('Package, lockfile, citation, UI and changelog identify the same release',()=>{
  assert.equal(JSON.parse(text('package.json')).version,VERSION);
  const lock=JSON.parse(text('package-lock.json'));
  assert.equal(lock.version,VERSION);
  assert.equal(lock.packages[''].version,VERSION);
  assert.ok(text('CITATION.cff').includes(`version: ${VERSION}\n`));
  assert.ok(text('index.html').includes(`v${VERSION} ·`));
  assert.ok(text('CHANGELOG.md').includes(`## ${VERSION} —`));
});
