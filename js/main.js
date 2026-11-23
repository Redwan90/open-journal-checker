// Copyright 2026 Ridwan Shamoun. Licensed under Apache-2.0.
import { DEFAULT_CONFIG, normalizeConfig, parseSubjects } from './config.js';
import { evaluate, wordCount, parseKeywords, inspectText, isDoi } from './checker.js';
import { readManuscriptFile } from './files.js';
import { t, rtl } from './i18n.js';
import { journalText } from './journal-i18n.js';
import { VERSION } from './version.js';

const $ = id => document.getElementById(id);
const escapeHtml = input => String(input ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const urlSafe = v => { try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const STORAGE = 'open-journal-checker-config-v1';
function storedConfig() {
  try { return localStorage.getItem(STORAGE); } catch { return null; }
}
function persistConfig(remove = false) {
  try {
    if (remove) localStorage.removeItem(STORAGE);
    else localStorage.setItem(STORAGE, JSON.stringify(config));
    return true;
  } catch { return false; }
}
let config;
try { config = normalizeConfig(JSON.parse(storedConfig() || '{}')); } catch { config = normalizeConfig(); }
let configRevision = 0;
let language = 'en';
let fileSummary = null;
let fileDescription = null;
let fileStatus = null;
let checkedDoi = null;
let confirmationSet = new Set();
function replaceConfig(input) {
  const next = normalizeConfig(input);
  config = next;
  configRevision++;
  // Author consent belongs to the current journal rules, never to array positions.
  // Language changes only re-render and do not call this function.
  confirmationSet.clear();
}
let toastTimer;
let fileGeneration = 0;
let doiController = null;
function invalidateFile() {
  fileGeneration++;
  doiController?.abort(); doiController = null;
  fileSummary = null; fileDescription = null; checkedDoi = null;
  fileStatus = null;
  $('verify-doi').disabled = false;
  $('doi-result').textContent = '';
  $('doi-zone').hidden = true;
}
const label = (key, params) => t(language, key, params);
function renderDoi() {
  $('doi-result').textContent = checkedDoi ? label(checkedDoi.key, checkedDoi.params) : doiController ? label('verifyPending') : '';
}
function renderFileStatus() {
  $('file-info').className = fileStatus?.error ? 'error file-empty' : 'file-empty';
  $('file-info').textContent = label(fileStatus?.key || 'fileIdle');
}
function parsingNotes(file, L = label) {
  if (file.format === 'docx') return [
    L('docxTextMode'), L('docxNotes', file.notes || {footnotes:0,endnotes:0}),
    ...(file.missingNotes ? [L('docxMissingNotes',{count:file.missingNotes})] : [])
  ];
  return [...(file.partial ? [L('filePartial')] : []), ...(file.words === 0 && file.format === 'pdf' ? [L('pdfNoText')] : [])];
}
function flash(message, error = false) {
  const node = $('toast'); node.textContent = message; node.classList.toggle('error', error); node.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 4200);
}
function getManuscript() {
  return { articleType: $('article-type').value, subject: $('subject').value, title: $('title').value, abstract: $('abstract').value, keywords: $('keywords').value, confirmed: [...confirmationSet] };
}
function setLink(id, url) {
  const a = $(id); const safe = urlSafe(url); a.hidden = !safe;
  if (safe) a.href = safe; else a.removeAttribute('href');
}
function renderJournal() {
  document.documentElement.style.setProperty('--accent', config.accent);
  $('journal-name').textContent = journalText(language, 'name', config.journalName);
  $('guidance').textContent = journalText(language, 'guidance', config.extraGuidance);
  setLink('journal-website', config.journalWebsite);
  setLink('guidelines-url', config.guidelinesUrl);
  setLink('submission-url', config.submissionUrl);
  $('title-max').textContent = config.titleMaxWords;
  $('abstract-range').textContent = `${config.abstractMinWords}–${config.abstractMaxWords}`;
  const m = getManuscript();
  $('article-type').replaceChildren(new Option(label('articleHint'), ''), ...config.articleTypes.map(v => new Option(journalText(language, 'article', v), v)));
  $('subject').replaceChildren(new Option(label('subjectHint'), ''), ...config.subjects.map(v => new Option(journalText(language, 'subject', v.name), v.name)));
  $('article-type').value = config.articleTypes.includes(m.articleType) ? m.articleType : '';
  $('subject').value = config.subjects.some(s => s.name === m.subject) ? m.subject : '';
  renderConfirmations();
}
function renderConfirmations() {
  confirmationSet = new Set([...confirmationSet].filter(i => i >= 0 && i < config.confirmations.length));
  $('confirmations').replaceChildren(...config.confirmations.map((description, i) => {
    description = journalText(language, 'confirmation', description);
    const el = document.createElement('label'); el.className = 'confirm-item';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = confirmationSet.has(i); checkbox.setAttribute('aria-label', description);
    checkbox.addEventListener('change', () => { checkbox.checked ? confirmationSet.add(i) : confirmationSet.delete(i); update(); });
    const copy = document.createElement('span'); copy.textContent = description; copy.dir = 'auto'; el.append(checkbox, copy); return el;
  }));
}
const checkNames = { title:'titleCheck', abstract:'abstractCheck', keywords:'keywordsCheck', alphabetical:'alphabeticalCheck', scope:'scopeCheck' };
function checkDetail(check, result) {
  if (check.id === 'title') return label('checkTitleValue', { count:result.words.title, max:config.titleMaxWords });
  if (check.id === 'abstract') return label('checkAbstractValue', { count:result.words.abstract, min:config.abstractMinWords, max:config.abstractMaxWords });
  if (check.id === 'keywords') return label('checkKeywordsValue', { count:result.keywords.length, min:config.keywordsMin, max:config.keywordsMax });
  if (check.id === 'alphabetical') return label('keywordsHelp');
  return result.scope.matches.length ? label('scopeMatches', { terms:result.scope.matches.join(', ') }) : label('scopeHeuristic');
}
function update() {
  const result = evaluate(getManuscript(), config);
  $('hero-count').textContent = result.passed;
  $('hero-total').textContent = result.total;
  $('hero-status').textContent = label(result.passed === result.total ? 'statusReady' : 'statusPending');
  $('hero-bar').style.width = `${result.percentage}%`;
  $('summary-count').textContent = result.passed;
  $('summary-total').textContent = result.total;
  $('score-badge').textContent = `${result.percentage}%`;
  $('summary-bar').style.width = `${result.percentage}%`;
  $('title-count').textContent = result.words.title;
  $('abstract-count').textContent = result.words.abstract;
  $('keywords-count').textContent = result.keywords.length;
  const completed = result.confirmations.filter(c => c.pass).length;
  $('confirm-count').textContent = `${completed}/${result.confirmations.length}`;
  $('confirm-bar').style.width = `${result.confirmations.length ? 100 * completed / result.confirmations.length : 0}%`;
  $('checks').replaceChildren(...result.checks.map(c => {
    const row = document.createElement('div'); row.className = `check-row ${c.pass ? 'is-good' : ''}`;
    const icon = document.createElement('span'); icon.className = 'check-icon'; icon.textContent = c.pass ? '✓' : '–';
    const text = document.createElement('div'); text.className = 'check-detail';
    const bold = document.createElement('strong'); bold.textContent = label(checkNames[c.id]);
    const hint = document.createElement('small'); hint.textContent = checkDetail(c, result);
    text.append(bold, hint); row.append(icon, text); return row;
  }));
  return result;
}
function updateLanguage(next) {
  language = ['en','ar','ku','tr'].includes(next) ? next : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = rtl(language) ? 'rtl' : 'ltr';
  document.title = label('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = label(el.dataset.i18n); });
  document.querySelectorAll('[data-placeholder]').forEach(el => { el.placeholder = label(el.dataset.placeholder); });
  document.querySelectorAll('[data-aria-label]').forEach(el => { el.setAttribute('aria-label', label(el.dataset.ariaLabel)); });
  $('language').value = language;
  renderJournal(); update();
  if (!fileSummary) renderFileStatus();
  else renderFile();
}
function renderFile() {
  if (!fileSummary) return;
  const r = fileSummary;
  $('file-info').className = 'file-report';
  const container = $('file-info'); container.replaceChildren();
  const name = document.createElement('strong'); name.textContent = fileDescription?.name || ''; name.dir = 'auto';
  const note = document.createElement('p'); note.textContent = `${r.words} ${label('words')} · ${label('fileSize', {count:Math.round(fileDescription.bytes / 1024)})}${fileDescription?.pages ? ` · ${label('filePages', {count:fileDescription.pages})}` : ''}`;
  const ul = document.createElement('ul');
  const headings = [['abstract','headingAbstract'],['keywords','headingKeywords'],['methods','headingMethods'],['references','headingReferences']];
  for (const [key,title] of headings) {
    const li = document.createElement('li'); li.className = r.headings[key] ? 'file-good' : 'file-warn';
    li.textContent = `${r.headings[key] ? '✓' : '○'} ${label(title)}: ${label(r.headings[key] ? 'detected' : 'notDetected')}`; ul.append(li);
  }
  const li = document.createElement('li'); li.textContent = r.dois.length ? `${label('doiPatterns', {count:r.dois.length})}: ${r.dois.slice(0,3).join(' · ')}` : label('noDois'); ul.append(li);
  const hint = document.createElement('p'); hint.textContent = label('headingNote');
  container.append(name, note, ul, hint);
  for (const text of parsingNotes({...fileDescription,words:r.words})) { const p=document.createElement('p');p.textContent=text;container.append(p); }
  $('doi-zone').hidden = r.dois.length === 0;
  renderDoi();
}
async function onUpload() {
  invalidateFile();
  const generation = fileGeneration;
  const file = $('manuscript-file').files?.[0];
  if (!file) { renderFileStatus(); return; }
  fileStatus = {key:'fileInspecting'}; renderFileStatus();
  $('doi-zone').hidden = true; checkedDoi = null;
  try {
    const extracted = await readManuscriptFile(file);
    if (generation !== fileGeneration) return;
    fileSummary = inspectText(extracted.text, extracted.structureText);
    fileDescription = { name:file.name, bytes:file.size, format:extracted.format, notes:extracted.notes, missingNotes:extracted.missingNotes, pages:extracted.pages, partial:extracted.partial };
    fileStatus = null;
    renderFile();
  } catch (e) {
    if (generation !== fileGeneration) return;
    fileSummary = null; fileDescription = null;
    const key = e.name === 'PasswordException' ? 'filePassword' : e.name === 'InvalidPDFException' ? 'fileInvalidPdf' : typeof e.code === 'string' && label(e.code) !== e.code ? e.code : 'fileReadError';
    fileStatus = { key, error:true }; renderFileStatus();
  }
}
async function verifyDoi() {
  if (!fileSummary?.dois?.length) return;
  const doi = fileSummary.dois[0]; if (!isDoi(doi)) return;
  const generation = fileGeneration;
  const controller = new AbortController();
  doiController?.abort(); doiController = controller;
  const current = () => generation === fileGeneration && doiController === controller;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  const button = $('verify-doi'); checkedDoi = null; button.disabled = true; $('doi-result').textContent = label('verifyPending');
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { headers:{ Accept:'application/json' }, signal:controller.signal, referrerPolicy:'no-referrer', credentials:'omit' });
    if (!current()) return;
    if (response.status === 404) checkedDoi = {key:'verifyNotFound',params:{doi}};
    else if (response.status === 429) checkedDoi = {key:'verifyRateLimit'};
    else if (!response.ok) checkedDoi = {key:'verifyHttp',params:{status:response.status}};
    else { const data = await response.json(); if (!current()) return; checkedDoi = {key:'verifyFound',params:{title:String(data.message?.title?.[0] || doi).slice(0,180)}}; }
  } catch { if (current()) checkedDoi = {key:timedOut ? 'verifyTimeout' : 'verifyFailed'}; }
  finally { clearTimeout(timer); if (current()) { doiController = null; button.disabled = false; renderDoi(); } }
}
function download(filename, content, mime) {
  const href = URL.createObjectURL(new Blob([content], { type:mime }));
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
function reportData() {
  const evaluation = update();
  const localizedEvaluation = { ...evaluation, confirmations:evaluation.confirmations.map(c => ({...c, description:journalText(language, 'confirmation', c.description)})), checks:evaluation.checks.map(check => ({ ...check, values:checkDetail(check, evaluation) })) };
  return { generatedAt: new Date().toISOString(), language, project:'Open Journal Checker', version:VERSION, journal:config.journalName,
    disclaimer:label('advisoryReport'), manuscript:getManuscript(), evaluation:localizedEvaluation,
    fileInspection:fileSummary ? { filename:fileDescription?.name, ...fileSummary, note:label('headingNote'), format:fileDescription.format, notes:fileDescription.notes, missingNotes:fileDescription.missingNotes, pages:fileDescription?.pages, partial:fileDescription?.partial } : null,
    crossrefResult:checkedDoi ? label(checkedDoi.key, checkedDoi.params) : null };
}
function renderReportHtml(data) {
  const { evaluation:r, manuscript:m } = data;
  const lang = ['en','ar','ku','tr'].includes(data.language) ? data.language : language;
  const L = (key, params) => t(lang, key, params);
  const E = escapeHtml;
  const li = (a,b) => `<tr><td dir="auto">${E(a)}</td><td dir="auto">${E(b)}</td></tr>`;
  const list = [ ...r.checks.map(c=>li(L(checkNames[c.id]), L(c.pass ? 'pass' : 'pending'))),
    ...r.confirmations.map(c=>li(journalText(lang, 'confirmation', c.description),L(c.pass ? 'confirmed' : 'unconfirmed'))) ].join('');
  const file = data.fileInspection;
  const fileHtml = file ? `<h2>${E(L('fileInspection'))}</h2><p><bdi>${E(file.filename)}</bdi> — ${E(L('fileReportSummary',{words:file.words,dois:file.dois.length}))}</p><p>${E(L('headingNote'))}</p>${parsingNotes(file,L).map(text=>`<p>${E(text)}</p>`).join('')}` : `<p>${E(L('notInspected'))}</p>`;
  return `<!doctype html><html lang="${lang}" dir="${rtl(lang) ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><title>${E(L('reportTitle'))} — ${E(journalText(lang, 'name', data.journal))}</title><style>body{max-width:760px;margin:45px auto;font:14px/1.6 Arial,sans-serif;color:#182d42;padding:0 25px;overflow-wrap:anywhere}h1{font-size:25px}h2{font-size:18px;margin-top:28px}table{border-collapse:collapse;width:100%}td{padding:9px;border-bottom:1px solid #dce5eb;vertical-align:top}td:last-child{font-weight:bold}.muted{color:#546579}.badge{background:#edf5f2;padding:10px 12px;border-radius:5px}.note{color:#91591f}@media print{body{margin:20px auto}}</style></head><body><h1><bdi>${E(journalText(lang, 'name', data.journal))}</bdi> — ${E(L('reportTitle'))}</h1><p class="muted">${E(L('generated'))}: ${E(new Date(data.generatedAt).toLocaleString(lang))} · Open Journal Checker (Apache-2.0).</p><p class="badge"><strong>${r.passed}/${r.total} ${E(L('checkComplete'))} (${r.percentage}%)</strong></p><h2>${E(L('manuscript'))}</h2><p><strong>${E(L('title'))}:</strong> <bdi>${E(m.title || L('notEntered'))}</bdi></p><p><strong>${E(L('articleType'))}:</strong> <bdi>${E(journalText(lang, 'article', m.articleType) || L('notSelected'))}</bdi> · <strong>${E(L('subject'))}:</strong> <bdi>${E(journalText(lang, 'subject', m.subject) || L('notSelected'))}</bdi></p><p><strong>${E(L('abstract'))}:</strong> ${r.words.abstract} ${E(L('words'))} · <strong>${E(L('keywords'))}:</strong> <bdi>${E(m.keywords || L('notEntered'))}</bdi></p><h2>${E(L('checklist'))}</h2><table>${list}</table>${fileHtml}<h2>${E(L('important'))}</h2><p class="note">${E(L('advisoryReport'))} ${E(L('reportGuidance'))}</p><p class="muted">${E(L('journalContentNote'))}</p></body></html>`;
}

function openSettings() {
  const form = $('settings-form');
  const flat = ['journalName','journalShortName','journalWebsite','guidelinesUrl','submissionUrl','logoUrl','accent','titleMaxWords','abstractMinWords','abstractMaxWords','keywordsMin','keywordsMax','extraGuidance'];
  for (const k of flat) form.elements[k].value = config[k] ?? '';
  form.elements.articleTypes.value = config.articleTypes.join('\n');
  form.elements.subjects.value = config.subjects.map(s=>`${s.name} | ${s.terms.join(', ')}`).join('\n');
  form.elements.confirmations.value = config.confirmations.join('\n');
  $('settings-dialog').showModal();
}
function saveSettings(e) {
  e.preventDefault();
  const f = $('settings-form').elements;
  const keys = ['journalName','journalShortName','journalWebsite','guidelinesUrl','submissionUrl','logoUrl','accent','titleMaxWords','abstractMinWords','abstractMaxWords','keywordsMin','keywordsMax','extraGuidance'];
  const proposed = Object.fromEntries(keys.map(k=>[k,f[k].value]));
  proposed.articleTypes = f.articleTypes.value.split(/\r?\n/);
  proposed.subjects = parseSubjects(f.subjects.value);
  proposed.confirmations = f.confirmations.value.split(/\r?\n/);
  replaceConfig(proposed);
  const saved = persistConfig();
  $('settings-dialog').close(); renderJournal(); update(); flash(label(saved ? 'saved' : 'storageUnavailable'), !saved);
}
function clearEntries() {
  invalidateFile();
  ['title','abstract','keywords'].forEach(id=>{ $(id).value=''; });
  ['article-type','subject'].forEach(id=>{ $(id).value=''; });
  $('manuscript-file').value = ''; confirmationSet.clear(); renderConfirmations();
  fileSummary=null;fileDescription=null;checkedDoi=null;$('file-info').className='file-empty';$('file-info').textContent=label('fileIdle');$('doi-zone').hidden=true; update();flash(label('cleared'));
}
function attach() {
  ['title','abstract','keywords'].forEach(id=> $(id).addEventListener('input',update));
  ['article-type','subject'].forEach(id=>$(id).addEventListener('change',update));
  $('language').addEventListener('change',e=>updateLanguage(e.target.value));
  $('manuscript-file').addEventListener('change',onUpload);
  $('verify-doi').addEventListener('click',verifyDoi);
  $('download-report').addEventListener('click',()=>{ download('manuscript-preparation-report.html',renderReportHtml(reportData()),'text/html;charset=utf-8');flash(label('reportSaved')); });
  $('download-json').addEventListener('click',()=>download('manuscript-preparation-report.json',JSON.stringify(reportData(),null,2),'application/json'));
  $('print').addEventListener('click',()=>window.print());
  $('clear').addEventListener('click',clearEntries);
  $('open-settings').addEventListener('click',openSettings);
  $('close-settings').addEventListener('click',()=>$('settings-dialog').close());
  $('settings-form').addEventListener('submit',saveSettings);
  $('config-export').addEventListener('click',()=>download('journal-settings.json',JSON.stringify(config,null,2),'application/json'));
  $('config-reset').addEventListener('click',()=>{ replaceConfig(DEFAULT_CONFIG); const saved=persistConfig(true); openSettings(); renderJournal();update();flash(label(saved ? 'reset' : 'storageUnavailable'),!saved); });
  $('config-import-trigger').addEventListener('click',()=>$('config-import').click());
  $('config-import').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try { if(file.size>100000)throw Object.assign(new Error('Configuration must be under 100 KB.'),{code:'configTooLarge'});
      replaceConfig(JSON.parse(await file.text()));const saved=persistConfig();openSettings();renderJournal();update();flash(label(saved ? 'saved' : 'storageUnavailable'),!saved);
    } catch(err){flash(label(err.code === 'configTooLarge' ? 'configTooLarge' : 'invalidConfig'),true)}finally{e.target.value='';}
  });
}
async function loadHostedConfig() {
  if (storedConfig()) return; // Local editor overrides a deployed preset.
  const revision = configRevision;
  try {
    const response = await fetch('./journal-settings.json', { cache: 'no-store' });
    if (!response.ok) return;
    const hosted = await response.json();
    if (revision !== configRevision || storedConfig()) return;
    replaceConfig(hosted);
    renderJournal(); update();
  } catch { /* Static host has no JSON configuration; use the built-in demo. */ }
}
attach(); updateLanguage('en'); loadHostedConfig();
