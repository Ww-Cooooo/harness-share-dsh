export class QrImageError extends Error{constructor(code,message){super(message);this.code=code;}}
export async function readQrImage(file,signal){
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type))throw new QrImageError('format','请拖入 PNG、JPG 或 WebP 图片。');
  if(file.size>32*1024*1024)throw new QrImageError('size','图片超过 32 MB，请把技能分成几张卡分享。');
  signal?.throwIfAborted();
  const src=URL.createObjectURL(file),img=new Image();
  try{
    await new Promise((resolve,reject)=>{const finish=fn=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);fn();};const abort=()=>finish(()=>reject(new DOMException('Aborted','AbortError')));const timer=setTimeout(()=>finish(()=>reject(new QrImageError('image','图片打开得太久，请重新导入图片。'))),6000);img.onload=()=>finish(resolve);img.onerror=()=>finish(()=>reject(new QrImageError('image','图片打不开，请重新保存并导入图片。')));signal?.addEventListener('abort',abort,{once:true});img.src=src;});
    signal?.throwIfAborted();
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40_000_000)throw new QrImageError('dimensions','图片尺寸太大，请使用分享者保存的图片。');
    // Preserve screenshot pixels. Shrinking a desktop capture to 2000 px can
    // destroy the integer module grid of a perfectly readable dense QR.
    const scale=Math.min(1,Math.sqrt(16_000_000/(img.naturalWidth*img.naturalHeight))),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const inlineDecode=async()=>{await new Promise(resolve=>setTimeout(resolve,20));signal?.throwIfAborted();const {default:decode}=await import('jsqr');return decode(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'})?.data||null;};
    const text=globalThis.__HS_INLINE_QR__?await inlineDecode():await new Promise((resolve,reject)=>{const worker=new Worker(globalThis.__HS_QR_WORKER__||new URL('./qr-worker.js',import.meta.url),{type:'module'});const finish=fn=>{clearTimeout(timer);worker.terminate();signal?.removeEventListener('abort',abort);fn();};const abort=()=>finish(()=>reject(new DOMException('Aborted','AbortError')));const timer=setTimeout(()=>finish(()=>reject(new QrImageError('timeout','识别时间较长，请使用清晰的分享图片。'))),12000);signal?.addEventListener('abort',abort,{once:true});worker.onmessage=({data})=>finish(()=>data.error?reject(new QrImageError('decode','图片没能识别，请换一张清晰图片。')):resolve(data.text));worker.onerror=()=>finish(()=>reject(new QrImageError('worker','识别暂时没能启动，请重新导入图片。')));worker.postMessage({pixels:pixels.data.buffer,width:pixels.width,height:pixels.height},[pixels.data.buffer]);});
    if(!text)throw new QrImageError('not-found','没有找到清晰的二维码，请导入包含完整二维码的图片。');
    return text;
  }finally{img.src='';URL.revokeObjectURL(src);}
}
