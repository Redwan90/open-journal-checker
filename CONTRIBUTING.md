# Contributing to Open Journal Checker

Thanks for your interest. This project is designed for scholarly journal publishers, editors, developers, and authors.

1. Open an issue describing a bug, accessibility concern, or feature request.
2. Fork the repository and create a focused feature branch.
3. Keep manuscript contents local by default. Do not add analytics, document uploads, or hidden network calls.
4. Add or update `node:test` tests for changes in validation, configuration or file inspection.
5. Run `npm test`, test the application with a browser and submit a pull request.

Please do not include confidential manuscripts, proprietary journal content, API keys, passwords, or identifiable reviewer information in issues or tests. Contributions are submitted under the project's Apache-2.0 license.

## Suggested good first issues
- Additional locale translations (with native-speaker review)
- Accessibility audit, screen-reader labels, and keyboard navigation
- Expanded, evidence-based and configurable reference checks
- A packaged OJS 3.5-compatible integration plugin (separate repository and compatibility tests)
- Tests for complicated DOCX and PDF layouts