// Pinned Tesseract.js 7 worker protocol. Owning the Worker directly allows
// cancellation during model initialization as well as recognition.
import { OCR_BASE } from './runtime.js';
export const OCR_LANGUAGES = ['eng','ara+eng','tur+eng'];
export const OCR_PAGE_LIMIT = 5;
export const OCR_TIMEOUT_MS = 180000;
const error = code => Object.assign(new Error(code), {code});
const abortReason = signal => signal.reason || new DOMException('Cancelled','AbortError');
export function abortable(promise, signal) {
  if (signal.aborted) {Promise.resolve(promise).catch(()=>{});return Promise.reject(abortReason(signal));}
  return new Promise((resolve,reject)=>{
    const abort=()=>{signal.removeEventListener('abort',abort);reject(abortReason(signal));};
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},reason=>{signal.removeEventListener('abort',abort);reject(reason);});
  });
}
export function createOcrEngine(signal, onProgress=()=>{}) {
  const worker = new Worker(new URL('worker.min.js',OCR_BASE));
  let sequence=0, stopped=false;
  const pending=new Map();
  const terminate = (reason=error('ocrFailed')) => {
    if (stopped) return;
    stopped=true;worker.terminate();signal.removeEventListener('abort',abort);
    for (const job of pending.values()) job.reject(reason);
    pending.clear();
  };
  const abort=()=>terminate(abortReason(signal));
  signal.addEventListener('abort',abort,{once:true});
  worker.onerror=event=>{event.preventDefault();terminate(error('ocrFailed'));};
  worker.onmessageerror=()=>terminate(error('ocrFailed'));
  worker.onmessage=({data})=>{
    const job=pending.get(data?.jobId);if(!job)return;
    if(data.status==='progress') {if(data.data?.status==='recognizing text') onProgress(Number(data.data.progress)||0);return;}
    pending.delete(data.jobId);
    if(data.status==='resolve') job.resolve(data.data);
    else job.reject(error('ocrFailed'));
  };
  const request=(action,payload)=>new Promise((resolve,reject)=>{
    if(stopped||signal.aborted){reject(signal.aborted?abortReason(signal):error('ocrFailed'));return;}
    const jobId='ocr-'+ ++sequence;pending.set(jobId,{resolve,reject});
    try {worker.postMessage({workerId:'ojc-ocr',jobId,action,payload});} catch {pending.delete(jobId);reject(error('ocrFailed'));}
  });
  return {
    async initialize(language) {
      if(!OCR_LANGUAGES.includes(language))throw error('ocrLanguageInvalid');
      await request('load',{options:{lstmOnly:true,corePath:new URL('core/',OCR_BASE).href,logging:false}});
      await request('loadLanguage',{langs:language,options:{langPath:new URL('lang/',OCR_BASE).href.replace(/\/$/,''),lstmOnly:true,gzip:true,cacheMethod:'none'}});
      await request('initialize',{langs:language,oem:1,config:{}});
      await request('setParameters',{params:{tessedit_pageseg_mode:'3',preserve_interword_spaces:'1',user_defined_dpi:'150'}});
    },
    async recognize(image) {
      const read=()=>request('recognize',{image,options:{},output:{text:true}});
      let result=await read();
      // Automatic page segmentation can discard sparse titles. Retry only
      // empty results as a single block, inside the same time/pixel budget.
      if(!String(result.text||'').trim()) {
        await request('setParameters',{params:{tessedit_pageseg_mode:'6'}});
        try {result=await read();}
        finally {if(!signal.aborted&&!stopped)await request('setParameters',{params:{tessedit_pageseg_mode:'3'}});}
      }
      return String(result.text||'').slice(0,200000);
    },
    terminate
  };
}

// Limits are independent of manuscript metadata and do not affect readiness scoring.
export async function recognizePdf(file, language, {signal, onProgress=()=>{}, timeoutMs=OCR_TIMEOUT_MS}={}) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) throw error('ocrPdfOnly');
  if(file.size>15*1024*1024)throw error('pdfTooLarge');
  if(!OCR_LANGUAGES.includes(language))throw error('ocrLanguageInvalid');
  const controller=new AbortController(), active=controller.signal;
  const forward=()=>controller.abort(signal.reason || new DOMException('Cancelled','AbortError'));
  if(signal?.aborted)forward();else signal?.addEventListener('abort',forward,{once:true});
  const timer=setTimeout(()=>controller.abort(error('ocrTimeout')),timeoutMs);
  let task, engine, rendering, canvas, pageNumber=0, count=0, destruction;
  const destroyPdf=()=>destruction ||= task?.destroy().catch(()=>{});
  const stop=()=>{rendering?.cancel();engine?.terminate(abortReason(active));destroyPdf();};
  active.addEventListener('abort',stop,{once:true});
  try {
    const { loadPdfTask } = await abortable(import('./files.js'),active);
    task=await abortable(loadPdfTask(file,{signal:active}),active);
    if(active.aborted){destroyPdf();throw abortReason(active);}
    const doc=await abortable(task.promise,active);count=Math.min(doc.numPages,OCR_PAGE_LIMIT);
    onProgress({page:0,total:count,percentage:0});
    engine=createOcrEngine(active,progress=>onProgress({page:pageNumber,total:count,percentage:Math.round(100*((pageNumber-1)+Math.min(1,Math.max(0,progress)))/count)}));
    await abortable(engine.initialize(language),active);
    const text=[];
    for(pageNumber=1;pageNumber<=count;pageNumber++) {
      if(active.aborted)throw abortReason(active);
      onProgress({page:pageNumber,total:count,percentage:Math.round(100*(pageNumber-1)/count)});
      const page=await abortable(doc.getPage(pageNumber),active), original=page.getViewport({scale:1});
      const scale=Math.min(2.5,2200/Math.max(original.width,original.height),Math.sqrt(4000000/(original.width*original.height)));
      if(!Number.isFinite(scale)||scale<=0)throw error('ocrFailed');
      const viewport=page.getViewport({scale});canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(viewport.width));canvas.height=Math.max(1,Math.floor(viewport.height));
      const context=canvas.getContext('2d');if(!context)throw error('ocrFailed');
      rendering=page.render({canvasContext:context,viewport,background:'rgb(255,255,255)'});
      await abortable(rendering.promise,active);rendering=null;
      const blob=await abortable(new Promise(resolve=>canvas.toBlob(resolve,'image/png')),active);if(!blob)throw error('ocrFailed');
      const image=new Uint8Array(await abortable(blob.arrayBuffer(),active));
      text.push(await abortable(engine.recognize(image),active));
      canvas.width=canvas.height=0;canvas=null;page.cleanup();
    }
    return {text:text.join('\n'),format:'pdf',pages:doc.numPages,partial:doc.numPages>count,ocr:{language,pagesProcessed:count,pageLimit:OCR_PAGE_LIMIT}};
  } finally {
    clearTimeout(timer);signal?.removeEventListener('abort',forward);active.removeEventListener('abort',stop);
    rendering?.cancel();engine?.terminate();if(canvas)canvas.width=canvas.height=0;await destroyPdf();
  }
}
