import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { extractDocx, readManuscriptFile } from '../js/files.js';
import { zipFixture } from './browser/fixtures.mjs';

const file = bytes => ({size:bytes.length, arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
function zipEntry(payload, declaredSize) {
  const name=Buffer.from('word/document.xml');
  const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8,8); local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(8,10);
  central.writeUInt32LE(payload.length,20); central.writeUInt32LE(declaredSize,24); central.writeUInt16LE(name.length,28);
  const directory=Buffer.concat([central,name]);
  const end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1,8); end.writeUInt16LE(1,10);
  end.writeUInt32LE(directory.length,12); end.writeUInt32LE(local.length+name.length+payload.length,16);
  return file(Buffer.concat([local,name,payload,directory,end]));
}

test('DOCX rejects oversized input before reading and rejects non-ZIP data', async () => {
  await assert.rejects(extractDocx({size:13*1024*1024,arrayBuffer:()=>{throw new Error('Should not read');}}),/12 MB/);
  await assert.rejects(extractDocx(file(Buffer.from('not a Word document'))),/valid DOCX/);
});

test('DOCX checks actual inflated size even when ZIP metadata understates it', async () => {
  const previous=globalThis.window;
  globalThis.window={DecompressionStream};
  try {
    const payload=deflateRawSync(Buffer.alloc(13*1024*1024,65));
    await assert.rejects(extractDocx(zipEntry(payload,1)),/exceeds size limit/);
  } finally { if(previous===undefined) delete globalThis.window; else globalThis.window=previous; }
});

test('File dispatch rejects absent and unsupported files', async () => {
  await assert.rejects(readManuscriptFile(null),/Select a PDF or DOCX/);
  await assert.rejects(readManuscriptFile({name:'manuscript.exe'}),/Only .docx and .pdf/);
});

test('DOCX rejects contradictory, encrypted or out-of-bounds ZIP entries before XML parsing',async()=>{
  for(const corrupt of [
    (bytes,central)=>bytes.writeUInt16LE(65535,central+28),
    (bytes,central)=>bytes.writeUInt16LE(1,central+8),
    bytes=>bytes.writeUInt16LE(99,8),
    (bytes,central)=>bytes.writeUInt32LE(1,central+24)
  ]) {
    const bytes=zipFixture([['word/document.xml','synthetic xml']]);
    const central=bytes.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
    corrupt(bytes,central);
    await assert.rejects(extractDocx(file(bytes)),error=>error.code==='docxInvalid');
  }
});

test('DOCX rejects duplicate body entries and identifies a missing main document',async()=>{
  await assert.rejects(extractDocx(file(zipFixture([['word/document.xml','a'],['word/document.xml','b']]))),error=>error.code==='docxInvalid');
  await assert.rejects(extractDocx(file(zipFixture([['word/unrelated.xml','a']]))),error=>error.code==='docxMissing');
});
