# Integration with Open Journal Systems (OJS)

Open Journal Checker is a **standalone web application**. It does not include a native PKP/OJS plugin, access the OJS database, import uploaded submissions, or transfer manuscripts into OJS. Authors continue submitting through the journal's existing OJS workflow.

## Set up the checker

1. Extract a ready-to-host release and serve it over HTTPS, either in a separate `/checker/` directory or on a separate static host. Keep the existing OJS installation and its files unchanged.
2. Open **Journal settings** in the checker. Enter the journal name, website, author-guideline and submission-page URLs, article types, subject areas, word limits and declarations. The **Change in journal settings** shortcuts beside metadata, declarations and journal guidance open the relevant field directly.
3. For the return URL, copy the journal's public **Submissions** link from OJS. The tested OJS 3.5 route is `https://journal.example.org/index.php/journal-path/about/submissions`; installations with different routing or themes can use a different URL. Copy the actual URL rather than substituting an assumed route.
4. Add administrator-approved wording under **Journal translations (optional)** if needed. Save before exporting: the export contains the saved configuration, not unsaved edits.
5. Export the configuration, name it `journal-settings.json`, and deploy it beside the checker's `index.html`. Local edits alone do not change the settings seen by other visitors.
6. Test in a fresh browser profile. Previously saved local settings take precedence over hosted settings; use **Reset demo configuration** and reload, or a fresh profile, to check the deployed preset.

The ready-to-host build includes its own PDF.js reader. Crossref verification remains an optional online request. A source checkout can load PDF.js from a CDN, so use the built release when testing self-hosted operation.

## Add the navigation link in OJS 3.5

These steps were exercised on OJS **3.5.0-6**, using its Default Theme:

1. Sign in as a journal manager or site administrator with access to the journal.
2. Open **Settings → Website → Setup → Navigation**.
3. Under **Navigation Menu Items**, select **Add item**.
4. Enter a title such as **Prepare your manuscript**, choose **Remote URL**, and enter the full HTTPS checker URL. Save the item.
5. Edit **Primary Navigation Menu**. Move the new item from **Unassigned Menu Items** to **Assigned Menu Items**, preferably at the top level. Save the menu. Creating an item alone does not make it appear on the journal homepage.
6. Open the public journal homepage in a fresh, logged-out browser session and follow the link.
7. Confirm the checker loads the correct journal's rules, then follow **Open journal submission** back to the journal's public Submissions page. Authors log in and submit through OJS from there.

If the journal has several OJS interface languages, provide appropriate menu titles using OJS's language controls. The checker has its own language selector; this integration does not synchronize OJS login sessions or language preferences.

PKP documents the navigation controls in its [OJS 3.5 appearance guide](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/journal-managers/en/appearance.md#customize-navigation-and-add-new-pages-navigation). Themes and older OJS versions may place these controls elsewhere.

## Verification record

Checked on **2026-11-23** using a newly installed, isolated OJS instance with synthetic journal data. No MWSJ installation was edited.

| Environment | Result |
| --- | --- |
| OJS 3.5.0-6, Default Theme, PHP 8.3.30, MySQL 8.4.3, Windows | Navigation item created and assigned through OJS's management interface; public journal link verified |
| Chromium and Firefox, fresh logged-out sessions | OJS homepage → checker → public OJS Submissions page passed |
| Built checker on a separate local hostname | Hosted journal preset loaded; synthetic PDF and DOCX inspection passed without contacting OJS |
| Return request | GET navigation to the configured OJS URL; no synthetic manuscript title or filename sent in request URLs or bodies |
| OJS 3.4, other themes, production HTTPS/reverse-proxy setups | Not exercised in this test; verify on staging before rollout |

The lab used loopback HTTP only, with private uploads outside the web root and no real manuscripts. Its CLI installer wrapper supplied the non-default database port explicitly; the PHP FTP extension was enabled for the test process. These are local setup details, not required changes to a production journal. The test verifies a navigation-link integration, not a plugin, an OJS upgrade, a submission transfer, or comprehensive OJS security/accessibility compliance.

The round-trip test also exposed a desktop layout defect in the checker: the sticky readiness card could cover the submission link. Version 1.2.1 keeps that card in normal document flow. Browser regression tests exercise the return link after inspection in all four languages, against both source and built pages.

## Repeat the round-trip check

The optional smoke test uses an **already configured staging journal**. It does not create a journal, edit OJS settings, sign in, or submit files. Install the project's development dependencies and Playwright browsers first, then set the three URLs to match your staging setup. `OJS_SUBMISSION_URL` should be the final public page URL, without a login redirect.

PowerShell example:

```powershell
npm ci
npx playwright install chromium firefox
$env:OJS_JOURNAL_URL = 'https://staging.example.org/index.php/test-journal'
$env:CHECKER_URL = 'https://checker-staging.example.org/'
$env:OJS_SUBMISSION_URL = 'https://staging.example.org/index.php/test-journal/about/submissions'
npm run test:ojs
$env:OJS_TEST_BROWSER = 'firefox'
npm run test:ojs
```

The default menu title expected by the test is **Prepare your manuscript**. Set `OJS_CHECKER_LINK_TEXT` if your staging menu uses another title. The test selects the English checker interface, inspects synthetic in-memory PDF/DOCX fixtures, verifies no requests reach the OJS origin during inspection, and checks the return navigation for manuscript data. Its strict origin-based privacy assertion requires distinct OJS and checker origins; same-origin deployments need a tailored static-asset allowlist. It expects the default same-tab OJS menu link and the checker's new-tab return link; a customized theme may need a tailored test. The ordinary CI suite uses controlled return-page fixtures; it does not claim to install OJS on every run.

## Hosting and privacy notes

- Use HTTPS in production. A normal link is sufficient; an iframe is unnecessary and may be blocked by either site's security policy.
- Publish one checker preset per journal, or separate checker deployments, when journals use different rules. There is no automatic OJS journal selection or authentication exchange.
- Restrict server-side file changes to authorized administrators. The checker's settings dialog changes a visitor's local browser configuration and is not an administrative authentication system.
- Authors choose a file locally in the checker and upload it separately when submitting in OJS. A downloaded preparation report is advisory, not proof that OJS requirements are met.
- A future native plugin would require separate version-specific development and testing. This guide does not install one.
