import React,{useEffect,useRef} from 'react';
import {CanvasSpace} from 'pts';
import {QrCode,Ecc} from '@rc-component/qrcode/lib/libs/qrcodegen';
import {SWIM_CARD_THEMES} from './whale-themes';
import originalWhale from '../public/art/whale/deepseek-whale.svg?raw';
import './integrated-share-card.css';

const W=480;
const whaleOutline=originalWhale.match(/<path d="([^"]+)"/)?.[1];
const qrInk='#152749';

function lines(ctx,text,width,size,weight=400){
  ctx.font=`${weight} ${size}px MiSans`;
  const rows=[];let row='';
  for(const c of text){
    if(c==='\n'){rows.push(row);row='';continue;}
    if(row&&ctx.measureText(row+c).width>width){rows.push(row);row=c;}else row+=c;
  }
  if(row)rows.push(row);
  return rows;
}
function rounded(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function label(ctx,text,x,y,size,color,weight=400,align='left'){
  ctx.font=`${weight} ${size}px MiSans`;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function textRows(ctx,rows,x,y,size,lineHeight,color,weight=400,align='left'){
  rows.forEach((row,i)=>label(ctx,row,x,y+i*lineHeight,size,color,weight,align));
}
function drawWhale(ctx,x,y,size,color,rotation=0){
  ctx.save();ctx.translate(x+size/2,y+size/2);ctx.rotate(rotation);ctx.translate(-size/2,-size/2);ctx.scale(size/50,size/50);ctx.fillStyle=color;ctx.fill(new Path2D(whaleOutline));ctx.restore();
}
function imageOnPaper(ctx,art,x,y,width){
  // The supplied originals remain intact. Multiplication makes their white
  // paper share the card's pale surface without a rectangular portrait frame.
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.filter='brightness(1.04)';ctx.drawImage(art,x,y,width,width*art.naturalHeight/art.naturalWidth);ctx.restore();
}
function qrImage(ctx,qr,x,y,size=192){
  // QR is painted last, opaque and axis-aligned. No artwork enters its quiet zone.
  ctx.save();ctx.fillStyle='#fff';ctx.fillRect(x,y,size,size);
  const scale=Math.abs(ctx.getTransform().a),cells=qr.size+8,step=Math.max(1,Math.floor(size*scale/cells)),left=Math.round(x*scale+(size*scale-cells*step)/2)/scale,top=Math.round(y*scale+(size*scale-cells*step)/2)/scale;
  ctx.fillStyle=qrInk;
  for(let row=0;row<qr.size;row++)for(let col=0;col<qr.size;col++)if(qr.getModule(col,row))ctx.fillRect(left+(col+4)*step/scale,top+(row+4)*step/scale,step/scale,step/scale);
  ctx.restore();
}
function composition(pack){return pack.composition.filter(c=>c.value);}
function compositionRows(ctx,pack,width,size){
  ctx.font=`400 ${size}px MiSans`;const rows=[];let row='';
  for(const c of composition(pack)){const group=`${c.name} ${c.value}`,next=row?`${row} · ${group}`:group;if(row&&ctx.measureText(next).width>width){rows.push(row);row=group;}else row=next;}
  if(row)rows.push(row);return rows;
}

function layout(ctx,pack,kind){
  const title=lines(ctx,pack.title,408,32,500);
  const description=lines(ctx,pack.description||'打开后，可以查看内容并选择安装。',408,17);
  const titleY=kind==='whale'?72:66;
  const descriptionY=titleY+title.length*40+14;
  const bodyY=descriptionY+description.length*25+22;
  const countRows=compositionRows(ctx,pack,416,17);
  const height=kind==='whale'?bodyY+556:bodyY+584;
  return {title,description,titleY,descriptionY,bodyY,countRows,height};
}
function whaleCard(ctx,qr,pack,L){
  const H=L.height,b=L.bodyY;
  const sea=ctx.createLinearGradient(0,0,320,H);sea.addColorStop(0,'#597bff');sea.addColorStop(.55,'#4d6bfe');sea.addColorStop(1,'#3552da');ctx.fillStyle=sea;ctx.fillRect(0,0,W,H);
  // The sea contour crosses the composition, linking the full-size mark and QR.
  ctx.save();ctx.strokeStyle='#d7e7ff';ctx.lineWidth=1.2;
  for(let i=0;i<4;i++){ctx.globalAlpha=.12-i*.02;ctx.beginPath();ctx.ellipse(296,b+290+i*18,312,144+i*11,-.32,0,Math.PI*2);ctx.stroke();}ctx.restore();
  label(ctx,'Harness Share',34,30,16,'#eef4ff',500);
  textRows(ctx,L.title,34,L.titleY,32,40,'#fff',500);
  textRows(ctx,L.description,34,L.descriptionY,17,25,'#e6eeff');
  drawWhale(ctx,24,b-4,390,'#f8fbff',-.13);
  // An off-centre white inlet leaves the whale as the dominant silhouette.
  const qx=249,qy=b+267;
  rounded(ctx,qx-13,qy-13,218,247,24,'#ffffff');
  qrImage(ctx,qr,qx,qy);
  label(ctx,'打开分享，查看内容',qx+96,qy+208,16,qrInk,500,'center');
  label(ctx,String(pack.assetIds.length),34,b+386,44,'#fff',500);
  label(ctx,'项配置',34,b+438,17,'#eef4ff');
  textRows(ctx,compositionRows(ctx,pack,168,16),34,b+470,16,23,'#e0eaff');
  label(ctx,pack.footer,W/2,H-28,16,'#e5eeff',400,'center');
}
function girlCard(ctx,qr,art,pack,L){
  const H=L.height,b=L.bodyY;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const wash=ctx.createRadialGradient(386,b+220,20,386,b+220,270);wash.addColorStop(0,'#edf3ff');wash.addColorStop(1,'#ffffff');ctx.fillStyle=wash;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.strokeStyle='#c6d8f1';ctx.globalAlpha=.55;ctx.lineWidth=1;
  for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(382,b+248,173+i*18,245+i*10,-.23,Math.PI*.93,Math.PI*2.1);ctx.stroke();}ctx.restore();
  label(ctx,'Harness Share',34,28,16,'#657c9e',500);
  textRows(ctx,L.title,34,L.titleY,32,40,'#1c355e',500);
  textRows(ctx,L.description,34,L.descriptionY,17,25,'#5a7090');
  // The full figure determines the right edge and the tall reading rhythm.
  imageOnPaper(ctx,art,204,b-20,270);
  label(ctx,String(pack.assetIds.length),34,b+37,40,'#2d5187',500);
  label(ctx,'项配置',91,b+54,17,'#627b9e');
  const qx=24,qy=b+128;
  rounded(ctx,qx-9,qy-9,210,210,8,'#fff');
  qrImage(ctx,qr,qx,qy);
  label(ctx,'打开分享，查看内容',qx+96,qy+207,16,'#29466f',500,'center');
  composition(pack).forEach((c,i)=>{label(ctx,c.name,34,b+376+i*25,17,'#637a9a');label(ctx,String(c.value),176,b+376+i*25,17,'#29466f',500,'right');});
  ctx.fillStyle='#dce6f3';ctx.fillRect(34,H-90,412,1);
  label(ctx,pack.footer,W/2,H-73,16,'#62758f',400,'center');
  label(ctx,'ZipZipPipe · 原设上善无形 · CC BY-NC-SA 4.0',W/2,H-48,16,'#657892',400,'center');
  label(ctx,'bilibili.com/opus/1233069202138464289',W/2,H-27,16,'#657892',400,'center');
}
export default function IntegratedWhaleShareCard({pack,url,cardTheme,onReady,onError}){
  const canvas=useRef(null),ready=useRef(onReady),error=useRef(onError);
  ready.current=onReady;error.current=onError;
  useEffect(()=>{
    let disposed=false,space,timer,loadTimer,art;
    ready.current?.(null);
    const chosen=SWIM_CARD_THEMES.find(t=>t.id===cardTheme)||SWIM_CARD_THEMES[0];
    async function draw(){try{
      art=new Image();
      await Promise.all([
        document.fonts.load('400 17px MiSans',pack.description+'技能插件主题偏好'),
        document.fonts.load('500 32px MiSans',pack.title+'Harness Share'),
        new Promise((resolve,reject)=>{loadTimer=setTimeout(()=>reject(new Error('art timeout')),8000);art.onload=()=>{clearTimeout(loadTimer);resolve();};art.onerror=()=>{clearTimeout(loadTimer);reject(new Error('art failed'));};art.src=chosen.art;}),
      ]);
      if(disposed)return;
      const L=layout(canvas.current.getContext('2d'),pack,chosen.id);
      canvas.current.parentElement.style.height=`${L.height}px`;canvas.current.style.height=`${L.height}px`;
      space=new CanvasSpace(canvas.current,()=>{timer=setTimeout(()=>{if(disposed)return;try{
        const source=QrCode.encodeText(url,Ecc.MEDIUM);
        const ctx=space.ctx;ctx.save();ctx.scale(space.size.x/W,space.size.y/L.height);
        if(chosen.id==='whale')whaleCard(ctx,source,pack,L);
        else girlCard(ctx,source,art,pack,L);
        ctx.restore();ready.current?.(canvas.current);
      }catch{if(!disposed)error.current?.();}},40);}).setup({bgcolor:'#fff',resize:false,pixelDensity:2,retina:true});
    }catch{if(!disposed)error.current?.();}}
    draw();return()=>{disposed=true;clearTimeout(timer);clearTimeout(loadTimer);if(art){art.onload=null;art.onerror=null;}space?.dispose();};
  },[pack.title,pack.description,pack.assetIds.join(','),url,cardTheme]);
  return <div style={{width:W,height:720}}><canvas ref={canvas} className="generated-canvas integrated-share-canvas" width={W} height={720}/></div>;
}
