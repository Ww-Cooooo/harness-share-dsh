import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WorkspaceAnalyzer, FaceModelEmitter, writeWorkspaceArtifacts } from '@deepseek-ai/dsh-typert-generator';
// The official generator discovers packages under packages/. Stage only this
// package inside the owned build directory; no parent workspace or shared lock.
const root=resolve('.build/typert');
const dir=resolve(root,'packages/plugin');
await mkdir(dir,{recursive:true});
await cp('src',resolve(dir,'src'),{recursive:true});
const manifest=JSON.parse(await readFile('package.json','utf8'));
await writeFile(resolve(dir,'package.json'),JSON.stringify(manifest,null,2));
// This generator recognizes protocol symbols only from registered workspace
// declarations. Stage the unmodified, pinned published declarations as well.
const protocol=resolve(root,'packages/protocol');
await mkdir(protocol,{recursive:true});
await cp('node_modules/@deepseek-ai/dsh-typert-protocol/lib',resolve(protocol,'lib'),{recursive:true});
await cp('node_modules/@deepseek-ai/dsh-typert-protocol/package.json',resolve(protocol,'package.json'));
await mkdir(resolve(protocol,'src'),{recursive:true});
for(const name of await readdir(resolve(protocol,'lib/types'))) {
  if(name.endsWith('.d.ts')) await cp(resolve(protocol,'lib/types',name),resolve(protocol,'src',name.replace('.d.ts','.ts')));
}
const compilerOptions={target:'ES2022',module:'ESNext',moduleResolution:'Bundler',strict:true,skipLibCheck:true,types:['node'],lib:['ES2022','DOM','ESNext.Disposable'],noEmit:true,allowImportingTsExtensions:true,paths:{'@deepseek-ai/dsh-typert-protocol':[resolve(protocol,'src/index.ts')]}};
// Register protocol symbol ownership without emitting its already-published
// SDK surface (which contains merges owned by many external SDK packages).
await writeFile(resolve(protocol,'empty.ts'),'export {};\n');
await writeFile(resolve(protocol,'tsconfig.host.json'),JSON.stringify({compilerOptions,files:['empty.ts']},null,2));
await writeFile(resolve(root,'tsconfig.host.json'),JSON.stringify({compilerOptions,files:[],references:[{path:'packages/protocol/tsconfig.host.json'},{path:'packages/plugin/tsconfig.host.json'}]},null,2));
await writeFile(resolve(dir,'tsconfig.host.json'),JSON.stringify({compilerOptions,include:['src/index.ts']},null,2));
const workspace=new WorkspaceAnalyzer({root,packages:[manifest.name],faces:['host'],rejectBuildOutputs:false}).analyze();
const artifacts=workspace.faces.flatMap(face=>face.packages.filter(p=>p.name===manifest.name).map(p=>({...new FaceModelEmitter(face).emit(p.name),packageRoot:p.root})));
if(artifacts.length!==1 || !artifacts[0].remote) throw new Error('Official generator found no Remote contribution');
writeWorkspaceArtifacts(root,artifacts);
await cp(resolve(dir,'lib'),resolve('lib'),{recursive:true});
console.log('Generated Host and Client Remote contracts with the official Typert generator.');
