export function toBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text)}
export const fromBase64=text=>Uint8Array.from(atob(text),x=>x.charCodeAt(0));
export function imageFileFromDataUrl(url){
  if(typeof url!=='string'||url.length>Math.ceil(32*1024*1024/3)*4+100)throw Error('图片过大，请把技能分成几张卡分享。');
  const match=url.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
  if(!match)throw Error('请先保存图片，再把图片文件拖进来。');
  const bytes=fromBase64(match[2]);
  return new File([bytes],`share.${match[1].split('/')[1]}`,{type:match[1]});
}
