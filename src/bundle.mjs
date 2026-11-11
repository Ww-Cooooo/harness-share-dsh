import {randomUUID} from 'node:crypto';
import {lstat,realpath,readdir,readFile,writeFile,mkdir,rename,rm,open} from 'node:fs/promises';
import {resolve,join,dirname,basename,isAbsolute} from 'node:path';
import {ShareError,digest} from './core.mjs';

export const LIMITS={compressed:16*1024*1024,raw:64*1024*1024,files:1500,items:120};
const ignored=new Set(['.git','node_modules','__pycache__','.cache','.DS_Store']);
const secret=/^(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\..*)?)$/i;
const fail=(code,message)=>{throw new ShareError(code,message)};
const exists=async path=>{try{return await lstat(path)}catch(e){if(e.code==='ENOENT')return null;throw e}};
const idOK=id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=100;
const stringOK=(s,n)=>typeof s==='string'&&s.length<=n&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
function fileOK(path){
  return typeof path==='string'&&path.length<=240&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!/[<>:"\\|?*\x00-\x1f]/.test(p)&&!/[. ]$/.test(p)&&! /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)&&!ignored.has(p)&&!secret.test(p));
}
export async function tree(root,{flatFile}={}){
  const stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink())fail('path','技能目录指向了其他位置，暂不能打包。');
  const files=[];let total=0,omitted=0;
  async function walk(dir,prefix=''){
    for(const name of (await readdir(dir)).sort()){
      if(ignored.has(name)){omitted++;continue}
      const path=prefix+name;if(!fileOK(path))fail('path','目录中有不能随图片分享的文件，请先查看技能文件。');
      const full=join(dir,name),s=await lstat(full);
      if(s.isSymbolicLink())fail('path','技能包含指向其他目录的文件，暂不能完整打包。');
      if(s.isDirectory()){if(prefix.split('/').length>16)fail('size','技能目录层级过深。');await walk(full,path+'/')}
      else if(s.isFile()){total+=s.size;files.push([path,s.size]);if(total>LIMITS.raw||files.length>LIMITS.files)fail('size','这项技能的附件较多，超过当前图片可携带的大小。')}
      else fail('path','技能中有不支持的文件类型。');
    }
  }
  if(flatFile){const s=await lstat(flatFile);if(!s.isFile()||s.isSymbolicLink()||s.size>LIMITS.raw)fail('path','技能文件不可用。');files.push(['SKILL.md',s.size]);total=s.size}
  else await walk(root);
  if(!files.some(f=>f[0]==='SKILL.md'))fail('skill','没有找到 SKILL.md，不能作为技能安装。');
  return {files,bytes:total,omitted};
}
export async function catalogItem(summary){
  const id=summary.name,path=summary.path;
  const item={id,type:'skill',title:id,description:summary.description||'',source:path||'',origin:summary.source||'',shareable:false,files:[],bytes:0};
  if(!idOK(id)||!path||!isAbsolute(path))return {...item,state:'暂不能分享',reason:'这项技能没有可读取的本地文件。'};
  try{
    if((await lstat(path)).isSymbolicLink())fail('path','技能正文指向了其他文件，暂不能打包。');
    // A registered skill root may be a user-managed junction. Pin its real root;
    // links inside that root remain forbidden, so packaging cannot escape it.
    const source=join(await realpath(dirname(path)),basename(path));
    const flatFile=basename(path)!=='SKILL.md'?source:undefined;
    const scan=await tree(dirname(source),{flatFile});
    return {...item,...scan,source,shareable:true,state:'可分享',flat:!!flatFile};
  }catch(error){return {...item,state:'暂不能分享',reason:error instanceof ShareError?error.message:'技能文件暂时无法读取。'}}
}
function identity(item){
  const names=new Set();let total=0;
  if(!item||!idOK(item.id)||!stringOK(item.title,100)||!stringOK(item.description,5000)||!Array.isArray(item.files)||!item.files.length||item.files.length>LIMITS.files)fail('bundle','分享中的技能信息不完整。');
  const files=item.files.map(f=>{
    if(!Array.isArray(f)||f.length!==4||!fileOK(f[0])||names.has(f[0].toLowerCase())||!Number.isSafeInteger(f[1])||f[1]<0||f[1]>LIMITS.raw||typeof f[2]!=='string'||!/^[a-f0-9]{64}$/.test(f[2])||typeof f[3]!=='string'||f[3].length>Math.ceil(f[1]/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f[3]))fail('bundle','分享中的文件清单无效，已停止读取。');
    names.add(f[0].toLowerCase());total+=f[1];const bytes=Buffer.from(f[3],'base64');
    if(bytes.length!==f[1]||digest(bytes)!==f[2])fail('integrity','图片携带的文件不完整，请重新发送原图。');
    return [...f];
  });
  // Prevent a file from also serving as another file's directory on any platform.
  for(const name of names){const parts=name.split('/');parts.pop();while(parts.length){if(names.has(parts.join('/')))fail('path','分享中的文件路径互相冲突。');parts.pop()}}
  if(!files.some(f=>f[0]==='SKILL.md')||total>LIMITS.raw)fail('bundle','技能正文缺失或分享内容过大。');
  const body=Buffer.from(files.find(f=>f[0]==='SKILL.md')[3],'base64').toString('utf8');
  const front=body.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const declared=front?.match(/^name:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m)?.[1];
  if(declared!==item.id)fail('skill','技能名称与正文不一致，无法安装。');
  return {id:item.id,title:item.title,description:item.description,files};
}
export function validateBundle(value){
  if(!value||value.v!==2||!stringOK(value.title,32)||!value.title.trim()||!stringOK(value.description,100)||!Array.isArray(value.items)||!value.items.length||value.items.length>LIMITS.items)fail('bundle','这份分享不完整，或版本暂不受支持。');
  const items=value.items.map(identity),ids=new Set(items.map(x=>x.id));
  if(ids.size!==items.length||items.reduce((n,x)=>n+x.files.reduce((n,f)=>n+f[1],0),0)>LIMITS.raw)fail('bundle','分享中有重复技能，或内容过大。');
  return {v:2,title:value.title.trim(),description:value.description,items};
}
async function workspaceRoot(workspace){
  if(typeof workspace!=='string'||!isAbsolute(workspace))fail('workspace','先选择安装到哪个项目。');
  const root=resolve(workspace),s=await lstat(root);if(!s.isDirectory()||s.isSymbolicLink()||resolve(await realpath(root)).toLowerCase()!==root.toLowerCase())fail('workspace','项目目录已移动，请重新选择。');
  for(const name of ['.dsh','.dsh/skills']){const s=await exists(join(root,name));if(s&&(!s.isDirectory()||s.isSymbolicLink()))fail('path','项目技能目录不可用，现有内容未改动。')}
  return root;
}
export async function verifyItem(root,item){
  const scan=await tree(root);if(scan.omitted||scan.files.length!==item.files.length)return false;
  for(const [path,size,hash] of item.files){if(!scan.files.some(x=>x[0]===path&&x[1]===size)||digest(await readFile(join(root,path)))!==hash)return false}return true;
}
export async function inspectBundle(workspace,bundle){
  const root=await workspaceRoot(workspace),items=[];
  for(const item of bundle.items){const target=join(root,'.dsh','skills',item.id);let state='new';if(await exists(target)){try{state=await verifyItem(target,item)?'existing':'conflict'}catch{state='conflict'}}items.push({id:item.id,title:item.title,target,state,files:item.files.length,bytes:item.files.reduce((n,f)=>n+f[1],0)})}
  return {items,newCount:items.filter(x=>x.state==='new').length,existingCount:items.filter(x=>x.state==='existing').length,conflictCount:items.filter(x=>x.state==='conflict').length};
}
export async function installBundle(workspace,bundle,ids,{stateDirectory}={}){
  bundle=validateBundle(bundle);
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!bundle.items.some(x=>x.id===id)))fail('selection','先选择要安装的技能。');
  const root=await workspaceRoot(workspace),skills=join(root,'.dsh','skills');await mkdir(skills,{recursive:true});await workspaceRoot(root);
  const lock=join(skills,'.harness-share.lock');let handle;
  try{handle=await open(lock,'wx')}catch(e){if(e.code==='EEXIST')fail('busy','这个项目正在安装，请稍后重试。');throw e}
  const stages=[],results=[];
  try{
    const plan=await inspectBundle(root,bundle);
    // Prepare and verify all selected new directories before exposing any skill.
    for(const item of bundle.items.filter(x=>ids.includes(x.id))){
      const p=plan.items.find(x=>x.id===item.id);if(p.state!=='new'){results.push(p);continue}
      const stage=join(root,'.dsh','.harness-share-'+randomUUID());await mkdir(stage);stages.push({stage,item,plan:p});
      for(const [path,,,data] of item.files){const target=join(stage,path);await mkdir(dirname(target),{recursive:true});await writeFile(target,Buffer.from(data,'base64'),{flag:'wx'})}
      if(!await verifyItem(stage,item))fail('integrity','写入后核对未通过，安装已停止。');
    }
    for(const entry of stages){
      try{
        await workspaceRoot(root);
        if(await exists(entry.plan.target)){results.push({...entry.plan,state:'conflict'});continue}
        await rename(entry.stage,entry.plan.target);entry.stage=null;results.push({...entry.plan,state:'installed'});
      }catch{results.push({...entry.plan,state:'failed'})}
    }
    const receipt={receiptId:randomUUID(),installedAt:new Date().toISOString(),items:results,installedCount:results.filter(x=>x.state==='installed').length,existingCount:results.filter(x=>x.state==='existing').length,conflictCount:results.filter(x=>x.state==='conflict').length,failedCount:results.filter(x=>x.state==='failed').length};
    if(stateDirectory){try{await mkdir(stateDirectory,{recursive:true});await writeFile(join(stateDirectory,receipt.receiptId+'.json'),JSON.stringify(receipt,null,2),{flag:'wx'})}catch{receipt.receiptWarning='技能处理完成，但安装记录未能保存。'}}
    return receipt;
  }finally{
    for(const {stage} of stages){if(!stage)continue;const rel=relative(join(root,'.dsh'),stage);if(!rel.startsWith('..')&&!isAbsolute(rel)&&/^\.harness-share-[a-f0-9-]+$/.test(rel))await rm(stage,{recursive:true,force:true}).catch(()=>{})}
    await handle.close();await rm(lock,{force:true}).catch(()=>{});
  }
}
