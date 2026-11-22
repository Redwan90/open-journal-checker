# Open Journal Checker

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2.0)

**A configurable, privacy-first manuscript preparation and submission-readiness checker for scholarly journals.** Created by Ridwan Shamoun.

Originally inspired by the publicly observable workflow of the [Milky Way Scientific Journal author preparation checker](https://mwsjournal.com/checker/), this is a new, independent and generic implementation. It does not copy the original application's code or any proprietary journal assets. The published MWSJ tool remains unchanged.

## Preview

Run the application locally with `python3 -m http.server 8000` or enable GitHub Pages to view the responsive interface.

## Features

- Configurable journal identity, article types, scope keywords, title/abstract/keyword rules, and author declarations
- Live readiness score: **five metadata checks plus ten confirmations by default** (the number varies with configuration)
- Preliminary subject-area matching based on text overlap (**not semantic peer review**)
- Browser-based DOCX inspection without a server upload
- Browser-based PDF text extraction, using PDF.js when online (first 30 pages)
- Checks for the presence of common English manuscript headings and DOI patterns
- Opt-in Crossref DOI lookup, sending **only the DOI**
- Download a standalone HTML report, export a structured JSON report, and print
- Export/import journal configurations as JSON; optional host-provided `journal-settings.json`
- English, Arabic, and Kurdish Badini UI options (community feedback on translations welcome)
- Accessible, responsive layouts and keyboard-friendly controls
- Deployment on GitHub Pages, Netlify, university servers, or ordinary static hosting

**Not provided:** plagiarism detection, actual Scopus/WoS indexing verification, citation quality scoring, editorial acceptance prediction, clinical research compliance certification, or integrated OJS submissions. No AI model is used to judge manuscripts.

## Quick start (no dependencies)

1. Unzip or clone this repository.
2. Run `python3 -m http.server 8000` from the repository directory.
3. Open `http://localhost:8000` in a modern browser.
4. Click **Journal settings** and customize your journal details.
5. Export `journal-settings.json` and copy it into the root folder of your hosted site. A hosted configuration is loaded on startup if no local override has been saved.

For a test run:

```bash
npm test
```

No `npm install` is required. Node.js 22+ is recommended for the test suite, but no Node.js is needed to serve the site.

## Deploy for a journal

- Copy all static files (`index.html`, `style.css`, `js/`, and optionally `journal-settings.json`) into your journal web server's `/checker/` directory.
- Ensure the server serves JavaScript modules with a valid MIME type and applies HTTPS.
- Configure `journal-settings.json` for your journal, and add a navigation link on your OJS site to `/checker/`.
- See [OJS integration instructions](docs/OJS-INTEGRATION.md).

**GitHub Pages:** Open your repository's **Settings → Pages → Deploy from a branch → main / root**, then open the site URL. The application runs entirely as a static website. If deploying under a subpath, its relative resource links should work unchanged.

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

## Privacy, licenses and security

Manuscript text is not uploaded or stored in the application. Temporary manuscript entries vanish when the page reloads. Journal settings alone are stored in `localStorage` once saved. PDF extraction loads PDF.js 6.5.438 code from jsDelivr; optional DOI verification makes a Crossref request. See [SECURITY.md](SECURITY.md).

The original software in this repository is licensed under the [Apache License 2.0](LICENSE), an [OSI-approved license](https://opensource.org/license/apache-2.0). Third-party PDF.js is separately licensed by its maintainers (Apache-2.0) and is fetched from a CDN only when needed. Using Apache-2.0 for this project does not imply that PKP/OJS itself is licensed under the same license.

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Academic users may cite the repo using [CITATION.cff](CITATION.cff).

## Roadmap

- Accessibility and translation review with native speakers
- Better PDF/DOCX heading and reference parsing, plus test fixtures
- Optional local/self-hosted PDF.js bundle for strict offline use
- More flexible scope engines with clear explanations
- A version-tested OJS plugin offering a pre-submission link (not yet available)
- Separate plugins/adapters for additional publishing platforms

## Support

File issues and pull requests in the GitHub repository after publishing. Please do not submit unpublished manuscripts, reviewer identities, or API keys in bug reports.