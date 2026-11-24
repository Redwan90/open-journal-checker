# Third-party notices

Open Journal Checker original code is licensed under Apache-2.0; see `LICENSE`.

Ready-to-deploy builds include Mozilla PDF.js (`pdfjs-dist` 6.5.438), licensed under Apache-2.0, and its packaged support resources. PDF.js copyright/license headers remain in the distributed code. Its license is copied to `vendor/pdfjs/LICENSE`.

Bundled support resources retain their upstream notices alongside the files:

- Adobe CMaps: `vendor/pdfjs/cmaps/LICENSE`
- Standard fonts: `vendor/pdfjs/standard_fonts/LICENSE_FOXIT` and `LICENSE_LIBERATION`
- ICC profiles: `vendor/pdfjs/iccs/LICENSE`
- Decoder, color-management and JavaScript-engine support: the `LICENSE_*` files under `vendor/pdfjs/wasm/`

Consult those notices for each component's terms. The project's Apache-2.0 license does not replace them. Development-only test packages are not included in the deployed application.

## Optional OCR

Tesseract.js 7.0.0 and tesseract.js-core 7.0.0: Apache-2.0. English, Arabic and Turkish model packages: @tesseract.js-data version 1.0.0. Upstream Naptha tessdata supplies Apache-2.0 licensing; package metadata declares MIT and is also preserved. Engine, bundled worker, core and tessdata license texts and language package metadata ship under vendor/ocr/licenses/. Sources: https://github.com/naptha/tesseract.js and https://github.com/naptha/tessdata .
