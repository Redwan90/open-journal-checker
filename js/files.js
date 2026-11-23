import { parseWordXml } from './wordxml.js';
import { PDFJS_BASE } from './runtime.js';
// Local-first file extraction. PDF.js, when needed, loads its code from jsDelivr;
// the manuscript itself is processed in memory, never uploaded by this application.
const DOCX_MAX_BYTES = 12 * 1024 * 1024;
const ZIP_XML_MAX_BYTES = 12 * 1024 * 1024;
const PDF_MAX_BYTES = 15 * 1024 * 1024;
function fileError(code, message) { return Object.assign(new Error(message), { code }); }
function u16(d, offset) { return d.getUint16(offset, true); }
function u32(d, offset) { return d.getUint32(offset, true); }

function docxDirectory(array) {
  const data = new DataView(array);
  const invalid = () => fileError('docxInvalid', 'Invalid DOCX archive directory.');
  let end = -1;
  for (let i = array.byteLength - 22; i >= Math.max(0, array.byteLength - 65557); i--) {
    if (u32(data, i) === 0x06054b50 && i + 22 + u16(data, i + 20) === array.byteLength) { end = i; break; }
  }
  if (end === -1) throw fileError('docxInvalid', 'This is not a valid DOCX/ZIP file.');
  const count = u16(data, end + 10);
  if (count > 10000) throw fileError('docxEntries', 'Too many document entries.');
  if (u16(data, end + 4) || u16(data, end + 6) || u16(data, end + 8) !== count) throw invalid();
  const directory = u32(data, end + 16), limit = directory + u32(data, end + 12);
  if (limit > end) throw invalid();
  const entries = new Map();
  let offset = directory;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > limit || u32(data, offset) !== 0x02014b50) throw invalid();
    const nameLength = u16(data, offset + 28);
    const next = offset + 46 + nameLength + u16(data, offset + 30) + u16(data, offset + 32);
    if (next > limit) throw invalid();
    const name = new TextDecoder().decode(new Uint8Array(array, offset + 46, nameLength));
    if (['word/document.xml','word/footnotes.xml','word/endnotes.xml'].includes(name)) {
      if (entries.has(name)) throw invalid();
      entries.set(name, { name, flags:u16(data, offset + 8), method:u16(data, offset + 10),
        packed:u32(data, offset + 20), unpacked:u32(data, offset + 24), local:u32(data, offset + 42) });
    }
    offset = next;
  }
  return { entries, directory, data };
}

