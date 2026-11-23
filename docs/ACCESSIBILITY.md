# Accessibility checks and remaining review

This document records checks of Open Journal Checker. It is not a WCAG conformance certification or a substitute for testing with people who use assistive technology.

## Verified behavior

The 2026-11-23 review used Chromium and Firefox on Windows with the English, Arabic, Kurdish Badini and Turkish interfaces.

- The first Tab stop is **Skip to manuscript form**. Enter focuses the metadata section; the following Tab reaches its settings shortcut without returning through the header.
- Title, abstract, keywords and manuscript file selection have stable accessible names. Word counts, format guidance and limits are associated descriptions rather than part of the field name.
- Readiness and confirmation bars expose a progress-bar role, name, minimum, maximum, current value and localized value text. Replacing journal declarations updates the maximum and clears confirmations.
- Metadata check icons expose localized pass/pending labels; decorative arrows, repeated section numbers and other ornaments are hidden from the accessibility tree.
- The readiness checklist has a heading. Native settings dialogs support Escape, focus restoration and relevant-field focus from the section shortcuts.
- At a 320 CSS-pixel viewport, increased text spacing and simulated 200% text-only enlargement retain horizontal reflow and access to settings controls. The simulated enlargement uses one snapshot of computed font sizes; it is not a claim to have exercised every browser's zoom controls.
- Automated axe checks cover the default page, settings dialog and expanded custom translation editor. Separate browser tests exercise the actual file picker, downloads and unobstructed return-to-journal link.

Before this change, the accessibility tree exposed the title field as `Manuscript title 0 words · Maximum 20`; the current name is `Manuscript title`, with the count/limit provided as its description. The visual progress bars previously had no progress-bar role. The enlarged-text probe reproduced header overflow in the English and Turkish layouts. GitHub’s Linux run exposed additional English overflow; allowing summary rows and the disclaimer to wrap also passed a wider-font probe. These are the verified issues addressed in version 1.2.2.

The review follows W3C's guidance on [input relationships and accessible names](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [keyboard bypass mechanisms](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html) and [user text-spacing overrides](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html). Text-spacing tests apply line height 1.5, paragraph spacing 2em and word spacing .16em; Latin-script interfaces additionally use letter spacing .12em. The Arabic-script tests omit Latin-style letter spacing.

## Repeat the browser checks

```sh
npm ci
npx playwright install chromium firefox
npm test
npm run test:browser
```

`tests/browser/accessible-navigation.spec.mjs` covers the new keyboard, field-name, progress and enlarged-text checks, including a built-release smoke test. Other accessibility, layout and return-link cases live alongside it. These tests inspect browser-exposed accessibility properties and real keyboard focus, not synthesized speech from a screen reader. Default-state axe results alone do not establish accessibility of every custom configuration or theme.

## Human review still required

- NVDA or JAWS with Windows browsers, including browse mode, forms mode, live file feedback and report reading.
- VoiceOver on Safari and TalkBack on Android, including physical-device file selection, touch exploration, mobile keyboard behavior and orientation changes.
- Actual browser zoom/text-size settings, OS display scaling, high-contrast/forced-colors settings and user styles beyond the tested overrides.
- Native-speaker review of Arabic, Kurdish Badini and Turkish pronunciation, instructions, reading order and custom declarations.
- End-to-end author tasks with users, including understanding the advisory score, correcting metadata and reaching the journal's submission page.

Record the browser, operating system, assistive-technology version, interface language, journal preset, exact steps and observed result when reporting an accessibility issue. Use synthetic manuscript content in public reports.
