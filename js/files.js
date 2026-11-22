// Local-first file extraction. PDF.js, when needed, loads its code from jsDelivr;
// the manuscript itself is processed in memory, never uploaded by this application.
const DOCX_MAX_BYTES = 12 * 1024 * 1024;
const ZIP_XML_MAX_BYTES = 12 * 1024 * 1024;
const PDF_MAX_BYTES = 15 * 1024 * 1024;
function u16(d, offset) { return d.getUint16(offset, true); }
function u32(d, offset) { return d.getUint32(offset, true); }

export async function extractDocx(file) {
  if (file.size > DOCX_MAX_BYTES) throw new Error('DOCX exceeds the 12 MB local-processing limit.');
  const array = await file.arrayBuffer();
  const data = new DataView(array);
  let eocd = -1;
  for (let i = array.byteLength - 22; i >= Math.max(0, array.byteLength - 65557); i--) {
    if (u32(data, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('This is not a valid DOCX/ZIP file.');
  const entryCount = u16(data, eocd + 10);
  if (entryCount > 10000) throw new Error('Too many document entries.');
  let offset = u32(data, eocd + 16);
  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > array.byteLength || u32(data, offset) !== 0x02014b50) throw new Error('Invalid DOCX archive directory.');
    const method = u16(data, offset + 10), packed = u32(data, offset + 20), unpacked = u32(data, offset + 24);
    const filenameLen = u16(data, offset + 28), extraLen = u16(data, offset + 30), commentLen = u16(data, offset + 32);
    const localOffset = u32(data, offset + 42);
    const name = new TextDecoder().decode(new Uint8Array(array, offset + 46, filenameLen));
    offset += 46 + filenameLen + extraLen + commentLen;
    if (name !== 'word/document.xml') continue;
    if (unpacked > ZIP_XML_MAX_BYTES) throw new Error('The uncompressed document is too large.');
    if (localOffset + 30 > array.byteLength || u32(data, localOffset) !== 0x04034b50) throw new Error('Invalid DOCX entry.');
    const start = localOffset + 30 + u16(data, localOffset + 26) + u16(data, localOffset + 28);
    if (start + packed > array.byteLength) throw new Error('Truncated DOCX entry.');
    let output;
    const raw = array.slice(start, start + packed);
    if (method === 0) output = raw;
    else if (method === 8) {
      if (!('DecompressionStream' in window)) throw new Error('Your browser does not support local DOCX extraction.');
      const reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      const chunks = []; let total = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          total += value.byteLength;
          if (total > ZIP_XML_MAX_BYTES) { await reader.cancel(); throw new Error('Decompressed document exceeds size limit.'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const combined = new Uint8Array(total); let pos = 0;
      for (const chunk of chunks) { combined.set(chunk, pos); pos += chunk.byteLength; }
      output = combined.buffer;
    } else throw new Error('Unsupported DOCX compression method.');
    if (output.byteLength > ZIP_XML_MAX_BYTES) throw new Error('Decompressed document exceeds size limit.');
    const xml = new DOMParser().parseFromString(new TextDecoder().decode(output), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Invalid Word document XML.');
    const paragraphs = Array.from(xml.getElementsByTagNameNS('*', 'p'));
    const text = paragraphs.map(p => Array.from(p.getElementsByTagNameNS('*', 't')).map(n => n.textContent).join('')).join('\n');
    return { text, pages: null, partial: false };
  }
  throw new Error('No readable word/document.xml entry found.');
}

export async function extractPdf(file) {
  if (file.size > PDF_MAX_BYTES) throw new Error('PDF exceeds the 15 MB local-processing limit.');
  const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs')
    .catch(() => { throw new Error('PDF text extraction needs access to the PDF.js library. Connect to the internet or paste your abstract manually.'); });
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true }).promise;
  return readPdfDocument(doc);
}

// Preserve PDF.js line boundaries for the line-oriented heading checks.
export async function readPdfDocument(doc) {
  try {
    const pageLimit = Math.min(doc.numPages, 30);
    const contents = [];
    for (let i = 1; i <= pageLimit; i++) {
      const page = await doc.getPage(i), data = await page.getTextContent();
      contents.push(data.items.map(v => (v.str || '') + (v.hasEOL ? '\n' : ' ')).join(''));
    }
    return { text: contents.join('\n'), pages: doc.numPages, partial: doc.numPages > pageLimit };
  } finally { await doc.destroy(); }
}
export async function readManuscriptFile(file) {
  if (!file) throw new Error('Select a PDF or DOCX file.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'docx') return extractDocx(file);
  if (ext === 'pdf') return extractPdf(file);
  throw new Error('Only .docx and .pdf manuscripts are supported.');
}
