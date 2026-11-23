// Read visible run text once, in XML order. This is not a Word layout engine.
const WORD_NS = new Set([
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main'
]);
const invalid = () => Object.assign(new Error('Invalid Word document XML.'), {code:'docxXml'});

export function parseWordXml(source, kind = 'document', wantedIds = null) {
  if (/<!DOCTYPE/i.test(source)) throw invalid();
  const xml = new DOMParser().parseFromString(source, 'application/xml');
  const root = xml.documentElement;
  if (xml.querySelector('parsererror') || !WORD_NS.has(root.namespaceURI) || root.localName !== kind) throw invalid();
  const fragments = [], footnotes = new Set(), endnotes = new Set(), ids = new Set();
  const stack = [{node:root,exit:false}];
  let visited = 0;
  while (stack.length) {
    const {node,exit} = stack.pop();
    if (node.nodeType !== 1) continue;
    const word = WORD_NS.has(node.namespaceURI), name = node.localName;
    if (exit) {
      if (word && (name === 'p' || name === 'tr')) fragments.push('\n');
      else if (word && name === 'tc') fragments.push('\t');
      continue;
    }
    if (++visited > 250000) throw Object.assign(new Error('Too many document entries.'), {code:'docxEntries'});
    if (node.namespaceURI === 'http://schemas.openxmlformats.org/markup-compatibility/2006' && name === 'AlternateContent') {
      const branches = Array.from(node.children);
      const selected = branches.find(child => child.localName === 'Choice') || branches.find(child => child.localName === 'Fallback');
      if (selected) stack.push({node:selected,exit:false});
      continue;
    }
    if (word) {
      if (['del','moveFrom','instrText','delText'].includes(name)) continue;
      if (name === 'footnote' || name === 'endnote') {
        const type = node.getAttributeNS(node.namespaceURI, 'type');
        const id = node.getAttributeNS(node.namespaceURI, 'id');
        if ((type && type !== 'normal') || !id || (wantedIds && !wantedIds.has(id))) continue;
        if (ids.has(id)) throw invalid();
        ids.add(id);
      }
      if (name === 'footnoteReference' || name === 'endnoteReference') {
        const id = node.getAttributeNS(node.namespaceURI, 'id');
        if (id) (name === 'footnoteReference' ? footnotes : endnotes).add(id);
      }
      if (name === 't') { fragments.push(node.textContent); continue; }
      if (name === 'tab' || name === 'ptab') { fragments.push('\t'); continue; }
      if (name === 'br' || name === 'cr') { fragments.push('\n'); continue; }
      if (name === 'noBreakHyphen') { fragments.push('\u2011'); continue; }
      if (name === 'softHyphen') { fragments.push('\u00ad'); continue; }
    }
    stack.push({node,exit:true});
    for (let child = node.lastChild; child; child = child.previousSibling) stack.push({node:child,exit:false});
  }
  return {text:fragments.join('').trim(),footnotes,endnotes,ids};
}
