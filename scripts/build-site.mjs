import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { VERSION } from '../js/version.js';

const root=resolve('.'), destination=resolve(root,'dist');
if(destination!==root+sep+'dist') throw new Error('Unexpected build output path');
const dependency=JSON.parse(await readFile(resolve(root,'node_modules/pdfjs-dist/package.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(pkg.version!==VERSION || dependency.version!==pkg.devDependencies['pdfjs-dist']) throw new Error('Version mismatch');
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
for(const file of ['index.html','style.css','journal-settings.json','LICENSE','README.md','SECURITY.md','CHANGELOG.md','CITATION.cff','THIRD-PARTY-NOTICES.md']) {
  await cp(resolve(root,file),resolve(destination,file));
}
await mkdir(resolve(destination,'docs'),{recursive:true});
await cp(resolve(root,'docs/OJS-INTEGRATION.md'),resolve(destination,'docs/OJS-INTEGRATION.md'));
await cp(resolve(root,'js'),resolve(destination,'js'),{recursive:true});
const vendor=resolve(destination,'vendor/pdfjs');
await mkdir(resolve(vendor,'build'),{recursive:true});
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs']) await cp(resolve(root,'node_modules/pdfjs-dist/build',file),resolve(vendor,'build',file));
for(const directory of ['cmaps','standard_fonts','wasm','iccs']) await cp(resolve(root,'node_modules/pdfjs-dist',directory),resolve(vendor,directory),{recursive:true});
await cp(resolve(root,'node_modules/pdfjs-dist/LICENSE'),resolve(vendor,'LICENSE'));
await writeFile(resolve(destination,'js/runtime.js'),"// Generated same-origin PDF.js configuration.\nexport const PDFJS_BASE = new URL('../vendor/pdfjs/', import.meta.url).href;\n");
const source=await readFile(resolve(destination,'index.html'),'utf8');
const html=source.replaceAll(' https://cdn.jsdelivr.net','')
  .replace('data-i18n="fileLimit"','data-i18n="fileLimitLocal"')
  .replace('PDF requires internet to load the PDF.js reader.','Files are inspected on this device.');
await writeFile(resolve(destination,'index.html'),html);
await writeFile(resolve(destination,'.nojekyll'),'');
const commit=process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await writeFile(resolve(destination,'version.json'),JSON.stringify({version:VERSION,commit,pdfjs:dependency.version,pdfjsSource:'self-hosted'},null,2)+'\n');
console.log(`Built Open Journal Checker ${VERSION} with self-hosted PDF.js ${dependency.version}.`);
