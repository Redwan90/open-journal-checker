// Test-only static server. Serve the actual site and CSP at its Pages subpath.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root=resolve('.');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};
createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(pathname==='/') {res.writeHead(200);res.end('ready');return;}
    if(!pathname.startsWith('/open-journal-checker/')) throw new Error('Not found');
    const relative=pathname.slice('/open-journal-checker/'.length)||'index.html';
    const path=resolve(root,relative);
    if(!path.startsWith(root+sep)) throw new Error('Not found');
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(8765,'127.0.0.1');
