import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {PNG} from 'pngjs';
import jpeg from 'jpeg-js';
import qr from '@rc-component/qrcode/lib/libs/qrcodegen.js';
import {encodeManifest,decodeManifestQr,resolveSkill,installManifestSkills,gitHash,themeSettings} from '../src/manifest.mjs';
import {decodeQrPixels} from '../src/agent-qr.mjs';
import {imageFileFromDataUrl,toBase64,fromBase64} from '../ui/src/portable-png.js';
const skill={type:'skill',id:'find-skills',title:'find-skills',install:{kind:'skill-directory'},source:{kind:'github-tree',repo:'vercel-labs/skills',tree:'76a98a285cb0434f3d39e1a873823556330e398b',extras:[['LICENSE','eabe3008f6c0275929faa8b07d406e82717648cc']]}};
const plugin={type:'plugin',id:'plugin:dsh-better-sidebar',title:'dsh-better-sidebar',source:{kind:'npm',package:'dsh-better-sidebar',version:'0.30.1'},install:{kind:'harness-plugin'}};
const theme={type:'theme',id:'theme:ui-theme',title:'当前主题',settings:{preference:'dark',fontSize:16,textFontFamily:'MiSans'},install:{kind:'harness-theme'}};
const make=items=>({v:3,title:'我的配置',description:'',items});
test('the QR alone reconstructs all three types, immutable sources and settings',()=>{
  const original=make([skill,plugin,theme]),wire=encodeManifest(original);
  assert.deepEqual(decodeManifestQr(wire),original);
  assert(!wire.includes('bundle/v2'));assert(!wire.includes('http'));assert(wire.length<1000);
});
test('pixel-only PNG and JPEG screenshots suffice without PNG ancillary payload',async()=>{
  const value=encodeManifest(make([skill,plugin,theme])),code=qr.QrCode.encodeText(value,qr.Ecc.MEDIUM),scale=4,margin=4,size=(code.size+2*margin)*scale,png=new PNG({width:size,height:size});
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const ink=code.getModule(Math.floor(x/scale)-margin,Math.floor(y/scale)-margin)?0:255,i=(y*size+x)*4;png.data[i]=png.data[i+1]=png.data[i+2]=ink;png.data[i+3]=255}
  const bytes=PNG.sync.write(png);assert(!bytes.includes(Buffer.from('hsPk')));assert.equal(decodeQrPixels(bytes),value);
  assert.equal(decodeQrPixels(jpeg.encode({data:png.data,width:size,height:size},85).data),value);
  const imported=imageFileFromDataUrl('data:image/png;base64,'+toBase64(bytes));
  assert.equal(decodeQrPixels(Buffer.from(await imported.arrayBuffer())),value);
  assert.deepEqual(Buffer.from(fromBase64(toBase64(bytes))),bytes);
  assert.throws(()=>imageFileFromDataUrl('https://example.com/untrusted.png'),/先保存图片/);
});
test('old opaque package ids and malformed or overflowing QR values fail explicitly',()=>{
  assert.throws(()=>decodeManifestQr('harness-share://bundle/v2/'+'a'.repeat(64)),/旧版/);
  assert.throws(()=>decodeManifestQr('harness-share://manifest/v3/broken'),/损坏/);
  const many=Array.from({length:100},(_,i)=>({...skill,id:'skill-'+i,title:randomBytes(60).toString('hex'),source:{...skill.source,tree:randomBytes(20).toString('hex')}}));
  assert.throws(()=>encodeManifest(make(many)),/分成几张/);
});
test('QR does not accept commands, arbitrary package specs or unsafe theme configuration',()=>{
  assert.throws(()=>encodeManifest(make([{...plugin,source:{...plugin.source,version:'latest; calc'}}])),/无效/);
  assert.throws(()=>encodeManifest(make([{...skill,install:{kind:'shell',command:'calc'}}])),/无效/);
  assert.throws(()=>themeSettings({providerApiKey:'secret'}),/不支持/);
  assert.throws(()=>themeSettings({fontSize:99}),/无效/);
});
test('recipient fetches exact blobs and installs only chosen skills, preserving conflicts',async t=>{
  const workspace=await mkdtemp(join(tmpdir(),'hs-qr-test-'));
  t.after(()=>rm(workspace,{recursive:true,force:true}));
  const body=Buffer.from('---\nname: find-skills\ndescription: test\n---\nUse verified sources.\n'),hash=gitHash('blob',body),license=Buffer.from('MIT test'),licenseHash=gitHash('blob',license);
  const item={...skill,source:{...skill.source,extras:[['LICENSE',licenseHash]]}},second={...item,id:'unselected'};
  const get=async(repo,path)=>path.startsWith('git/trees/')?{sha:item.source.tree,tree:[{type:'blob',mode:'100644',path:'SKILL.md',sha:hash,size:body.length}]}:{encoding:'base64',size:path.endsWith(hash)?body.length:license.length,content:(path.endsWith(hash)?body:license).toString('base64')};
  const result=await installManifestSkills(workspace,decodeManifestQr(encodeManifest(make([item,second]))),['find-skills'],{get});
  assert.equal(result.installedCount,1);assert.equal(await readFile(join(workspace,'.dsh/skills/find-skills/SKILL.md'),'utf8'),body.toString());
  await assert.rejects(readFile(join(workspace,'.dsh/skills/unselected/SKILL.md')),{code:'ENOENT'});
  assert.equal((await installManifestSkills(workspace,make([item]),['find-skills'],{get})).existingCount,1);
  await writeFile(join(workspace,'.dsh/skills/find-skills/SKILL.md'),'local changes');
  assert.equal((await installManifestSkills(workspace,make([item]),['find-skills'],{get})).conflictCount,1);
  assert.equal(await readFile(join(workspace,'.dsh/skills/find-skills/SKILL.md'),'utf8'),'local changes');
});
test('download corruption and symbolic links never reach installation',async()=>{
  await assert.rejects(resolveSkill(skill,{get:async(repo,path)=>path.startsWith('git/trees/')?{sha:skill.source.tree,tree:[{type:'blob',mode:'100644',path:'SKILL.md',sha:'a'.repeat(40),size:1}]}:{encoding:'base64',size:1,content:'YQ=='}}),/不一致/);
  await assert.rejects(resolveSkill(skill,{get:async()=>({sha:skill.source.tree,tree:[{type:'blob',mode:'120000',path:'SKILL.md',sha:'a'.repeat(40)}]})}),/链接/);
});
