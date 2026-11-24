// Copyright 2026 Ridwan Shamoun. Apache-2.0.
// Northern Kurdish Latin primary-letter tailoring, based on Unicode CLDR ku.xml:
// https://github.com/unicode-org/cldr/blob/main/common/collation/ku.xml
// This is a bounded Hawar-letter comparator, not a complete ICU replacement.
const encoded = {c:'ca',ç:'cb',e:'ea',ê:'eb',i:'ia',î:'ib',s:'sa',ş:'sb',u:'ua',û:'ub'};
function sortKey(value) {
  const decomposed = String(value).normalize('NFKD').toLocaleLowerCase('en');
  const parts = decomposed.match(/[^\p{M}]\p{M}*|\p{M}+/gu) || [];
  let key = '';
  for (const part of parts) {
    let letter = part[0];
    if (/^[a-z]$/u.test(letter)) {
      const marks = part.slice(1);
      if (letter === 'c' && marks.includes('\u0327')) letter='ç';
      else if (letter === 's' && marks.includes('\u0327')) letter='ş';
      else if (letter === 'e' && /[\u0301\u0302]/u.test(marks)) letter='ê';
      else if (letter === 'i' && /[\u0301\u0302]/u.test(marks)) letter='î';
      else if (letter === 'u' && /[\u0300-\u0302]/u.test(marks)) letter='û';
      key += encoded[letter] || letter;
    } else if (/^[\x20-\x7e\s\p{P}]+$/u.test(part)) key += part;
    else return null; // Mixed scripts/unhandled characters require manual review.
  }
  return key;
}
export function createKurdishLatinCollator(keywords = []) {
  if (!Intl.Collator.supportedLocalesOf(['en']).length) return null;
  const keys = new Map(keywords.map(word => [word,sortKey(word)]));
  if ([...keys.values()].includes(null)) return null;
  const base = new Intl.Collator('en',{usage:'sort',sensitivity:'base'});
  return {method:'hawar-v1',resolvedOptions:()=>({locale:'ku'}),
    compare:(a,b)=>base.compare(keys.get(a) ?? sortKey(a),keys.get(b) ?? sortKey(b))};
}
