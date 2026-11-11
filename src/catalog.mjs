import {readFile} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {homedir} from 'node:os';
import {catalogItem} from './bundle.mjs';
import {ShareError} from './core.mjs';
import {localFiles,filesTreeHash,encodeManifest,manifestView,githubJson,THEME_DEFAULTS,themeSettings} from './manifest.mjs';
const json=async path=>{try{return JSON.parse(await readFile(path,'utf8'))}catch{return null}};
async function sourceLock(path){
  let dir=dirname(path||'');for(let i=0;i<5;i++){const value=await json(join(dir,'.skill-lock.json'));if(value)return value.skills||{};const next=dirname(dir);if(next===dir)break;dir=next}
  return (await json(join(homedir(),'.agents','.skill-lock.json')))?.skills||{};
}
export async function shareableSkill(summary){
  const item=await catalogItem(summary);if(!item.shareable)return item;
  const files=await localFiles(item),lock=(await sourceLock(summary.path))[item.id];
  const localTree=filesTreeHash(files);
  let source;
  if(lock?.sourceType==='github'&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(lock.source)&&lock.skillFolderHash===localTree){source={kind:'github-tree',repo:lock.source,tree:localTree}}
  else source={kind:'inline',files};
  const descriptor={type:'skill',id:item.id,title:item.title,description:item.description.slice(0,180),source,install:{kind:'skill-directory'}};
  try{encodeManifest({v:3,title:'分享',description:'',items:[descriptor]})}catch(e){return {...item,shareable:false,state:'缺少可下载来源',reason:lock?'本机版本与来源记录不同。需要先提供这份版本的公开下载来源。':'这项内容只在本机，超过二维码容量。需要先提供公开下载来源。'}}
  return {...item,descriptor,version:source.tree||'二维码内完整文件',state:source.kind==='inline'?'内容随二维码分享':'固定公开版本',reason:''};
}
export function themeEntry(host){return host.configEditor.entries().find(e=>e.options.name==='@deepseek-ai/dsh-client-ui-theme')}
export function currentTheme(host){const entry=themeEntry(host);return entry?themeSettings(Object.fromEntries(Object.keys(THEME_DEFAULTS).map(k=>[k,entry.options.config?.[k]??THEME_DEFAULTS[k]]))):null}
export async function profileCatalog(host,sourceProfileDirectory){
  const dir=sourceProfileDirectory||host.profileContext.dir,manifest=await json(join(dir,'package.json')),assets=[];
  for(const [name,spec] of Object.entries(manifest?.dependencies||{})){
    if(name==='eh3-dsh-harness-share'||name.startsWith('@deepseek-ai/'))continue;
    const installed=await json(join(dir,'node_modules',name,'package.json'));
    const version=installed?.version||spec;
    const portable=typeof spec==='string'&&!/^(?:file:|link:|workspace:)/.test(spec)&&/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version);
    assets.push({id:'plugin:'+name,type:'plugin',title:name,description:typeof installed?.description==='string'?installed.description:'已安装的 Harness 插件',source:join(dir,'node_modules',name),version,files:[],shareable:portable,state:portable?'固定公开版本':'缺少可下载来源',reason:portable?'':'通过本地文件安装，需要先提供这份版本的公开下载来源。',...portable?{descriptor:{type:'plugin',id:'plugin:'+name,title:name,source:{kind:'npm',package:name,version},install:{kind:'harness-plugin'}}}:{}});
  }
  const settings=currentTheme(host);
  if(settings)assets.push({id:'theme:ui-theme',type:'theme',title:'当前界面主题',description:'Harness 的明暗配色、字体和字号。',files:[],shareable:true,state:'设置随二维码分享',descriptor:{type:'theme',id:'theme:ui-theme',title:'当前界面主题',settings,install:{kind:'harness-theme'}}});
  return assets;
}
export async function createManifestShare(catalog,{ids,title,description=''},{get=githubJson}={}){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw new ShareError('selection','先选择这次要分享的内容。');
  const items=[];
  for(const id of ids){
    const asset=catalog.find(x=>x.id===id);if(!asset?.shareable||!asset.descriptor)throw new ShareError('selection','有内容暂时没有可用来源，请刷新清单后查看。');
    const item=structuredClone(asset.descriptor);
    if(item.source?.kind==='github-tree'){
      const remote=await get(item.source.repo,`git/trees/${item.source.tree}?recursive=1`),files=await localFiles(asset);
      const blobs=remote.tree?.filter(x=>x.type==='blob')||[];
      if(remote.sha!==item.source.tree||remote.truncated||filesTreeHash(files)!==item.source.tree||blobs.length!==files.length)throw new ShareError('changed','本机内容或公开来源已变化，请刷新后重试。');
      if(!blobs.some(x=>/(^|\/)licen[cs]e/i.test(x.path))){
        const root=await get(item.source.repo,'contents/');
        const license=Array.isArray(root)&&root.find(x=>x.type==='file'&&/^licen[cs]e(?:\.txt|\.md)?$/i.test(x.name));
        if(license)item.source.extras=[[license.name,license.sha]];
      }
    }
    items.push(item);
  }
  const manifest={v:3,title,description,items},url=encodeManifest(manifest);
  return {...manifestView(manifest,url),qrBytes:Buffer.byteLength(url)};
}
