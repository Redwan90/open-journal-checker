import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { docxFixture, pdfFixture, zipFixture } from './fixtures.mjs';

const transitional='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const strict='http://purl.oclc.org/ooxml/wordprocessingml/main';
const paragraph=text=>`<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const document=(body,namespace=transitional)=>`<w:document xmlns:w="${namespace}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><w:body>${body}</w:body></w:document>`;
const extract=(page,buffer)=>page.evaluate(async bytes=>{
  const {extractDocx}=await import('/open-journal-checker/js/files.js');
  try { return await extractDocx(new File([new Uint8Array(bytes)],'synthetic.docx')); }
  catch(error) {return {error:error.code};}
},Array.from(buffer));

test.beforeEach(async({page})=>{await page.goto('/open-journal-checker/');});

for(const namespace of [transitional,strict]) {
  test(`DOCX boundaries, revisions, nested text and referenced notes (${namespace===strict?'strict':'transitional'})`,async({page})=>{
    const body=`<w:p><w:r><w:t>Abstract</w:t><w:br/><w:t>Visible abstract</w:t></w:r></w:p>
      <w:p><w:r><w:t>Alpha</w:t><w:tab/><w:t>Beta</w:t><w:cr/><w:t>Gamma</w:t></w:r></w:p>
      <w:p><w:r><w:t>algo</w:t></w:r><w:r><w:t>rithm</w:t></w:r></w:p>
      <w:p><w:del><w:r><w:delText>DELETED 10.1234/deleted</w:delText></w:r></w:del>
      <w:moveFrom><w:r><w:t>OLD_MOVE 10.1234/old-move</w:t><w:footnoteReference w:id="99"/></w:r></w:moveFrom>
      <w:ins><w:r><w:t>INSERTED</w:t></w:r></w:ins><w:moveTo><w:r><w:t> MOVED_HERE</w:t></w:r></w:moveTo></w:p>
      <w:p><w:r><w:drawing><w:txbxContent>${paragraph('TextboxOnce')}</w:txbxContent></w:drawing></w:r></w:p>
      <mc:AlternateContent><mc:Choice Requires="w">${paragraph('ChoiceOnce')}</mc:Choice><mc:Fallback>${paragraph('ChoiceOnce')}</mc:Fallback></mc:AlternateContent>
      <w:p><w:r><w:footnoteReference w:id="1"/><w:endnoteReference w:id="2"/></w:r></w:p>`;
    const footnotes=`<w:footnotes xmlns:w="${namespace}"><w:footnote w:type="separator" w:id="-1">${paragraph('10.1234/separator')}</w:footnote><w:footnote w:id="1">${paragraph('Methods')}${paragraph('10.1234/footnote')}</w:footnote><w:footnote w:id="99">${paragraph('10.1234/deleted-note')}</w:footnote><w:footnote w:id="8">${paragraph('10.1234/unused')}</w:footnote></w:footnotes>`;
    const endnotes=`<w:endnotes xmlns:w="${namespace}"><w:endnote w:id="2">${paragraph('References')}${paragraph('10.1234/endnote')}</w:endnote></w:endnotes>`;
    const buffer=docxFixture({document:document(body,namespace),parts:[['word/footnotes.xml',footnotes],['word/endnotes.xml',endnotes]]});
    const result=await extract(page,buffer);
    expect(result.error).toBeUndefined();
    expect(result.text).toContain('Alpha\tBeta\nGamma');
    expect(result.text).toContain('algorithm');
    expect(result.text).toContain('INSERTED MOVED_HERE');
    for(const absent of ['DELETED','OLD_MOVE','10.1234/unused','10.1234/deleted-note','10.1234/separator']) expect(result.text).not.toContain(absent);
    expect(result.text.split('TextboxOnce')).toHaveLength(2);
    expect(result.text.split('ChoiceOnce')).toHaveLength(2);
    expect(result.notes).toEqual({footnotes:1,endnotes:1});
    await page.locator('#manuscript-file').setInputFiles({name:'structured.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer});
    await expect(page.locator('#file-info')).toContainText('Methods heading: Not detected');
    await expect(page.locator('#file-info')).toContainText('References heading: Not detected');
    await expect(page.locator('#file-info')).toContainText('10.1234/footnote');
    await expect(page.locator('#file-info')).toContainText('10.1234/endnote');
  });
}

test('Missing referenced notes are disclosed in UI and downloaded reports',async({page})=>{
  const buffer=docxFixture({document:document(`<w:p><w:r><w:t>Body text</w:t><w:footnoteReference w:id="7"/></w:r></w:p>`)});
  await page.locator('#manuscript-file').setInputFiles({name:'missing-notes.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer});
  await expect(page.locator('#file-info')).toContainText('1 referenced notes could not be found');
  const pending=page.waitForEvent('download');await page.locator('#download-json').click();
  const json=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  expect(json.fileInspection.partial).toBe(true);
  expect(json.fileInspection.missingNotes).toBe(1);
  const htmlDownload=page.waitForEvent('download');await page.locator('#download-report').click();
  expect(await readFile(await (await htmlDownload).path(),'utf8')).toContain('inspection is incomplete');
});

test('DOCX rejects DTDs, invalid namespaces, duplicate body parts and truncated directories',async({page})=>{
  const dtd=docxFixture({document:'<!DOCTYPE x [<!ENTITY a "expanded">]>'+document(paragraph('&a;'))});
  expect((await extract(page,dtd)).error).toBe('docxXml');
  const wrongNamespace=docxFixture({document:document(paragraph('Text'),'https://example.invalid/not-word')});
  expect((await extract(page,wrongNamespace)).error).toBe('docxXml');
  const duplicate=docxFixture({parts:[['word/document.xml',document(paragraph('Duplicate'))]]});
  expect((await extract(page,duplicate)).error).toBe('docxInvalid');
  const truncated=docxFixture();const central=truncated.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  truncated.writeUInt16LE(65535,central+28);
  expect((await extract(page,truncated)).error).toBe('docxInvalid');
});

test('DOCX applies one aggregate inflation budget to body and notes',async({page})=>{
  const padding=' '.repeat(7*1024*1024);
  const body=document(`<w:p><w:r><w:footnoteReference w:id="1"/></w:r></w:p><!--${padding}-->`);
  const notes=`<w:footnotes xmlns:w="${transitional}"><!--${padding}--><w:footnote w:id="1">${paragraph('Note')}</w:footnote></w:footnotes>`;
  const result=await extract(page,zipFixture([['word/document.xml',body],['word/footnotes.xml',notes]]));
  expect(result.error).toBe('docxInflated');
});

for(const imageOnly of [true,false]) {
  test(`PDF ${imageOnly?'image-only warning':'30-page limit'} is disclosed in inspection and reports`,async({page})=>{
    await page.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/*',async route=>{
      const name=new URL(route.request().url()).pathname.split('/').pop();
      if(!['pdf.min.mjs','pdf.worker.min.mjs'].includes(name)) throw new Error('Unexpected PDF asset');
      await route.fulfill({path:resolve('node_modules/pdfjs-dist/build',name),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
    });
    await page.locator('#manuscript-file').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:pdfFixture({imageOnly,pages:imageOnly?1:31})});
    const message=imageOnly?'No extractable PDF text was found':'first 30 pages inspected';
    await expect(page.locator('#file-info')).toContainText(message);
    const pending=page.waitForEvent('download');await page.locator('#download-report').click();
    expect(await readFile(await (await pending).path(),'utf8')).toContain(message);
  });
}
