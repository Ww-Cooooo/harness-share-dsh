import React,{useEffect,useRef,useState} from 'react';
import {Modal} from 'antd';
import {PictureOutlined,LoadingOutlined} from '@ant-design/icons';
import {imageFileFromDataUrl} from './portable-png';

export default function FocusImageImport({open,setOpen,busy,onImported,onReading,onDragging,reduced,parse}){
  const [reading,setReading]=useState(false),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
  const request=useRef(null),zone=useRef(null),depth=useRef(0),latest=useRef({});
  latest.current={busy,open,onImported,onReading,onDragging,setOpen,parse};
  const read=async files=>{
    if(latest.current.busy)return;
    latest.current.setOpen(true);request.current?.abort();request.current=null;
    setError('');setReading(false);latest.current.onReading(false);
    if(files.length!==1){setError('一次拖入一张二维码图片就好。');return;}
    const controller=new AbortController();request.current=controller;
    setReading(true);latest.current.onReading(true);
    try{
      const {readQrImage}=await import('./qr-image');
      const text=await readQrImage(files[0],controller.signal);
      controller.signal.throwIfAborted();
      let pack;try{pack=await latest.current.parse(text);}catch(e){throw Error(e.message||'读到了二维码，但这张分享卡暂不受支持。');}
      if(!controller.signal.aborted){latest.current.onImported(pack,text);latest.current.setOpen(false);}
    }catch(e){if(!controller.signal.aborted)setError(`${e.message||'图片没能识别，请换一张清晰图片。'} 当前选择已保留。`);}
    finally{if(request.current===controller){request.current=null;setReading(false);latest.current.onReading(false);}}
  };
  const readRef=useRef(read);readRef.current=read;
  useEffect(()=>{if(!open)setError('');},[open]);
  useEffect(()=>{
    const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).some(type=>type==='Files'||type==='text/uri-list');
    const drag=value=>{setDragging(value);latest.current.onDragging(value);};
    const enter=e=>{if(!hasFiles(e))return;e.preventDefault();if(!latest.current.busy){depth.current++;drag(true);}};
    const over=e=>{if(hasFiles(e)){e.preventDefault();e.dataTransfer.dropEffect=latest.current.busy?'none':'copy';}};
    const leave=e=>{if(!hasFiles(e))return;depth.current=Math.max(0,depth.current-1);if(!depth.current)drag(false);};
    const drop=e=>{
      if(!hasFiles(e))return;e.preventDefault();depth.current=0;drag(false);if(latest.current.busy)return;
      try{
        const files=Array.from(e.dataTransfer.files);
        // Browser image drags can carry the original data URL instead of a File.
        // Accept image bytes only; never request arbitrary dropped URLs.
        if(!files.length)files.push(imageFileFromDataUrl(e.dataTransfer.getData('text/uri-list').trim()));
        readRef.current(files);
      }catch(error){latest.current.setOpen(true);setError(error.message);}
    };
    const paste=e=>{if(!latest.current.open)return;const files=Array.from(e.clipboardData?.files||[]);if(files.length){e.preventDefault();readRef.current(files);}};
    const blur=()=>{depth.current=0;drag(false);};
    for(const [name,fn] of Object.entries({dragenter:enter,dragover:over,dragleave:leave,drop,paste,blur}))addEventListener(name,fn);
    return()=>{request.current?.abort();for(const [name,fn] of Object.entries({dragenter:enter,dragover:over,dragleave:leave,drop,paste,blur}))removeEventListener(name,fn);};
  },[]);
  const close=()=>{request.current?.abort();request.current=null;setReading(false);onReading(false);setDragging(false);onDragging(false);depth.current=0;setOpen(false);};
  return <Modal title="导入二维码图片" open={open} onCancel={close} footer={null} width={560} className="focus-modal image-import-modal" afterOpenChange={visible=>{if(visible)zone.current?.focus({preventScroll:true});}}>
    <div ref={zone} tabIndex={0} className={`qr-dropzone ${dragging?'is-dragging':''} ${reading?'is-reading':''}`} aria-label="二维码图片拖放区" aria-busy={reading}>
      <span className="drop-corner top-left"/><span className="drop-corner top-right"/><span className="drop-corner bottom-left"/><span className="drop-corner bottom-right"/>
      <span className="drop-image-mark">{reading?<LoadingOutlined spin={!reduced}/>:<PictureOutlined/>}</span>
      <strong>{reading?'正在识别二维码…':dragging?'松开图片，开始识别':'把二维码图片拖到这里'}</strong>
      <span>{reading?'图片只在本机处理':'也可以按 Ctrl + V 粘贴图片'}</span>
      <small>支持图片和截图 · 最大 32 MB</small>
    </div>
    {error?<p className="image-import-error" role="alert">{error}</p>:<p className="image-import-note">识别后先查看内容，再选择安装。</p>}
    <div className="sr-only" role="status">{reading?'正在识别二维码图片':error||'可以拖入或粘贴二维码图片'}</div>
  </Modal>;
}
