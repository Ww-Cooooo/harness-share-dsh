import {build} from 'esbuild';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import './generate-remote.mjs';
const root=resolve('.'),ui=join(root,'ui');
await mkdir('lib',{recursive:true});
await mkdir('.build',{recursive:true});
const metafiles={};
metafiles.host=(await build({metafile:true,entryPoints:['src/index.ts'],bundle:true,outfile:'lib/index.js',format:'esm',platform:'node',target:'node24',packages:'external'})).metafile;
const worker=await build({metafile:true,entryPoints:[join(ui,'src/qr-worker.js')],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true});
metafiles.worker=worker.metafile;
const assets={};
for(const name of ['art/whale/deepseek-whale.svg','art/whale-community/whale-girl-zipzippipe.png']){
  const ext=name.split('.').at(-1),mime={svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg'}[ext];
  assets['./'+name]=`data:${mime};base64,${(await readFile(join(ui,'public',name))).toString('base64')}`;
}
const cssFiles=new Map();
const uiBuild=await build({metafile:true,entryPoints:[join(ui,'src/real-main.jsx')],bundle:true,write:false,outfile:'ui.js',format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'external',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-page',setup(b){
  b.onResolve({filter:/\?raw$/},args=>({path:resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'raw'}));
  b.onLoad({filter:/.*/,namespace:'raw'},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));
  b.onLoad({filter:/\.css$/},async args=>{let css=await readFile(args.path,'utf8');for(const name of ['MiSans-Regular.woff2','MiSans-Medium.woff2']){const url='/fonts/misans/'+name;if(css.includes(url))css=css.replaceAll(url,`data:font/woff2;base64,${(await readFile(join(ui,'public/fonts/misans',name))).toString('base64')}`)}cssFiles.set(args.path,css);return {contents:'',loader:'js'}});
  b.onLoad({filter:/\.(jsx|js)$/},async args=>{
    if(args.path.includes('node_modules'))return;
    let src=await readFile(args.path,'utf8');
    for(const name of Object.keys(assets)){
      src=src.replaceAll(`src="${name}"`,`src={globalThis.__HS_ASSETS__[${JSON.stringify(name)}]}`);
      src=src.replaceAll(`'${name}'`,`globalThis.__HS_ASSETS__[${JSON.stringify(name)}]`);
    }
    if(args.path.endsWith('qr-image.js'))src=src.replace("globalThis.__HS_QR_WORKER__||new URL('./qr-worker.js',import.meta.url)",'globalThis.__HS_QR_WORKER__');
    return {contents:src,loader:args.path.endsWith('.jsx')?'jsx':'js',resolveDir:dirname(args.path)};
  });
}}]});
metafiles.ui=uiBuild.metafile;
const js=uiBuild.outputFiles.find(f=>f.path.endsWith('.js')).text;
const bridge=`(()=>{const channel='__HARNESS_SHARE_CHANNEL__';let seq=0;const pending=new Map();globalThis.HarnessShareBridge={call(method,input={}){return new Promise((resolve,reject)=>{const id=String(++seq),timer=setTimeout(()=>{pending.delete(id);reject(Error('与 Harness 的连接超时，请重新打开页面。'))},30000);pending.set(id,{resolve,reject,timer});parent.postMessage({kind:'harness-share-call',channel,id,method,input},'*')})}};addEventListener('message',event=>{if(event.source!==parent||event.data?.channel!==channel)return;if(event.data?.kind==='harness-share-visibility'){globalThis.__HS_VISIBLE__=!!event.data.visible;dispatchEvent(new CustomEvent('harness-share-visibility',{detail:!!event.data.visible}));return}if(event.data?.kind!=='harness-share-result')return;const p=pending.get(event.data.id);if(!p)return;clearTimeout(p.timer);pending.delete(event.data.id);event.data.ok?p.resolve(event.data.value):p.reject(Error(event.data.error))});})();`;
const bootstrap=`globalThis.__HS_INLINE_QR__=true;globalThis.__HS_ASSETS__=${JSON.stringify(assets)};globalThis.__HS_QR_WORKER__=URL.createObjectURL(new Blob([${JSON.stringify(worker.outputFiles[0].text)}],{type:'text/javascript'}));`;
const escapeScript=s=>s.replaceAll('</script','<\\/script');
// Preserve imported component styles as well as the page overrides. Reads may
// complete in any order, especially while embedding the large local fonts.
const cssRank=new Map(['focus.css','whale.css','whale-swim.css','real.css','sidebar.css'].map((name,i)=>[join(ui,'src',name),i]));
const orderedCss=[...cssFiles].sort(([a],[b])=>(cssRank.get(a)??2.5)-(cssRank.get(b)??2.5)||a.localeCompare(b)).map(([,css])=>css).join('\n');
const html=`<!doctype html><html lang="zh-CN" class="whale-theme whale-swim-theme"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Harness Share · 分享与安装</title><style>${orderedCss}</style></head><body><div id="root"></div><script>${escapeScript(bridge+bootstrap+js)}</script></body></html>`;
for(const [entry,name,defines] of [['src/client.tsx','client',{}],['src/panel.tsx','client.panel',{__SHARE_DOCUMENT__:JSON.stringify(html)}]]){
  const output=await build({metafile:true,entryPoints:[entry],bundle:true,write:false,outfile:`lib/${name}.js`,format:'cjs',platform:'browser',target:'es2022',minify:true,external:['react','react/*','react-dom','react-dom/*','zod','@deepseek-ai/dsh-client-ui-primitives'],define:defines,legalComments:'external'});
  metafiles[name]=output.metafile;
  const id=name==='client'?'eh3-dsh-harness-share':'eh3-dsh-harness-share/client.panel.js';
  await writeFile(`lib/${name}.js`,`window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory(require){const module={exports:{}};const exports=module.exports;\n${output.outputFiles.find(f=>f.path.endsWith('.js')).text}\nreturn module.exports;}});\n`);
  for(const file of output.outputFiles.filter(f=>f.path.endsWith('.LEGAL.txt')))await writeFile(`lib/${name}.LICENSE.txt`,file.text);
}
await mkdir('licenses',{recursive:true});
await cp(join(ui,'public/fonts/misans/MiSans-license.pdf'),'licenses/MiSans-license.pdf');
await writeFile('lib/page.LICENSE.txt',uiBuild.outputFiles.find(f=>f.path.endsWith('.LEGAL.txt'))?.text||'');
await writeFile('.build/metafiles.json',JSON.stringify(metafiles,null,2));
console.log('Built Host, lazy More-menu entry and isolated share page.');
