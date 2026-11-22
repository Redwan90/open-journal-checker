# Security and privacy policy

- Never commit credentials, API keys, tokens, real manuscript files, or private reviewer data.
- Manuscripts are processed in the browser only; this project has no application backend.
- Journal configuration (not manuscript data) is persisted in browser `localStorage` when an administrator saves it.
- The **PDF.js code** is loaded from the pinned jsDelivr package URL (PDF.js 6.5.438) when a PDF is selected. This is a script download, not a manuscript upload. For fully offline deployment, self-host the pinned PDF.js modules and update `js/files.js` and CSP.
- DOI checks are **opt-in** and transmit only the DOI to `api.crossref.org`.
- External URLs in journal configuration are restricted to HTTP(S); sanitize deployment configs and host logos on trusted HTTPS sites.
- This app does **not** authenticate administrators; the in-page settings are a convenience, not a secure administration panel. For centrally enforced policies, publish a read-only customized build or manage the configuration in your deployment pipeline.
- The browser's local PDF/DOCX text extraction is best-effort and not a malware scanner. Untrusted manuscripts should be handled with ordinary organizational endpoint-security protections.
- Due to DOI and PDF library lookups, the application is not fully offline unless those functions are disabled or self-hosted.

For vulnerabilities, use GitHub private vulnerability reporting if available rather than publicly filing exploit details.