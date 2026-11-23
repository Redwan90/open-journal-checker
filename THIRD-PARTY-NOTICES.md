# Third-party notices

Open Journal Checker original code is licensed under Apache-2.0; see `LICENSE`.

Ready-to-deploy builds include Mozilla PDF.js (`pdfjs-dist` 6.5.438), licensed under Apache-2.0, and its packaged support resources. PDF.js copyright/license headers remain in the distributed code. Its license is copied to `vendor/pdfjs/LICENSE`.

Bundled support resources retain their upstream notices alongside the files:

- Adobe CMaps: `vendor/pdfjs/cmaps/LICENSE`
- Standard fonts: `vendor/pdfjs/standard_fonts/LICENSE_FOXIT` and `LICENSE_LIBERATION`
- ICC profiles: `vendor/pdfjs/iccs/LICENSE`
- Decoder, color-management and JavaScript-engine support: the `LICENSE_*` files under `vendor/pdfjs/wasm/`

Consult those notices for each component's terms. The project's Apache-2.0 license does not replace them. Development-only test packages are not included in the deployed application.
