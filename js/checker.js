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
// Compare complete heading labels, not mentions inside prose. Normalize only the
// comparison copy: manuscript text, counts, DOI extraction and previews stay intact.
function headingKey(value) {
  return value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[ـ\u200c-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ی/g, 'ي').replace(/ک/g, 'ك').replace(/ı/g, 'i')
    .replace(/[\t \u00a0]+/g, ' ').trim();
}
const headingLabels = {
  abstract: ['abstract', 'الملخص', 'ملخص', 'خلاصة', 'الخلاصة', 'پوختە', 'کورتە', 'kurte', 'puxte', 'özet', 'öz'],
  keywords: ['key words', 'keywords', 'الكلمات المفتاحية', 'كلمات مفتاحية', 'الكلمات الدالة', 'پەیڤێن سەرەکی', 'پەیڤێن سەرەکیی', 'وشە سەرەکییەکان', 'peyvên sereke', 'anahtar kelimeler', 'anahtar sözcükler'],
  methods: ['method', 'methods', 'methodology', 'materials and methods', 'materials & methods', 'research methods', 'المنهجية', 'منهجية', 'منهجية البحث', 'طرق البحث', 'المواد والطرق', 'المواد وطرائق العمل', 'ڕێباز', 'رێباز', 'ڕێبازێ ڤەکۆلینێ', 'رێبازێ ڤەکۆلینێ', 'rêbaz', 'rêbazên lêkolînê', 'metodolojî', 'yöntem', 'yöntemler', 'metodoloji', 'gereç ve yöntem', 'materyal ve metot', 'materyal ve yöntem', 'materyal ve yöntemler'],
  references: ['references', 'bibliography', 'works cited', 'المراجع', 'مراجع', 'المصادر', 'المصادر والمراجع', 'ژێدەر', 'ژێدەرەکان', 'ژێدەرێن', 'çavkanî', 'çavkanîler', 'jêder', 'jêderên', 'kaynakça', 'kaynaklar']
};
const headingSets = Object.fromEntries(Object.entries(headingLabels).map(([kind, labels]) => [kind, new Set(labels.map(headingKey))]));
function detectHeadings(text) {
  const found = { abstract:false, keywords:false, references:false, methods:false };
  for (const raw of text.split(/\r\n?|\n|\u2028|\u2029/u)) {
    const line = headingKey(raw).replace(/^(?:\p{N}+(?:[.٫]\p{N}+)*[.)-]? +|[•●▪] +)/u, '');
    // Inline content is accepted only after an explicit colon separator.
    const label = line.split(/[:：]/u, 1)[0].trim().replace(/[.。]$/u, '').trim();
    for (const kind of Object.keys(found)) if (headingSets[kind].has(label)) found[kind] = true;
  }
  return found;
}
export function inspectText(text = '', headingText = text) {
  const content = String(text);
  const headings = detectHeadings(String(headingText));
  const dois = extractDois(content);
  return { words: wordCount(content), headings, dois, preview: content.slice(0, 500), note: 'Heading detection recognizes common English, Arabic, Kurdish and Turkish labels heuristically; missing markers do not prove noncompliance.' };
}
