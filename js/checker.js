// Pure validation and inspection: no network access and no manuscript storage.
export function wordCount(text = '') {
  return (String(text).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []).length;
}
export function parseKeywords(text = '') {
  return String(text).split(';').map(x => x.trim()).filter(Boolean);
}
export function keywordsAlphabetical(keywords) {
  if (!keywords.length) return false;
  return keywords.every((word, i) => i === 0 || keywords[i - 1].localeCompare(word, undefined, { sensitivity: 'base' }) <= 0);
}
function containsTerm(text, term) {
  // Compare phrases without matching substrings inside unrelated words.
  const value = term.toLocaleLowerCase();
  if (!value) return false;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(text); }
  catch { return text.includes(value); }
}
export function scopeMatch(text, subject) {
  const input = String(text).toLocaleLowerCase();
  if (!subject?.terms?.length || !input.trim()) return { matched: false, matches: [] };
  const matches = subject.terms.filter(term => containsTerm(input, term));
  return { matched: matches.length > 0, matches };
}
export function evaluate(manuscript, config) {
  const title = String(manuscript.title ?? '').trim();
  const abstract = String(manuscript.abstract ?? '').trim();
  const keywords = parseKeywords(manuscript.keywords);
  const words = { title: wordCount(title), abstract: wordCount(abstract) };
  const subject = config.subjects.find(x => x.name === manuscript.subject);
  const scope = scopeMatch([title, abstract, keywords.join(' ')].join(' '), subject);
  const checks = [
    { id: 'title', pass: words.title > 0 && words.title <= config.titleMaxWords, values: `${words.title}/${config.titleMaxWords} words` },
    { id: 'abstract', pass: words.abstract >= config.abstractMinWords && words.abstract <= config.abstractMaxWords, values: `${words.abstract} words · ${config.abstractMinWords}–${config.abstractMaxWords} target` },
    { id: 'keywords', pass: keywords.length >= config.keywordsMin && keywords.length <= config.keywordsMax && new Set(keywords.map(x => x.toLocaleLowerCase())).size === keywords.length, values: `${keywords.length} terms · ${config.keywordsMin}–${config.keywordsMax} required` },
    { id: 'alphabetical', pass: keywordsAlphabetical(keywords), values: 'Semicolon-separated, alphabetically ordered' },
    { id: 'scope', pass: scope.matched, values: scope.matches.length ? `Matched: ${scope.matches.join(', ')}` : 'Heuristic keyword overlap only' }
  ];
  const confirmations = config.confirmations.map((description, i) => ({
    id: `confirmation-${i}`, description, pass: manuscript.confirmed?.includes(i) ?? false
  }));
  const all = [...checks, ...confirmations];
  const passed = all.filter(x => x.pass).length;
  return { checks, confirmations, passed, total: all.length, percentage: Math.round(100 * passed / all.length), words, keywords, scope };
}
export function extractDois(text = '') {
  const input = String(text);
  const matches = input.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|\bdoi\s*:\s*)?\b10\.\d{4,9}\/[\w.()/:;+-]+/gi) || [];
  const unique = new Map();
  for (const raw of matches) {
    let doi = raw.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\s*:\s*)/i, '');
    // Citation punctuation is ambiguous; preserve balanced DOI parentheses.
    let excess = 0;
    for (const character of doi) {
      if (character === ')') excess++;
      else if (character === '(') excess--;
    }
    let end = doi.length;
    while (end > 0) {
      const last = doi[end - 1];
      if ('.,;:'.includes(last)) end--;
      else if (last === ')' && excess > 0) { end--; excess--; }
      else break;
    }
    doi = doi.slice(0, end);
    const key = doi.toLowerCase();
    if (isDoi(doi) && !unique.has(key)) unique.set(key, doi);
  }
  return [...unique.values()];
}
export function isDoi(value = '') { return /^10\.\d{4,9}\/\S+$/i.test(String(value).trim()); }
export function inspectText(text = '', headingText = text) {
  const content = String(text);
  const structure = String(headingText);
  const headings = {
    abstract: /(?:^|\n)\s*abstract\s*(?:\n|:)/im.test(structure),
    keywords: /(?:^|\n)\s*(?:key\s?words|keywords)\s*(?:\n|:)/im.test(structure),
    references: /(?:^|\n)\s*(?:references|bibliography|works cited)\s*(?:\n|:|$)/im.test(structure),
    methods: /(?:^|\n)\s*(?:methods?|methodology|materials and methods)\s*(?:\n|:|$)/im.test(structure)
  };
  const dois = extractDois(content);
  return { words: wordCount(content), headings, dois, preview: content.slice(0, 500), note: 'Heading detection is heuristic and English-language oriented; missing markers do not prove noncompliance.' };
}
