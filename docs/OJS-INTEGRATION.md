# Integration with Open Journal Systems (OJS)

The Open Journal Checker is a **standalone web application**. This release does **not** include a native PKP/OJS plugin, database integration, or manuscript transfer into OJS. Do not describe it as an OJS plugin or as a replacement for the OJS submission workflow.

## Recommended integration: a link before submission

1. Deploy this checker as a static site at, for example, `https://journal.example.org/checker/`.
2. In the checker, open **Journal settings** and provide your journal's name, author-guideline URL, submission URL, article types, subject areas, and checklist.
3. Export the settings as `journal-settings.json` and deploy it with the checker to make the new journal's defaults available to visitors.
4. Add a prominent **Prepare your manuscript** link in the journal's OJS website navigation or journal information pages using your site's supported theme/customization options.
5. In the checker, the **Open journal submission** link takes the user back to OJS.

Example HTML for a journal website / custom sidebar (if the theme allows trusted HTML):

```html
<a href="https://journal.example.org/checker/" rel="noopener">
  Prepare your manuscript before submission
</a>
```

## Optional development path

A future OJS plugin could add a preparation link on an author dashboard or pre-submission page using supported PKP hooks. Any plugin should be versioned for OJS 3.4 and 3.5 separately and should not silently read submissions or transmit files. Consult the official [PKP documentation](https://docs.pkp.sfu.ca/).

## Hosting notes

- Configure HTTPS and avoid embedding the tool in an iframe if your OJS site's security policy forbids it.
- For centrally managed journal rules, deploy your `journal-settings.json` and restrict who can modify files on the hosting server. The UI itself does not require login and allows local overrides.
- The web page cannot inspect uploaded OJS submissions; authors must select their file again in the checker.
