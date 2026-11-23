// Test-only static server. Serve the actual site and CSP at its Pages subpath.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root=resolve('.');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json'};
createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(pathname==='/') {res.writeHead(200);res.end('ready');return;}
    const built=pathname.startsWith('/built/');
    const prefix=built?'/built/':'/open-journal-checker/';
    if(!pathname.startsWith(prefix)) throw new Error('Not found');
    const siteRoot=built?resolve(root,'dist'):root;
    const relative=pathname.slice(prefix.length)||'index.html';
    const path=resolve(siteRoot,relative);
    if(!path.startsWith(siteRoot+sep)) throw new Error('Not found');
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(8765,'127.0.0.1');
