import {readFile,readdir,mkdir,writeFile,copyFile,stat} from 'node:fs/promises';
import {resolve,dirname,join,basename} from 'node:path';
const root=resolve('.'),pkg=JSON.parse(await readFile('package.json','utf8'));
const meta=JSON.parse(await readFile('.build/metafiles.json','utf8'));
const roots=new Set();
for(const part of Object.values(meta)) for(const file of Object.keys(part.inputs||{})) {
  if(!file.includes('node_modules/'))continue;
  let dir=dirname(resolve(file));
  while(dir.startsWith(root)&&dir!==root){
    try {const p=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));if(p.name&&p.version){roots.add(dir);break;}}catch{}
    dir=dirname(dir);
  }
}
for(const name of Object.keys(pkg.dependencies||{}))roots.add(resolve('node_modules',name));
const entries=[],missing=[];
await mkdir('licenses/third-party',{recursive:true});
for(const dir of [...roots].sort()) {
  const p=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));
  const files=(await readdir(dir)).filter(x=>/^(licen[cs]e|notice|copying|copyright)(\.|$)/i.test(x)&&!x.endsWith('.json'));
  const notice=[];
  for(const file of files){if(!(await stat(join(dir,file))).isFile())continue;const out=`${p.name.replaceAll('@','').replaceAll('/','__')}--${basename(file)}`;await copyFile(join(dir,file),join('licenses/third-party',out));notice.push(out);}
  const supplement={'@ant-design/icons-svg':'ant-design__icons-svg--LICENSE','@gsap/react':'gsap-standard-license.txt','gsap':'gsap-standard-license.txt','is-mobile':'is-mobile--LICENSE'}[p.name];
  if(!notice.length&&supplement){await stat(join('licenses/third-party',supplement));notice.push(supplement);}
  if(!notice.length)missing.push(p.name);
  entries.push({name:p.name,version:p.version,license:p.license||'See upstream',repository:typeof p.repository==='string'?p.repository:p.repository?.url||'',notices:notice});
}
await writeFile('licenses/dependencies.json',JSON.stringify(entries,null,2)+'\n');
const rows=entries.map(p=>`| ${p.name} | ${p.version} | ${p.license} | ${p.notices.map(n=>`[${n}](licenses/third-party/${n})`).join(', ')||'See upstream notice below'} |`);
await writeFile('DEPENDENCIES.md','# Dependency notices\n\nGenerated from the actual build inputs and separately installed image decoders. Host SDK dependencies are declared as peers in package.json and retain their original licenses. Build tools and their transitive dependencies remain described by package-lock.json.\n\n| Package | Version | License declaration | License/notice |\n| --- | --- | --- | --- |\n'+rows.join('\n')+'\n');
console.log(JSON.stringify({packages:entries.length,missing}));