async function readDocxPart(array, archive, entry, budget) {
  const { data, directory } = archive;
  const invalid = () => fileError('docxInvalid', 'Invalid DOCX entry.');
  if (entry.flags & 1) throw invalid(); // Encrypted ZIP parts are unsupported.
  if (entry.unpacked > budget.remaining) throw fileError('docxInflated', 'Decompressed document exceeds size limit.');
  if (entry.local + 30 > directory || u32(data, entry.local) !== 0x04034b50) throw invalid();
  const localNameLength = u16(data, entry.local + 26);
  const start = entry.local + 30 + localNameLength + u16(data, entry.local + 28);
  if (start + entry.packed > directory || (u16(data, entry.local + 6) & 1) || u16(data, entry.local + 8) !== entry.method) throw invalid();
  const localName = new TextDecoder().decode(new Uint8Array(array, entry.local + 30, localNameLength));
  if (localName !== entry.name) throw invalid();
  const raw = array.slice(start, start + entry.packed);
  let output;
  if (entry.method === 0) output = new Uint8Array(raw);
  else if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') throw fileError('docxBrowser', 'Your browser does not support local DOCX extraction.');
    const reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = []; let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        total += value.byteLength;
        if (total > budget.remaining) { await reader.cancel(); throw fileError('docxInflated', 'Decompressed document exceeds size limit.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    output = new Uint8Array(total); let position = 0;
    for (const chunk of chunks) { output.set(chunk, position); position += chunk.byteLength; }
  } else throw fileError('docxCompression', 'Unsupported DOCX compression method.');
  if (output.byteLength > budget.remaining) throw fileError('docxInflated', 'Decompressed document exceeds size limit.');
  if (output.byteLength !== entry.unpacked) throw invalid();
  budget.remaining -= output.byteLength;
  return new TextDecoder().decode(output);
}

export async function extractDocx(file) {
  if (file.size > DOCX_MAX_BYTES) throw fileError('docxTooLarge', 'DOCX exceeds the 12 MB local-processing limit.');
  const array = await file.arrayBuffer();
  if (array.byteLength > DOCX_MAX_BYTES) throw fileError('docxTooLarge', 'DOCX exceeds the 12 MB local-processing limit.');
  const archive = docxDirectory(array), budget = {remaining:ZIP_XML_MAX_BYTES};
  const bodyEntry = archive.entries.get('word/document.xml');
  if (!bodyEntry) throw fileError('docxMissing', 'No readable word/document.xml entry found.');
  const body = parseWordXml(await readDocxPart(array, archive, bodyEntry, budget), 'document');
  const texts = [body.text], notes = {footnotes:0,endnotes:0};
  let missingNotes = 0;
  for (const kind of ['footnotes','endnotes']) {
    const ids = body[kind];
    if (!ids.size) continue;
    const entry = archive.entries.get(`word/${kind}.xml`);
    if (!entry) { missingNotes += ids.size; continue; }
    const part = parseWordXml(await readDocxPart(array, archive, entry, budget), kind, ids);
    notes[kind] = part.ids.size;
    missingNotes += [...ids].filter(id => !part.ids.has(id)).length;
    if (part.text) texts.push(part.text);
  }
  return { text:texts.join('\n'), structureText:body.text, format:'docx', notes, missingNotes, pages:null, partial:missingNotes > 0 };
}

export async function extractPdf(file) {
  if (file.size > PDF_MAX_BYTES) throw fileError('pdfTooLarge', 'PDF exceeds the 15 MB local-processing limit.');
  const pdfjs = await import(new URL('build/pdf.min.mjs', PDFJS_BASE).href)
    .catch(() => { throw fileError('pdfLibrary', 'PDF text extraction needs access to the PDF.js library. Connect to the internet or paste your abstract manually.'); });
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.min.mjs', PDFJS_BASE).href;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true,
    cMapUrl:new URL('cmaps/', PDFJS_BASE).href, cMapPacked:true,
    standardFontDataUrl:new URL('standard_fonts/', PDFJS_BASE).href,
    wasmUrl:new URL('wasm/', PDFJS_BASE).href, iccUrl:new URL('iccs/', PDFJS_BASE).href });
  return readPdfTask(task);
}

// PDF.js 6 exposes destroy() on the loading task, not PDFDocumentProxy.
export async function readPdfTask(task) {
  try { return await readPdfDocument(await task.promise); }
  finally { await task.destroy(); }
}

// Preserve PDF.js line boundaries for the line-oriented heading checks.
export async function readPdfDocument(doc) {
  const pageLimit = Math.min(doc.numPages, 30);
  const contents = [];
  for (let i = 1; i <= pageLimit; i++) {
    const page = await doc.getPage(i), data = await page.getTextContent();
    contents.push(data.items.map(v => (v.str || '') + (v.hasEOL ? '\n' : ' ')).join(''));
  }
  return { text: contents.join('\n'), format:'pdf', pages: doc.numPages, partial: doc.numPages > pageLimit };
}
export async function readManuscriptFile(file) {
  if (!file) throw fileError('fileSelect', 'Select a PDF or DOCX file.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'docx') return extractDocx(file);
  if (ext === 'pdf') return extractPdf(file);
  throw fileError('fileUnsupported', 'Only .docx and .pdf manuscripts are supported.');
}
