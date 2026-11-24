# Optional scanned-PDF text recognition

After normal PDF inspection, choose the manuscript language and select **Read scanned text with OCR**. English, Arabic with English, and Turkish with English are supported. The interface remains available in all four application languages. Kurdish OCR is deferred because the tested model did not recognize the native-script sample reliably.

OCR runs in a browser worker on this device. The published build serves the pinned Tesseract.js 7.0.0 engine, core and language models from the same site. These static assets are downloaded only when OCR starts; manuscript files and rendered pages are never uploaded. Model caching in browser databases is disabled. OCR text is not saved in browser storage, but downloaded reports include inspection results and a short preview.

The operation reads at most the first **5 pages**, allows **3 minutes**, accepts PDFs up to **15 MiB**, and renders each page within 2200 pixels per edge and four million pixels. Pages are processed sequentially. Cancel, clear, or replace the file to terminate work, including model loading. Cancellation or failure retains the previous completed inspection. Successful OCR replaces the file inspection; it does not fill manuscript metadata, confirm declarations, change scoring, or request Crossref verification.

Both report formats identify OCR results, page limits and possible recognition errors. Longer documents are explicitly marked partial. Proofread results against the original. Clear, upright printed text works best; handwriting, mathematical notation, tables, multi-column layouts and low-resolution scans may produce errors. Empty automatic segmentation is retried as one text block within the same limits.

For a source checkout, install dependencies and run `npm run build` before using OCR. Release archives contain all processing assets. A static HTTP server is required; this does not add a PWA or guarantee offline availability of a previously visited remote site.

The worker protocol is pinned to Tesseract.js 7.0.0 so cancellation is possible from initial model loading. Upgrades require the real-browser recognition and cancellation tests in addition to unit tests.
