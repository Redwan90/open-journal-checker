# Changelog

## 1.3.2 — 2026-11-24

- Replace the remaining demo guideline and submission placeholder links with verified MWSJ destinations, including the author-guidelines anchor.
- Repair the two exact legacy links in saved demo configurations while retaining custom-journal and deliberately empty destinations.
- Keep demo rules generic and document that published journal guidelines take precedence. No change to the original MWSJ checker.

## 1.3.1 — 2026-11-24

- Keep combining accent and vowel marks inside words, correcting inflated Arabic and decomposed-Unicode word counts in metadata and file inspection.
- Accept Latin, Arabic and fullwidth semicolons as keyword separators.
- Reject canonically equivalent keyword duplicates while preserving original spelling in fields and reports.
- Verify counters, validation and both report formats in all four interface languages.

## 1.3.0 — 2026-11-24

- Add explicitly activated, local scanned-PDF OCR for English, Arabic and Turkish with self-hosted pinned processing assets. Kurdish OCR is deferred after native-script sample recognition failed.
- Limit OCR to five pages and three minutes, with bounded rendering and cancellation during initialization or recognition. Preserve the previous completed inspection on failure or cancellation.
- Mark OCR output and partial page coverage in both reports; leave manuscript metadata, declarations, scoring and optional DOI verification under author control.
- Translate OCR controls and statuses in all four interface languages; document privacy, accuracy and deployment limits.

## 1.2.2 — 2026-11-23

- Add a translated keyboard skip link to the manuscript form, with correct focus order.
- Give manuscript fields and file selection stable accessible names, with hints and counts exposed separately as descriptions.
- Expose readiness and confirmation progress values and localized check states to assistive technology; make the checklist title a heading.
- Keep the header, summary rows and disclaimer within a narrow viewport with increased text spacing and simulated 200% text enlargement; use a decorative vector arrow that stays inside its icon.
- Document the accessibility checks and remaining real screen-reader/device testing.

## 1.2.1 — 2026-11-23

- Fix the desktop readiness card overlapping journal guidance and blocking the return-to-submission link after file inspection.
- Add translated settings hints beside metadata, author declarations and journal guidance. Each shortcut opens and focuses the relevant settings field, with keyboard focus returned on closing.
- Clarify and verify the standalone navigation-link integration with OJS; no manuscript or author data is transferred. Include the OJS guide in release bundles so its README link works.

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
