import React,{useMemo,useRef,useState,useEffect} from 'react';
import {QRCodeSVG} from '@rc-component/qrcode';
import {QrCode,Ecc} from '@rc-component/qrcode/lib/libs/qrcodegen';

// A module must occupy whole pixels. Fractional CSS scaling breaks dense codes
// even when their centre samples contain all the data.
export default function CrispQr({value}){
  const root=useRef(null),[width,setWidth]=useState(360);
  const cells=useMemo(()=>QrCode.encodeText(value,Ecc.MEDIUM).size+8,[value]);
  useEffect(()=>{const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));observer.observe(root.current);return()=>observer.disconnect()},[]);
  const ratio=window.devicePixelRatio||1,size=cells*Math.max(1,Math.floor(width*ratio/cells))/ratio;
  return <div ref={root} style={{width:'100%',maxWidth:384,display:'grid',justifyItems:'center',gap:12}}><QRCodeSVG value={value} level="M" marginSize={4} size={size} fgColor="#111827" bgColor="#fff" title="包含所选内容与安装信息的二维码"/>{size/cells<2&&<small>拉宽侧栏，二维码会更清楚。</small>}</div>;
}
