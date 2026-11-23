# Open Journal Checker

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2.0)

**Version 1.1.0** · [Release notes](CHANGELOG.md)

**A configurable, privacy-first manuscript preparation and submission-readiness checker for scholarly journals.** Created by Ridwan Shamoun.

Originally inspired by the publicly observable workflow of the [Milky Way Scientific Journal author preparation checker](https://mwsjournal.com/checker/), this is a new, independent and generic implementation. It does not copy the original application's code or any proprietary journal assets. The published MWSJ tool remains unchanged.

## Preview

Run the application locally with `python3 -m http.server 8000` or enable GitHub Pages to view the responsive interface.

## Features

- Configurable journal identity, article types, scope keywords, title/abstract/keyword rules, and author declarations
- Live readiness score: **five metadata checks plus ten confirmations by default** (the number varies with configuration)
- Preliminary subject-area matching based on text overlap (**not semantic peer review**)
- Browser-based DOCX inspection without a server upload
- Browser-based PDF text extraction (first 30 pages); release bundles self-host PDF.js
- Checks for the presence of common English manuscript headings and DOI patterns
- Opt-in Crossref DOI lookup, sending **only the DOI**
- Download a standalone HTML report, export a structured JSON report, and print
- Export/import journal configurations as JSON; optional host-provided `journal-settings.json`
- English, Arabic, Kurdish Badini, and Turkish UI options (community feedback on translations welcome)
- Accessible, responsive layouts and keyboard-friendly controls
- Deployment on GitHub Pages, Netlify, university servers, or ordinary static hosting

**Not provided:** plagiarism detection, actual Scopus/WoS indexing verification, citation quality scoring, editorial acceptance prediction, clinical research compliance certification, or integrated OJS submissions. No AI model is used to judge manuscripts.

## Quick start (no dependencies)

1. Download the ready-to-deploy `open-journal-checker-1.1.0.zip` from [Releases](https://github.com/Redwan90/open-journal-checker/releases/latest), or clone the source repository. The ready-to-deploy ZIP includes PDF.js; the source preview uses its pinned CDN.
2. Run `python3 -m http.server 8000` from the repository directory.
3. Open `http://localhost:8000` in a modern browser.
4. Click **Journal settings** and customize your journal details.
5. Export `journal-settings.json` and copy it into the root folder of your hosted site. A hosted configuration is loaded on startup if no local override has been saved.

For a test run:

```bash
npm test
```

No `npm install` is required. Node.js 22+ is recommended for the test suite, but no Node.js is needed to serve the site.

For browser regression tests, install the development-only dependencies and browsers:

```bash
npm ci
npx playwright install chromium firefox
npm run test:browser
```

These tests serve the actual application under `/open-journal-checker/` with its security policy enabled. They check Chromium and Firefox, narrow layouts in all four languages, keyboard controls, automated accessibility checks, scoring, report downloads and declaration resets. Automated checks do not replace screen-reader or native-speaker review. The browser command builds a self-hosted distribution and tests that it can inspect files with external requests blocked. Serving a ready-to-deploy ZIP needs no Node.js or package installation.

## Deploy for a journal

- Extract the ready-to-deploy ZIP into your journal web server’s `/checker/` directory, keeping `vendor/` and its licenses. Alternatively, run `npm ci` and `npm run build`, then deploy the contents of `dist/`. Do not publish the repository root or `node_modules/` for the release deployment.
- Ensure the server serves JavaScript modules with a valid MIME type and applies HTTPS.
- Configure `journal-settings.json` for your journal, and add a navigation link on your OJS site to `/checker/`.
- See [OJS integration instructions](docs/OJS-INTEGRATION.md).

**GitHub Pages:** Set **Settings → Pages → Source → GitHub Actions**. The workflow publishes only from `main`, after both core and Chromium/Firefox tests succeed, using the exact built artifact tested in that run. PRs cannot deploy. A freshness check skips a superseded commit. Failed checks retain the previous deployed site. The build uses relative paths, includes `.nojekyll`, and records its version/commit in `version.json`. Do not enable legacy branch publishing alongside this workflow.

## Self-hosted and offline inspection

`npm ci && npm run build` copies the exact PDF.js version in the lockfile, worker, CMaps, fonts, WASM/ICC support files and licenses into `dist/vendor/pdfjs/`. It rewrites the generated reader location and removes the CDN from the release CSP. Source files are unchanged, so the quick source preview remains available.

Serve the extracted release on a local static HTTP server to inspect files without external connectivity. This is not a PWA or a promise that a previously visited remote page stays available offline. Crossref verification still needs internet and stays opt-in. No OCR or native OJS submission transfer is added.

## Customization

The application ships with a generic demo configuration (`js/config.js`). To create a managed journal default, save this JSON file as **`journal-settings.json`** beside `index.html`:

```json
{
  "journalName": "Journal of Example Studies",
  "journalShortName": "JES",
  "journalWebsite": "https://journal.example.org",
  "guidelinesUrl": "https://journal.example.org/about/submissions",
  "submissionUrl": "https://journal.example.org/about/submissions",
  "accent": "#225d8f",
  "titleMaxWords": 20,
  "abstractMinWords": 150,
  "abstractMaxWords": 250,
  "keywordsMin": 3,
  "keywordsMax": 6,
  "articleTypes": ["Research Article", "Review Article"],
  "subjects": [{"name": "Computer Science", "terms": ["software", "computing", "algorithm"]}],
  "confirmations": ["All authors approved the paper.", "Competing interests have been disclosed."]
}
```

The settings interface is not an authentication or authorization system; any visitor may temporarily customize rules in their own browser. For policies that visitors must not change, publish a managed instance with settings controls removed and enforce submission rules in OJS.

## How scoring works

1. Nonempty title at or below maximum word count.
2. Abstract within journal-defined word-count range.
3. Required number of unique, semicolon-separated keywords.
4. Alphabetical keyword order.
5. At least one configured subject phrase appears in title, abstract or keywords.
6. Each selected author confirmation counts as one additional check.

This is **self-reported preparation**, not a scientific or editorial quality metric. Scope matching uses simple keyword patterns and can produce false positives/negatives. Heading detection uses English-language patterns and works best on text-based files. Scanned PDFs may contain no extractable text.

Saving, importing, resetting, or loading a hosted journal configuration clears all author confirmations, even if the declaration wording is unchanged. Authors must review and confirm the active journal rules again. Changing the interface language preserves confirmations.

A hosted configuration that finishes loading after a local save, import or reset is ignored. If browser storage is blocked or full, settings still apply to the current session and a notice explains that they could not be persisted.

DOI extraction combines case-insensitive duplicates and removes common trailing citation punctuation while preserving balanced parentheses. This remains a heuristic, not proof of registration or a complete parser for every historical DOI format. Crossref explains these [regular-expression limitations](https://www.crossref.org/blog/dois-and-matching-regular-expressions/). Optional Crossref requests time out after 15 seconds and provide retry guidance when rate-limited; a Crossref 404 does not prove that a DOI is invalid.

## File inspection limits

DOCX inspection preserves run text, paragraph/manual line breaks, tabs and table-cell boundaries. It includes inserted and moved-to run text and excludes deleted/moved-from run content. Nested text is visited once; for markup compatibility alternatives, the first Choice is used (or Fallback if no Choice exists). This is a text-reading heuristic, not full Word rendering or acceptance of every possible revision type.

Referenced footnotes and endnotes from standard `word/footnotes.xml` and `word/endnotes.xml` parts contribute to extracted word counts and DOI patterns. Note separators, unreferenced notes and notes referenced only from excluded run content are omitted. Body heading checks do not use note text. Missing referenced notes mark the inspection as partial and are disclosed in the interface and HTML/JSON reports.

The reader accepts transitional and strict WordprocessingML namespaces. It rejects DTDs, encrypted/ambiguous ZIP entries and malformed directory bounds. A 12 MiB input limit and one aggregate 12 MiB XML inflation budget cover body and note parts; XML traversal is also bounded. ZIP64 and split archives are unsupported. CRC/signature validation, style-based hidden text, headers/footers/comments, equation/image interpretation, complex revision types, custom part locations and exact layout remain outside this reader's scope.

PDF inspection reads text from at most the first 30 pages and reports that limit in the interface and reports. PDFs without extractable text receive an explicit warning: OCR is not provided. Text order and headings remain approximate for complex or multi-column layouts. Neither DOCX nor PDF inspection is a journal-formatting compliance certificate.

The revision model follows the Open XML distinction between [deleted](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.deletedrun) and [moved-from run content](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.movefromrun); full revision acceptance requires more than text extraction.

## Localization

The application interface, accessibility labels, validation hints, file errors/results, Crossref feedback and HTML reports support English, Arabic, Kurdish Badini and Turkish. Arabic and Kurdish reports use right-to-left layout. Language changes also refresh existing file errors and lookup results. Heading detection itself still uses English patterns; changing the interface language does not change this limitation or the readiness rules.

Journal names, article types, subject terms, policies and author declarations remain exactly as supplied by the journal. Manuscript text, filenames and Crossref titles are also preserved. The interface explains this distinction. JSON exports retain stable field names and ISO timestamps, add the selected `language`, and localize human-readable diagnostics.

Translations are in `js/i18n.js` and `js/messages.js`. Tests require equal key coverage and matching template parameters in every locale, and exercise localized downloads in Chromium and Firefox. Native-speaker review remains welcome, especially for Kurdish Badini; automated checks establish coverage and behavior, not linguistic certification.

## Privacy, licenses and security

Manuscript text is not uploaded or stored in the application. Temporary manuscript entries vanish when the page reloads. Journal settings alone are stored in `localStorage` once saved. The ready-to-deploy ZIP and GitHub Pages build load PDF.js 6.5.438 and its support files from the same origin. The unbuilt source preview uses the pinned jsDelivr URL. Optional DOI verification makes a Crossref request. See [SECURITY.md](SECURITY.md).

The original software in this repository is licensed under the [Apache License 2.0](LICENSE), an [OSI-approved license](https://opensource.org/license/apache-2.0). Third-party PDF.js is separately licensed by its maintainers (Apache-2.0), with additional bundled-component notices preserved under `vendor/pdfjs/` in release builds; see [third-party notices](THIRD-PARTY-NOTICES.md). Using Apache-2.0 for this project does not imply that PKP/OJS itself is licensed under the same license.

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Academic users may cite the repo using [CITATION.cff](CITATION.cff).

## Roadmap

- Accessibility and translation review with native speakers
- Better PDF/DOCX heading and reference parsing, plus test fixtures
- More flexible scope engines with clear explanations
- A version-tested OJS plugin offering a pre-submission link (not yet available)
- Separate plugins/adapters for additional publishing platforms

## Support

File issues and pull requests in the GitHub repository after publishing. Please do not submit unpublished manuscripts, reviewer identities, or API keys in bug reports.
