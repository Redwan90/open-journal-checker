// Copyright 2026 Ridwan Shamoun. Licensed under Apache-2.0.
import { DEFAULT_CONFIG, normalizeConfig, parseSubjects } from './config.js';
import { evaluate, wordCount, parseKeywords, inspectText, isDoi } from './checker.js';
import { readManuscriptFile } from './files.js';
import { t, rtl } from './i18n.js';

const $ = id => document.getElementById(id);
const escapeHtml = input => String(input ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const urlSafe = v => { try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const STORAGE = 'open-journal-checker-config-v1';
let config;
try { config = normalizeConfig(JSON.parse(localStorage.getItem(STORAGE) || '{}')); } catch { config = normalizeConfig(); }
let language = 'en';
let fileSummary = null;
let fileDescription = null;
let checkedDoi = null;
let confirmationSet = new Set();
function replaceConfig(input) {
  const next = normalizeConfig(input);
  config = next;
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
  $('verify-doi').disabled = false;
  $('doi-result').textContent = '';
  $('doi-zone').hidden = true;
}
const label = key => t(language, key);
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
  $('journal-name').textContent = config.journalName;
  $('guidance').textContent = config.extraGuidance;
  setLink('journal-website', config.journalWebsite);
  setLink('guidelines-url', config.guidelinesUrl);
  setLink('submission-url', config.submissionUrl);
  $('title-max').textContent = config.titleMaxWords;
  $('abstract-range').textContent = `${config.abstractMinWords}–${config.abstractMaxWords}`;
  const m = getManuscript();
  $('article-type').replaceChildren(new Option(label('articleHint'), ''), ...config.articleTypes.map(v => new Option(v, v)));
  $('subject').replaceChildren(new Option(label('subjectHint'), ''), ...config.subjects.map(v => new Option(v.name, v.name)));
  $('article-type').value = config.articleTypes.includes(m.articleType) ? m.articleType : '';
  $('subject').value = config.subjects.some(s => s.name === m.subject) ? m.subject : '';
  renderConfirmations();
}
function renderConfirmations() {
  confirmationSet = new Set([...confirmationSet].filter(i => i >= 0 && i < config.confirmations.length));
  $('confirmations').replaceChildren(...config.confirmations.map((description, i) => {
    const el = document.createElement('label'); el.className = 'confirm-item';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = confirmationSet.has(i); checkbox.setAttribute('aria-label', description);
    checkbox.addEventListener('change', () => { checkbox.checked ? confirmationSet.add(i) : confirmationSet.delete(i); update(); });
    const copy = document.createElement('span'); copy.textContent = description; el.append(checkbox, copy); return el;
  }));
}
const checkNames = { title:'titleCheck', abstract:'abstractCheck', keywords:'keywordsCheck', alphabetical:'alphabeticalCheck', scope:'scopeCheck' };
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
    const hint = document.createElement('small'); hint.textContent = c.values;
    text.append(bold, hint); row.append(icon, text); return row;
  }));
  return result;
}
function updateLanguage(next) {
  language = ['en','ar','ku','tr'].includes(next) ? next : 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = rtl(language) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = label(el.dataset.i18n); });
  document.querySelectorAll('[data-placeholder]').forEach(el => { el.placeholder = label(el.dataset.placeholder); });
  $('language').value = language;
  renderJournal(); update();
  if (!fileSummary) $('file-info').textContent = label('fileIdle');
  else renderFile();
}
function renderFile() {
  if (!fileSummary) return;
  const r = fileSummary;
  $('file-info').className = 'file-report';
  const container = $('file-info'); container.replaceChildren();
  const name = document.createElement('strong'); name.textContent = fileDescription?.name || '';
  const note = document.createElement('p'); note.textContent = `${r.words} ${label('words')} · ${fileDescription?.size || ''}${fileDescription?.pages ? ` · ${fileDescription.pages} pages` : ''}${fileDescription?.partial ? ' · first 30 pages inspected' : ''}`;
  const ul = document.createElement('ul');
  const headings = [['abstract','Abstract heading'],['keywords','Keywords heading'],['methods','Methods heading'],['references','References heading']];
  for (const [key,title] of headings) {
    const li = document.createElement('li'); li.className = r.headings[key] ? 'file-good' : 'file-warn';
    li.textContent = `${r.headings[key] ? '✓' : '○'} ${title}: ${label(r.headings[key] ? 'detected' : 'notDetected')}`; ul.append(li);
  }
  const li = document.createElement('li'); li.textContent = r.dois.length ? `${r.dois.length} DOI pattern(s): ${r.dois.slice(0,3).join(' · ')}` : label('noDois'); ul.append(li);
  const hint = document.createElement('p'); hint.textContent = r.note;
  container.append(name, note, ul, hint);
  $('doi-zone').hidden = r.dois.length === 0;
  $('doi-result').textContent = checkedDoi || '';
}
async function onUpload() {
  invalidateFile();
  const generation = fileGeneration;
  const file = $('manuscript-file').files?.[0];
  if (!file) { $('file-info').textContent = label('fileIdle'); return; }
  $('file-info').className = 'file-empty'; $('file-info').textContent = 'Inspecting manuscript locally…';
  $('doi-zone').hidden = true; checkedDoi = null;
  try {
    const extracted = await readManuscriptFile(file);
    if (generation !== fileGeneration) return;
    fileSummary = inspectText(extracted.text);
    fileDescription = { name:file.name, size:`${(file.size / 1024).toFixed(0)} KB`, pages:extracted.pages, partial:extracted.partial };
    renderFile();
  } catch (e) {
    if (generation !== fileGeneration) return;
    fileSummary = null; fileDescription = null;
    $('file-info').textContent = e.message || 'Unable to inspect the selected file.';
    $('file-info').className = 'error file-empty';
  }
}
async function verifyDoi() {
  if (!fileSummary?.dois?.length) return;
  const doi = fileSummary.dois[0]; if (!isDoi(doi)) return;
  const generation = fileGeneration;
  const controller = new AbortController();
  doiController?.abort(); doiController = controller;
  const current = () => generation === fileGeneration && doiController === controller;
  const button = $('verify-doi'); button.disabled = true; $('doi-result').textContent = label('verifyPending');
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { headers:{ Accept:'application/json' }, signal:controller.signal, referrerPolicy:'no-referrer', credentials:'omit' });
    if (!current()) return;
    if (response.status === 404) checkedDoi = `DOI not found in Crossref: ${doi} (does not necessarily mean invalid).`;
    else if (!response.ok) checkedDoi = `Crossref returned HTTP ${response.status}.`;
    else { const data = await response.json(); if (!current()) return; checkedDoi = `Crossref record found: ${(data.message?.title?.[0] || doi).slice(0,180)}.`; }
  } catch { if (current()) checkedDoi = 'Could not connect to Crossref. Try again later.'; }
  finally { if (current()) { doiController = null; button.disabled = false; $('doi-result').textContent = checkedDoi; } }
}
function download(filename, content, mime) {
  const href = URL.createObjectURL(new Blob([content], { type:mime }));
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
function reportData() {
  return { generatedAt: new Date().toISOString(), project:'Open Journal Checker', version:'1.0.0', journal:config.journalName,
    disclaimer:'Advisory preparation report; not an editorial decision or plagiarism check.', manuscript:getManuscript(), evaluation:update(),
    fileInspection:fileSummary ? { filename:fileDescription?.name, ...fileSummary, pages:fileDescription?.pages, partial:fileDescription?.partial } : null,
    crossrefResult:checkedDoi };
}
function renderReportHtml(data) {
  const { evaluation:r, manuscript:m } = data;
  const li = (a,b) => `<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`;
  const list = [ ...r.checks.map(c=>li(label(checkNames[c.id]), c.pass ? 'PASS' : 'TO CHECK')),
    ...r.confirmations.map(c=>li(c.description,c.pass ? 'CONFIRMED' : 'UNCONFIRMED')) ].join('');
  const file = data.fileInspection;
  const fileHtml = file ? `<h2>File inspection</h2><p>${escapeHtml(file.filename)} — ${file.words} words, ${file.dois.length} DOI patterns.</p><p>${escapeHtml(file.note)}</p>` : '<p>No manuscript file was inspected.</p>';
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Preparation report — ${escapeHtml(data.journal)}</title><style>body{max-width:760px;margin:45px auto;font:14px/1.6 Arial,sans-serif;color:#182d42;padding:0 25px}h1{font-size:25px}h2{font-size:18px;margin-top:28px}table{border-collapse:collapse;width:100%}td{padding:9px;border-bottom:1px solid #dce5eb;vertical-align:top}td:last-child{font-weight:bold;white-space:nowrap}.muted{color:#637687}.badge{background:#edf5f2;padding:10px 12px;border-radius:5px}.note{color:#985e24}@media print{body{margin:20px auto}}</style></head><body><h1>${escapeHtml(data.journal)} — Author preparation report</h1><p class="muted">Generated ${escapeHtml(data.generatedAt)} by Open Journal Checker (Apache-2.0).</p><p class="badge"><strong>${r.passed}/${r.total} checks complete (${r.percentage}%)</strong></p><h2>Manuscript</h2><p><strong>Title:</strong> ${escapeHtml(m.title || 'Not entered')}</p><p><strong>Article type:</strong> ${escapeHtml(m.articleType || 'Not selected')} · <strong>Subject:</strong> ${escapeHtml(m.subject || 'Not selected')}</p><p><strong>Abstract:</strong> ${r.words.abstract} words · <strong>Keywords:</strong> ${escapeHtml(m.keywords || 'Not entered')}</p><h2>Checklist</h2><table>${list}</table>${fileHtml}<h2>Important</h2><p class="note">${escapeHtml(data.disclaimer)} Review the current journal guidelines. Scores are not a measure of scientific quality or acceptance likelihood.</p></body></html>`;
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
  localStorage.setItem(STORAGE, JSON.stringify(config));
  $('settings-dialog').close(); renderJournal(); update(); flash(label('saved'));
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
  $('config-reset').addEventListener('click',()=>{ replaceConfig(DEFAULT_CONFIG); localStorage.removeItem(STORAGE); openSettings(); renderJournal();update();flash(label('reset')); });
  $('config-import-trigger').addEventListener('click',()=>$('config-import').click());
  $('config-import').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try { if(file.size>100000)throw new Error('Configuration must be under 100 KB.');
      replaceConfig(JSON.parse(await file.text()));localStorage.setItem(STORAGE,JSON.stringify(config));openSettings();renderJournal();update();flash(label('saved'));
    } catch(err){flash(`${label('invalidConfig')} ${err.message}`,true)}finally{e.target.value='';}
  });
}
async function loadHostedConfig() {
  if (localStorage.getItem(STORAGE)) return; // Local editor overrides a deployed preset.
  try {
    const response = await fetch('./journal-settings.json', { cache: 'no-store' });
    if (!response.ok) return;
    const hosted = await response.json();
    replaceConfig(hosted);
    renderJournal(); update();
  } catch { /* Static host has no JSON configuration; use the built-in demo. */ }
}
attach(); updateLanguage('en'); loadHostedConfig();
