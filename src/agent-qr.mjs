import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {PNG} from 'pngjs';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';
import {ShareError} from './core.mjs';
export function decodeQrPixels(bytes){
  let image;
  try{
    if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
      if(bytes.readUInt32BE(16)*bytes.readUInt32BE(20)>16000000)throw Error('size');
      image=PNG.sync.read(bytes);
    }else image=jpeg.decode(bytes,{useTArray:true,maxResolutionInMP:16,maxMemoryUsageInMB:128});
  }catch{throw new ShareError('image','请使用清晰的 PNG 或 JPG 截图。')}
  const code=jsQR(new Uint8ClampedArray(image.data),image.width,image.height,{inversionAttempts:'attemptBoth'});
  if(!code?.data)throw new ShareError('image','没有读到二维码，请保留完整二维码并放大后重试。');return code.data;
}
export async function readAgentQr(workspace,imagePath){
  if(typeof imagePath!=='string'||!imagePath)throw new ShareError('image','请提供项目内的二维码截图路径。');
  const root=await realpath(workspace),path=await realpath(resolve(root,imagePath)),rel=relative(root,path);
  if(isAbsolute(rel)||rel.startsWith('..'))throw new ShareError('image','请把二维码图片放进当前项目，再读取。');
  const size=(await stat(path)).size;if(size>32*1024*1024)throw new ShareError('image','图片超过 32 MB，请缩小后再试。');
  return decodeQrPixels(await readFile(path));
}
