import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {catalogItem,validateBundle,inspectBundle,installBundle,verifyItem} from '../src/bundle.mjs';
import {localFiles} from '../src/manifest.mjs';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'harness-share-bundle-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const catalog=[];
  for(const name of ['alpha-skill','beta-skill','gamma-skill']){
    const dir=join(root,'source',name);await mkdir(join(dir,'references'),{recursive:true});
    await writeFile(join(dir,'SKILL.md'),`---\nname: ${name}\ndescription: A real test skill\n---\n# ${name}\nRead references/help.md.\n`);
    await writeFile(join(dir,'references','help.md'),`Supporting material for ${name}`);
    catalog.push(await catalogItem({name,path:join(dir,'SKILL.md'),description:'A real test skill',source:'user-agents'}));
  }
  const receiver=join(root,'receiver');await mkdir(receiver);
  const items=await Promise.all(catalog.map(async item=>({id:item.id,title:item.title,description:item.description,files:await localFiles(item)})));
  return {root,catalog,receiver,bundle:validateBundle({v:2,title:'完整分享',description:'',items})};
}
test('actual catalog paths produce complete verified internal file structures',async t=>{
  const {bundle}=await fixture(t);
  assert.equal(bundle.items.length,3);assert.ok(bundle.items.every(x=>x.files.length===2));
  assert.ok(!JSON.stringify(bundle).includes(tmpdir()));
});
test('receiver installs only selected complete directories, skips identical and preserves conflicts',async t=>{
  const {receiver,bundle}=await fixture(t);
  let plan=await inspectBundle(receiver,bundle);assert.equal(plan.newCount,3);
  const first=await installBundle(receiver,bundle,['alpha-skill','gamma-skill']);assert.equal(first.installedCount,2);
  const names=await readdir(join(receiver,'.dsh','skills'));assert.deepEqual(names.sort(),['alpha-skill','gamma-skill']);
  assert.ok(await verifyItem(join(receiver,'.dsh','skills','alpha-skill'),bundle.items[0]));
  await writeFile(join(receiver,'.dsh','skills','gamma-skill','SKILL.md'),'USER CUSTOMIZATION');
  plan=await inspectBundle(receiver,bundle);assert.equal(plan.newCount,1);assert.equal(plan.existingCount,1);assert.equal(plan.conflictCount,1);
  const second=await installBundle(receiver,bundle,bundle.items.map(x=>x.id));
  assert.equal(second.installedCount,1);assert.equal(second.existingCount,1);assert.equal(second.conflictCount,1);
  assert.equal(await readFile(join(receiver,'.dsh','skills','gamma-skill','SKILL.md'),'utf8'),'USER CUSTOMIZATION');
});
test('untrusted paths, duplicate IDs, file collisions and altered bodies fail before writes',async t=>{
  const {receiver,bundle}=await fixture(t);
  for(const path of ['../escape','C:/escape','nested\\escape','con.txt','SKILL.md/child','.env','x:stream','trail.']){
    const value=structuredClone(bundle);value.items[0].files[1][0]=path;assert.throws(()=>validateBundle(value));
  }
  const dupe=structuredClone(bundle);dupe.items.push(dupe.items[0]);assert.throws(()=>validateBundle(dupe));
  const casing=structuredClone(bundle);casing.items[0].files.push([...casing.items[0].files[0]]);casing.items[0].files.at(-1)[0]='skill.md';assert.throws(()=>validateBundle(casing));
  const changed=structuredClone(bundle);changed.items[0].files[0][3]=Buffer.from('changed').toString('base64');
  await assert.rejects(()=>installBundle(receiver,changed,['alpha-skill']));assert.deepEqual(await readdir(receiver),[]);
  const rename=structuredClone(bundle);rename.items[0].id='other-name';assert.throws(()=>validateBundle(rename),/正文不一致/);
});
test('freshly changed local files are shared verbatim and caches are not packaged',async t=>{
  const {catalog}=await fixture(t);const source=catalog[0].source;
  await writeFile(source,(await readFile(source,'utf8'))+'\nMy local change');
  await mkdir(join(source,'..','.git'));await writeFile(join(source,'..','.git','config'),'PRIVATE REPO CONFIG');
  const files=await localFiles(catalog[0]);assert.equal(files.length,2);
  assert.match(Buffer.from(files.find(f=>f[0]==='SKILL.md')[3],'base64').toString(),/My local change/);
});
test('locked receiver rejects a second installer and makes no changes',async t=>{
  const {receiver,bundle}=await fixture(t);await mkdir(join(receiver,'.dsh','skills'),{recursive:true});
  await writeFile(join(receiver,'.dsh','skills','.harness-share.lock'),'');
  await assert.rejects(()=>installBundle(receiver,bundle,['alpha-skill']),/正在安装/);
  assert.deepEqual(await readdir(join(receiver,'.dsh','skills')),['.harness-share.lock']);
});
test('registered root junctions are pinned, while nested links cannot escape a skill',async t=>{
  const {root,catalog}=await fixture(t),target=join(root,'source','alpha-skill'),alias=join(root,'alias');
  await symlink(target,alias,'junction');
  const item=await catalogItem({name:'alpha-skill',path:join(alias,'SKILL.md'),description:'Test'});
  assert.equal(item.shareable,true);assert.equal(item.source,join(target,'SKILL.md'));
  await symlink(join(root,'source','beta-skill'),join(target,'outside'),'junction');
  const blocked=await catalogItem({name:'alpha-skill',path:join(alias,'SKILL.md'),description:'Test'});
  assert.equal(blocked.shareable,false);assert.match(blocked.reason,/其他目录/);
});
