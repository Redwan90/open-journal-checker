# Changelog

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
