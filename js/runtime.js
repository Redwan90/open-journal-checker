// Source-tree preview uses the pinned CDN. The release build replaces this
// module with a same-origin PDF.js location and a stricter CSP.
export const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/';

// Run the build once before previewing OCR from the source tree.
export const OCR_BASE = new URL('../dist/vendor/ocr/', import.meta.url).href;
