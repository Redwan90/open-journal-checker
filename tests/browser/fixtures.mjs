// Synthetic public-domain manuscript fixtures generated in memory.
import { deflateRawSync } from 'node:zlib';

export function docxFixture(options = {}) {
  const document=options.document || `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${
    ['Abstract','Synthetic abstract text.','Keywords: AI; Data; Ethics','Methods','Synthetic analysis.','References','10.1234/synthetic'].map(s=>`<w:p><w:r><w:t>${s}</w:t></w:r></w:p>`).join('')
  }</w:body></w:document>`;
  const entries=[
    ['[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml',document], ...(options.parts || [])
  ];
  return zipFixture(entries, options);
}

export function zipFixture(entries, {stored = false} = {}) {
  const localParts=[],directoryParts=[];let offset=0;
  for(const [path,xml] of entries) {
    const name=Buffer.from(path),data=Buffer.from(xml),packed=stored ? data : deflateRawSync(data);
    let crc=0xffffffff;
    for(const byte of data) {crc^=byte;for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    crc=(crc^0xffffffff)>>>0;
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(stored ? 0 : 8,8);
    local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(stored ? 0 : 8,10);
    central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
    localParts.push(local,name,packed);directoryParts.push(central,name);offset+=local.length+name.length+packed.length;
  }
  const directory=Buffer.concat(directoryParts);
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...localParts,directory,end]);
}

export function pdfFixture({pages=1,imageOnly=false} = {}) {
  const image='FFFFFF>';
  const content=imageOnly ? 'q 100 0 0 100 50 650 cm /Im0 Do Q' : 'BT /F1 12 Tf 50 750 Td (Abstract) Tj 0 -20 Td (Synthetic abstract text.) Tj 0 -20 Td (Methods) Tj 0 -20 Td (Synthetic analysis.) Tj 0 -20 Td (References) Tj 0 -20 Td (10.1234/synthetic) Tj ET';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({length:pages},(_,i)=>`${i+6} 0 R`).join(' ')}] /Count ${pages} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${image.length} >>\nstream\n${image}\nendstream`,
    ...Array.from({length:pages},()=> '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>')
  ];
  let pdf='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const start=Buffer.byteLength(pdf),size=objects.length+1;
  pdf+=`xref\n0 ${size}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}

// A synthetic PDF with explicit Unicode mappings, exercising the real PDF.js
// extraction path without depending on a system font or a binary test asset.
export function unicodePdfFixture(lines, rtl=false) {
 const chars=[...new Set(lines.join('').split(''))];
 const codes=new Map(chars.map((character,index)=>[character,index+1]));
 const hex=number=>number.toString(16).padStart(2,'0');
 const mappings=chars.map(character=>`<${hex(codes.get(character))}> <${character.charCodeAt(0).toString(16).padStart(4,'0')}>`).join('\n');
 const cmap=`/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Synthetic def /CMapType 2 def 1 begincodespacerange <00> <ff> endcodespacerange ${chars.length} beginbfchar\n${mappings}\nendbfchar endcmap CMapName currentdict /CMap defineresource pop end end`;
 const content='BT /F1 12 Tf 50 750 Td '+lines.map((line,index)=>(index?'0 -20 Td ':'')+'<'+[...(rtl?[...line].reverse().join(''):line)].map(c=>hex(codes.get(c))).join('')+'> Tj').join(' ')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [6 0 R] /Count 1 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode 5 0 R >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,`<< /Length ${Buffer.byteLength(cmap)} >>\nstream\n${cmap}\nendstream`,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>'];
 let pdf='%PDF-1.4\n';const offsets=[0];
 objects.forEach((body,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${body}\nendobj\n`;});
 const start=Buffer.byteLength(pdf);
 pdf+=`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return Buffer.from(pdf);
}
