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
for(const file of ['OJS-INTEGRATION.md','ACCESSIBILITY.md','OCR.md']) await cp(resolve(root,'docs',file),resolve(destination,'docs',file));
await cp(resolve(root,'js'),resolve(destination,'js'),{recursive:true});
const vendor=resolve(destination,'vendor/pdfjs');
await mkdir(resolve(vendor,'build'),{recursive:true});
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs']) await cp(resolve(root,'node_modules/pdfjs-dist/build',file),resolve(vendor,'build',file));
for(const directory of ['cmaps','standard_fonts','wasm','iccs']) await cp(resolve(root,'node_modules/pdfjs-dist',directory),resolve(vendor,directory),{recursive:true});
await cp(resolve(root,'node_modules/pdfjs-dist/LICENSE'),resolve(vendor,'LICENSE'));
const ocr=resolve(destination,'vendor/ocr');
await mkdir(resolve(ocr,'core'),{recursive:true});await mkdir(resolve(ocr,'lang'),{recursive:true});await mkdir(resolve(ocr,'licenses'),{recursive:true});
for(const [name,expected] of [['tesseract.js','7.0.0'],['tesseract.js-core','7.0.0'],...['eng','ara','tur'].map(code=>['@tesseract.js-data/'+code,'1.0.0'])]) {
  const meta=JSON.parse(await readFile(resolve(root,'node_modules',name,'package.json'),'utf8'));
  if(meta.version!==expected || pkg.devDependencies[name]!==expected) throw new Error('OCR dependency version mismatch: '+name);
}
await cp(resolve(root,'node_modules/tesseract.js/dist/worker.min.js'),resolve(ocr,'worker.min.js'));
await cp(resolve(root,'node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt'),resolve(ocr,'licenses/worker-LICENSE.txt'));
await cp(resolve(root,'node_modules/tesseract.js/LICENSE.md'),resolve(ocr,'licenses/tesseract-LICENSE'));
await cp(resolve(root,'node_modules/tesseract.js-core/LICENSE'),resolve(ocr,'licenses/core-LICENSE'));
await cp(resolve(root,'licenses/tessdata-LICENSE'),resolve(ocr,'licenses/tessdata-LICENSE'));
for(const suffix of ['-lstm', '-simd-lstm', '-relaxedsimd-lstm']) await cp(resolve(root,'node_modules/tesseract.js-core',`tesseract-core${suffix}.wasm.js`),resolve(ocr,'core',`tesseract-core${suffix}.wasm.js`));
for(const code of ['eng','ara','tur']) {
  const folder='lang';
  const variant='4.0.0_best_int';
  await cp(resolve(root,'node_modules/@tesseract.js-data',code,variant,code+'.traineddata.gz'),resolve(ocr,folder,code+'.traineddata.gz'));
  await cp(resolve(root,'node_modules/@tesseract.js-data',code,'package.json'),resolve(ocr,'licenses',code+'-package.json'));
}
await writeFile(resolve(destination,'js/runtime.js'),"// Generated same-origin processing assets.\nexport const PDFJS_BASE = new URL('../vendor/pdfjs/', import.meta.url).href;\nexport const OCR_BASE = new URL('../vendor/ocr/', import.meta.url).href;\n");
const source=await readFile(resolve(destination,'index.html'),'utf8');
const html=source.replaceAll(' https://cdn.jsdelivr.net','')
  .replace('data-i18n="fileLimit"','data-i18n="fileLimitLocal"')
  .replace('PDF requires internet to load the PDF.js reader.','Files are inspected on this device.');
await writeFile(resolve(destination,'index.html'),html);
await writeFile(resolve(destination,'.nojekyll'),'');
const commit=process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await writeFile(resolve(destination,'version.json'),JSON.stringify({version:VERSION,commit,pdfjs:dependency.version,pdfjsSource:'self-hosted',ocr:{engine:'7.0.0',core:'7.0.0',models:'1.0.0',source:'self-hosted'}},null,2)+'\n');
console.log(`Built Open Journal Checker ${VERSION} with self-hosted PDF.js ${dependency.version}.`);
