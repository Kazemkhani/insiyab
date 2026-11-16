// Loopback-only test adapter around lane 1's real relay. Never deployed.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {handle,memoryStore}=require('../../live/api/_room.js');
const root=path.resolve(process.argv[2]),store=memoryStore();let fail=false;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');let raw='';for await(const chunk of req)raw+=chunk;
 if(url.pathname==='/__test/fail'){fail=JSON.parse(raw).fail;res.end('{}');return;}
 if(url.pathname.startsWith('/api/room/')){
  const result=fail?{status:503,json:{error:'test store absent'}}:await handle(store,{method:req.method,action:url.pathname.split('/').pop(),body:raw?JSON.parse(raw):{},code:req.headers['x-presenter-code'],presenterCode:'local-test-code'});
  res.writeHead(result.status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(result.json));return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.html':'text/html','.woff2':'font/woff2'};
 res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
