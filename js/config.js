// Copyright 2026 Ridwan Shamoun. Licensed under the Apache License, Version 2.0.
export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 1,
  translations: {},
  journalName: 'Open Journal Demo',
  journalShortName: 'OJD',
  journalWebsite: 'https://mwsjournal.com/',
  guidelinesUrl: 'https://example.org/author-guidelines',
  submissionUrl: 'https://example.org/submissions',
  logoUrl: '',
  accent: '#225d8f',
  articleTypes: ['Research Article', 'Review Article', 'Short Communication', 'Case Study', 'Methodology Paper'],
  titleMaxWords: 20,
  abstractMinWords: 150,
  abstractMaxWords: 250,
  keywordsMin: 3,
  keywordsMax: 6,
  keywordSeparator: ';',
  subjects: [
    { name: 'Computer Science & AI', terms: ['artificial intelligence', 'machine learning', 'neural', 'software', 'computing', 'algorithm', 'data', 'cybersecurity', 'network'] },
    { name: 'Engineering', terms: ['engineering', 'electrical', 'mechanical', 'materials', 'energy', 'optimization', 'system', 'control', 'structural'] },
    { name: 'Health & Life Sciences', terms: ['health', 'clinical', 'medicine', 'drug', 'patient', 'biology', 'genomic', 'disease', 'pharmacology'] },
    { name: 'Education & Social Sciences', terms: ['education', 'learning', 'student', 'teacher', 'social', 'policy', 'survey', 'curriculum', 'community'] }
  ],
  confirmations: [
    'The manuscript is original and is not under review elsewhere.',
    'All authors reviewed and approved the submitted manuscript.',
    'Research ethics approval or an exemption is stated where applicable.',
    'Informed consent and participant privacy were considered where applicable.',
    'Competing interests are disclosed, including a statement if none exist.',
    'Funding and sponsor roles are disclosed, including if unfunded.',
    'A data availability statement is provided where applicable.',
    'Any use of generative AI is disclosed according to journal policy.',
    'References have been checked, including available DOI links.',
    'The manuscript follows this journal’s formatting and anonymization instructions.'
  ],
  extraGuidance: 'Preparation checks are advisory. The journal’s current author guidelines and editor decisions always take precedence.'
});

const MAX = { string: 500, items: 30 };
function str(value, fallback = '', max = MAX.string) { return typeof value === 'string' ? value.trim().slice(0, max) : fallback; }
function positiveInt(value, fallback, minimum, maximum) { const n = Number(value); return Number.isInteger(n) && n >= minimum && n <= maximum ? n : fallback; }
function cleanUrl(value) {
  const s = str(value, '', 400);
  if (!s) return '';
  try { const u = new URL(s); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Journal configuration must be a JSON object.');
  const cfg = { ...DEFAULT_CONFIG };
  cfg.journalName = str(input.journalName, DEFAULT_CONFIG.journalName, 100) || DEFAULT_CONFIG.journalName;
  cfg.journalShortName = str(input.journalShortName, DEFAULT_CONFIG.journalShortName, 24);
  cfg.journalWebsite = cleanUrl(input.journalWebsite ?? DEFAULT_CONFIG.journalWebsite);
  cfg.guidelinesUrl = cleanUrl(input.guidelinesUrl ?? DEFAULT_CONFIG.guidelinesUrl);
  cfg.submissionUrl = cleanUrl(input.submissionUrl ?? DEFAULT_CONFIG.submissionUrl);
  cfg.logoUrl = cleanUrl(input.logoUrl ?? '');
  cfg.accent = /^#[0-9a-fA-F]{6}$/.test(input.accent ?? '') ? input.accent : DEFAULT_CONFIG.accent;
  cfg.titleMaxWords = positiveInt(input.titleMaxWords, 20, 5, 100);
  cfg.abstractMinWords = positiveInt(input.abstractMinWords, 150, 0, 1000);
  cfg.abstractMaxWords = input.abstractMaxWords === undefined ? Math.max(DEFAULT_CONFIG.abstractMaxWords, cfg.abstractMinWords) : positiveInt(input.abstractMaxWords, cfg.abstractMinWords, cfg.abstractMinWords, 2000);
  if (cfg.abstractMaxWords < cfg.abstractMinWords) cfg.abstractMaxWords = cfg.abstractMinWords;
  cfg.keywordsMin = positiveInt(input.keywordsMin, 3, 1, 20);
  cfg.keywordsMax = input.keywordsMax === undefined ? Math.max(DEFAULT_CONFIG.keywordsMax, cfg.keywordsMin) : positiveInt(input.keywordsMax, cfg.keywordsMin, cfg.keywordsMin, 30);
  if (cfg.keywordsMax < cfg.keywordsMin) cfg.keywordsMax = cfg.keywordsMin;
  cfg.keywordSeparator = ';';
  cfg.articleTypes = (Array.isArray(input.articleTypes) ? input.articleTypes : DEFAULT_CONFIG.articleTypes)
    .map(v => str(v, '', 80)).filter(Boolean).slice(0, MAX.items);
  if (!cfg.articleTypes.length) cfg.articleTypes = [...DEFAULT_CONFIG.articleTypes];
  cfg.subjects = (Array.isArray(input.subjects) ? input.subjects : DEFAULT_CONFIG.subjects).slice(0, MAX.items)
    .filter(s => s && typeof s === 'object')
    .map(s => ({ name: str(s.name, '', 80), terms: (Array.isArray(s.terms) ? s.terms : [])
      .map(t => str(t, '', 60).toLocaleLowerCase()).filter(Boolean).slice(0, 40) }))
    .filter(s => s.name && s.terms.length);
  if (!cfg.subjects.length) cfg.subjects = structuredClone(DEFAULT_CONFIG.subjects);
  cfg.confirmations = (Array.isArray(input.confirmations) ? input.confirmations : DEFAULT_CONFIG.confirmations)
    .map(s => str(s, '', 300)).filter(Boolean).slice(0, 20);
  if (!cfg.confirmations.length) cfg.confirmations = [...DEFAULT_CONFIG.confirmations];
  cfg.extraGuidance = str(input.extraGuidance, DEFAULT_CONFIG.extraGuidance, 1500);
  // Bind translations to exact source wording so edits cannot reuse stale consent text.
  const sources = { name:[cfg.journalName], guidance:[cfg.extraGuidance], article:cfg.articleTypes,
    subject:cfg.subjects.map(s => s.name), confirmation:cfg.confirmations };
  cfg.translations = {};
  for (const locale of ['en','ar','ku','tr']) {
    const supplied = input.translations?.[locale];
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) continue;
    const translated = {};
    for (const [kind, originals] of Object.entries(sources)) {
      const entries = supplied[kind];
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
      const values = originals.filter(source => Object.hasOwn(entries, source))
        .map(source => [source, str(entries[source], '', kind === 'guidance' ? 1500 : kind === 'confirmation' ? 300 : kind === 'name' ? 100 : 80)])
        .filter(([,value]) => value);
      if (values.length) translated[kind] = Object.fromEntries(values);
    }
    if (Object.keys(translated).length) cfg.translations[locale] = translated;
  }
  return cfg;
}

export function parseSubjects(text) {
  return text.split(/\r?\n/).map(line => {
    const i = line.indexOf('|');
    if (i < 0) return null;
    return { name: line.slice(0, i).trim(), terms: line.slice(i + 1).split(',').map(s => s.trim()).filter(Boolean) };
  }).filter(Boolean);
}
