# Changelog

## 1.2.0 — 2026-11-23

- Add optional journal translations in English, Arabic, Kurdish Badini and Turkish for the journal name, article types, subject labels, guidance and author declarations, with a language-by-language settings editor.
- Preserve translations in saved, imported, exported and hosted settings and downloaded reports. Missing translations fall back to original wording or built-in demo translations.
- Bind translations to exact original text: changed or removed rules discard stale translations, while language changes preserve canonical selections and confirmations. Saving settings still requires renewed author confirmation.
- Increase the journal JSON import limit to 1 MB to accommodate multilingual settings; keep all translated output as plain text.

## 1.1.2 — 2026-11-23

- Detect common abstract, keywords, methods and references headings in English, Arabic, Kurdish (Arabic and Latin scripts) and Turkish, independently of the interface language.
- Support numbered labels, colon-separated text, Unicode diacritics, Arabic character variants and direction marks without altering manuscript content or readiness scores.
- Match complete heading labels to avoid treating prose mentions or footnotes as body headings. Add real PDF/DOCX extraction coverage and update the inspection guidance.

## 1.1.1 — 2026-11-23

- Translate default demo declarations, journal name, article types, subject labels and guidance in Arabic, Kurdish Badini and Turkish, including downloaded HTML reports.
- Preserve selections and confirmed declarations across language changes, while keeping custom journal wording unchanged.
- Link Ridwan Shamoun’s footer credit to https://ridwanmarqas.com/ and the journal website to https://mwsjournal.com/.

## 1.1.0 — 2026-11-23

### Fixed

- Prevented stale file extraction and Crossref results from returning after clearing or replacing manuscripts.
- Required renewed author declarations when applying journal configuration.
- Protected local settings from delayed hosted responses and handled unavailable browser storage.
- Corrected PDF.js task cleanup and preserved PDF heading boundaries.
- Fixed narrow-screen overflow, keyboard configuration import, file-picker focus and default text contrast.
- Improved DOI punctuation handling, case-insensitive deduplication and timeout/rate-limit guidance.

### Added

- Application messages and HTML reports in English, Arabic, Kurdish Badini and Turkish, with RTL reports and localized diagnostics.
- DOCX breaks/tabs, run revision handling, referenced footnotes/endnotes and body-only heading checks.
- Archive/XML safeguards and explicit partial-inspection, image-only PDF and 30-page-limit notices.
- Chromium/Firefox regression tests using synthetic DOCX/PDF files and automated accessibility checks.
- A self-hosted PDF.js release build with bundled support resources and third-party licenses.
- Test-gated GitHub Pages deployment, immutable action references and deployment version metadata.

### Limits

Native-speaker and assistive-technology review remain outstanding. Text inspection is heuristic and does not provide OCR, full Word layout/revision rendering, plagiarism checks or editorial approval. The OJS integration is a standalone link, not a native plugin. See README for detailed extraction and privacy limits.

The original MWSJ checker remains unchanged.
