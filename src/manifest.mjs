import {createHash} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {dirname,join,relative,isAbsolute} from 'node:path';
import {ShareError,digest} from './core.mjs';
import {tree,validateBundle,inspectBundle,installBundle} from './bundle.mjs';

// All installation descriptors live in the QR itself. No sender cache or PNG chunks.
export const PREFIX='harness-share://manifest/v3/';
export const QR_LIMIT=2200;
const fail=(code,message)=>{throw new ShareError(code,message)};
const sha=/^[a-f0-9]{40}$/;
const repoOK=s=>typeof s==='string'&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s)&&s.toLowerCase()!=='obra/superpowers';
const skillOK=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=100;
const packageOK=s=>typeof s==='string'&&/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(s)&&s.length<=160;
const versionOK=s=>typeof s==='string'&&/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(s);
export const gitHash=(kind,bytes)=>createHash('sha1').update(`${kind} ${bytes.length}\0`).update(bytes).digest('hex');
export const THEME_DEFAULTS={preference:'system',fontSize:14,codeFontSize:11,terminalFontSize:13,textFontFamily:'',codeFontFamily:'',terminalFontFamily:''};
export function themeSettings(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('theme','主题设置不完整。');
  const out={};
  for(const [key,value] of Object.entries(input)){
    if(!Object.hasOwn(THEME_DEFAULTS,key))fail('theme','分享中含有不支持的主题设置。');
    if(key==='preference'){if(!['system','light','dark'].includes(value))fail('theme','主题颜色设置无效。')}
    else if(key.endsWith('FontFamily')){if(typeof value!=='string'||value.length>160||/[<>;{}\x00-\x1f]/.test(value))fail('theme','主题字体设置无效。')}
    else {const range=key==='fontSize'?[10,22]:key==='codeFontSize'?[10,16]:[10,20];if(!Number.isInteger(value)||value<range[0]||value>range[1])fail('theme','主题字号设置无效。')}
    out[key]=value;
  }
  return out;
}
function validateItem(x){
  if(!x||!['skill','plugin','theme'].includes(x.type)||typeof x.id!=='string'||typeof x.title!=='string'||x.title.length>160||!x.install)fail('manifest','二维码中的清单不完整。');
  if(x.description!==undefined&&(typeof x.description!=='string'||x.description.length>180))fail('manifest','内容介绍过长。');
  const base={type:x.type,id:x.id,title:x.title,install:{kind:x.install.kind},...x.description?{description:x.description}:{}};
  if(x.type==='skill'){
    if(!skillOK(x.id)||x.install.kind!=='skill-directory')fail('manifest','技能安装方式无效。');
    const s=x.source;
    if(s?.kind==='github-tree'){
      if(!repoOK(s.repo)||!sha.test(s.tree))fail('source','技能来源或固定版本无效。');
      const extras=s.extras??[];
      if(!Array.isArray(extras)||extras.length>4||extras.some(e=>!Array.isArray(e)||!/^LICENSE(?:[._-][A-Za-z0-9_-]+)*$/i.test(e[0])||!sha.test(e[1])))fail('source','许可证来源无效。');
      base.source={kind:'github-tree',repo:s.repo,tree:s.tree,...extras.length?{extras}:{}};
    }else if(s?.kind==='inline'){
      const item=validateBundle({v:2,title:'check',description:'',items:[{id:x.id,title:x.title,description:'',files:s.files}]}).items[0];
      base.source={kind:'inline',files:item.files};
    }else fail('source','二维码没有提供可以取得技能的来源。');
  }else if(x.type==='plugin'){
    const s=x.source;if(s?.kind!=='npm'||!packageOK(s.package)||!versionOK(s.version)||x.id!=='plugin:'+s.package||x.install.kind!=='harness-plugin')fail('source','插件来源或固定版本无效。');
    base.source={kind:'npm',package:s.package,version:s.version};
  }else{
    if(x.id!=='theme:ui-theme'||x.install.kind!=='harness-theme')fail('theme','主题安装方式暂不受支持。');
    base.settings=themeSettings(x.settings);
  }
  return base;
}
export function validateManifest(value){
  if(!value||value.v!==3||typeof value.title!=='string'||!value.title.trim()||value.title.length>32||typeof value.description!=='string'||value.description.length>100||!Array.isArray(value.items)||!value.items.length||value.items.length>120)fail('manifest','二维码中的分享清单不完整。');
  const items=value.items.map(validateItem);if(new Set(items.map(x=>x.id)).size!==items.length)fail('manifest','分享清单中有重复内容。');
  return {v:3,title:value.title,description:value.description,items};
}
// Compact common field names on the wire; decoding expands the full public schema.
export function encodeManifest(value){
  const v=validateManifest(value),wire={v:3,n:v.title,d:v.description,i:v.items.map(x=>[x.type,x.id,x.title===x.id?'':x.title,x.install.kind,x.source?.kind==='github-tree'?{g:x.source.repo,t:x.source.tree,...x.source.extras?{x:x.source.extras}:{}}:x.source?.kind==='npm'?{p:x.source.package,v:x.source.version}:x.source?.kind==='inline'?{f:x.source.files}:x.settings,...x.description?[x.description]:[]])};
  const url=PREFIX+deflateRawSync(Buffer.from(JSON.stringify(wire)),{level:9}).toString('base64url');
  if(Buffer.byteLength(url)>QR_LIMIT)fail('capacity',`所选内容超过一张二维码的容量，请分成几张分享。已选内容不会丢失。`);
  return url;
}
export function decodeManifestQr(url){
  if(typeof url!=='string'||!url.startsWith(PREFIX)||url.length>QR_LIMIT||!/^[A-Za-z0-9_-]+$/.test(url.slice(PREFIX.length)))fail('manifest',url?.startsWith?.('harness-share://bundle/')?'这是旧版分享卡，请重新生成二维码。新版支持截图。':'这不是可识别的 Harness Share 二维码。');
  let w;try{w=JSON.parse(inflateRawSync(Buffer.from(url.slice(PREFIX.length),'base64url'),{maxOutputLength:512*1024}).toString('utf8'))}catch{fail('manifest','二维码内容损坏或过大。')}
  if(w.v!==3||!Array.isArray(w.i))fail('manifest','暂不支持这个二维码版本。');
  return validateManifest({v:3,title:w.n,description:w.d,items:w.i.map(row=>{
    if(!Array.isArray(row)||![5,6].includes(row.length))fail('manifest','二维码清单格式无效。');
    const [type,id,title,kind,s,description]=row;
    return {type,id,title:title||id,install:{kind},...description?{description}:{},...type==='theme'?{settings:s}:{source:s?.g?{kind:'github-tree',repo:s.g,tree:s.t,extras:s.x}:s?.p?{kind:'npm',package:s.p,version:s.v}:{kind:'inline',files:s?.f}}};
  })});
}
export function manifestView(manifest,url){
  const names={skill:'技能',plugin:'插件',theme:'主题'};
  const assets=manifest.items.map(x=>({...x,source:undefined,installation:x.install,remoteSource:x.source,settings:x.settings,description:x.description||(x.type==='theme'?'分享者的界面配色与字号。':x.source.kind==='inline'?'完整内容已写入二维码。':'从二维码指定的固定版本安装。'),repo:x.source?.repo,version:x.source?.tree||x.source?.version||'',files:x.source?.files?.map(f=>f.slice(0,3))||[],shareable:true,state:'清单已读出'}));
  return {title:manifest.title,description:manifest.description,url,transport:'qr-manifest',assetIds:manifest.items.map(x=>x.id),assets,composition:Object.entries(names).map(([type,name])=>({type,name,value:manifest.items.filter(x=>x.type===type).length})).filter(x=>x.value),footer:'扫码或拖入截图 · 查看后安装'};
}
export async function githubJson(repo,path){
  if(!repoOK(repo))fail('source','公开来源无效。');
  let response;try{response=await fetch(`https://api.github.com/repos/${repo}/${path}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Harness-Share'},signal:AbortSignal.timeout(25000),redirect:'error'})}catch{fail('network','暂时连不上技能来源，请稍后重试。')}
  if(!response.ok)fail('network',response.status===403||response.status===429?'来源网站暂时限制了请求，请稍后重试。':`无法取得分享中的固定版本（${response.status}）。`);
  const text=await response.text();if(text.length>90*1024*1024)fail('size','来源返回的内容过大。');return JSON.parse(text);
}
export async function localFiles(item){
  const root=await realpath(dirname(item.source)),scan=await tree(root,{flatFile:item.flat?item.source:undefined}),files=[];
  for(const [name] of scan.files){const path=item.flat?item.source:join(root,name),s=await lstat(path),rel=relative(root,await realpath(path));if(!s.isFile()||s.isSymbolicLink()||isAbsolute(rel)||rel.startsWith('..'))fail('path','技能文件已改变，请刷新后重试。');const bytes=await readFile(path);files.push([name,bytes.length,digest(bytes),bytes.toString('base64')])}
  return files;
}
export function filesTreeHash(files){
  const root=new Map();
  for(const [path,,,base64] of files){let cursor=root;const parts=path.split('/'),leaf=parts.pop();for(const p of parts){if(!cursor.has(p))cursor.set(p,new Map());cursor=cursor.get(p)}cursor.set(leaf,gitHash('blob',Buffer.from(base64,'base64')))}
  const hash=node=>gitHash('tree',Buffer.concat([...node].sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x instanceof Map?'/':'')),Buffer.from(b+(y instanceof Map?'/':'')))).flatMap(([name,value])=>[Buffer.from(`${value instanceof Map?'40000':'100644'} ${name}\0`),Buffer.from(value instanceof Map?hash(value):value,'hex')])));
  return hash(root);
}
export async function resolveSkill(item,{get=githubJson}={}){
  if(item.source.kind==='inline')return {id:item.id,title:item.title,description:'',files:item.source.files};
  const source=item.source,data=await get(source.repo,`git/trees/${source.tree}?recursive=1`);
  if(data.sha!==source.tree||data.truncated||!Array.isArray(data.tree)||data.tree.length>2000)fail('source','无法取得完整技能目录。');
  const blobs=data.tree.filter(x=>x.type!=='tree');
  if(blobs.some(x=>x.type!=='blob'||!['100644','100755'].includes(x.mode)||!sha.test(x.sha))||blobs.reduce((n,x)=>n+(x.size||0),0)>64*1024*1024)fail('source','技能包含不支持的链接或过大的附件。');
  const all=[...blobs.map(x=>[x.path,x.sha]),...(source.extras??[])],files=[];
  for(const [path,hash] of all){const blob=await get(source.repo,`git/blobs/${hash}`);if(blob.encoding!=='base64'||typeof blob.content!=='string')fail('source','来源没有返回完整文件。');const bytes=Buffer.from(blob.content.replace(/\s/g,''),'base64');if(bytes.length!==blob.size||gitHash('blob',bytes)!==hash)fail('integrity','下载的文件与二维码指定的版本不一致，安装已停止。');files.push([path,bytes.length,digest(bytes),bytes.toString('base64')])}
  return validateBundle({v:2,title:'verify',description:'',items:[{id:item.id,title:item.title,description:'',files}]}).items[0];
}
export async function skillBundle(manifest,ids,options){
  const items=[];for(const item of manifest.items.filter(x=>x.type==='skill'&&ids.includes(x.id)))items.push(await resolveSkill(item,options));
  return validateBundle({v:2,title:manifest.title,description:manifest.description,items});
}
export async function installManifestSkills(workspace,manifest,ids,options={}){const bundle=await skillBundle(manifest,ids,options);return installBundle(workspace,bundle,ids,options)}
export async function inspectManifestSkills(workspace,manifest,options={}){const bundle=await skillBundle(manifest,manifest.items.map(x=>x.id),options);return inspectBundle(workspace,bundle)}
