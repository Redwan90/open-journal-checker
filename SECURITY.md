# Security and privacy policy

- Never commit credentials, API keys, tokens, real manuscript files, or private reviewer data.
- Manuscripts are processed in the browser only; this project has no application backend.
- Journal configuration (not manuscript data) is persisted in browser `localStorage` when an administrator saves it.
- Ready-to-deploy releases and the Pages workflow bundle PDF.js 6.5.438 and support resources on the same origin, with no CDN script access in the release CSP. The unbuilt source preview still loads the pinned PDF.js code from jsDelivr. Neither mode uploads manuscript files.
- DOI checks are **opt-in** and transmit only the DOI to `api.crossref.org`.
- External URLs in journal configuration are restricted to HTTP(S); sanitize deployment configs and host logos on trusted HTTPS sites.
- This app does **not** authenticate administrators; the in-page settings are a convenience, not a secure administration panel. For centrally enforced policies, publish a read-only customized build or manage the configuration in your deployment pipeline.
- The browser's local PDF/DOCX text extraction is best-effort and not a malware scanner. Untrusted manuscripts should be handled with ordinary organizational endpoint-security protections.
- File inspection in a locally served release needs no external network. Crossref lookups remain opt-in and require internet. This is not a PWA/offline cache.
- Pages publishes only tested `main` artifacts after both test jobs succeed. PRs have no deployment permissions. Action references are pinned, and a freshness check skips superseded commits. Keep Pages source set to GitHub Actions; legacy branch publishing would bypass this gate.

For vulnerabilities, use GitHub private vulnerability reporting if available rather than publicly filing exploit details.