import React,{useEffect,useMemo,useRef} from 'react';
import {sidebarResizeCss,useSidebarResize} from './sidebar-resize';
declare const __SHARE_DOCUMENT__:string;
const methods=new Set(['entry','share','decode','inspect','install','loaded','recommend','job']);
export function SharePanel({invoke,visible=true,resizeHost}:{invoke:(method:string,input:any)=>Promise<string>,visible?:boolean,resizeHost?:(width:number)=>void}){
  const frame=useRef<HTMLIFrameElement>(null),channel=useMemo(()=>crypto.randomUUID(),[]);
  useSidebarResize(frame,visible,resizeHost);
  const html=useMemo(()=>__SHARE_DOCUMENT__.replace('__HARNESS_SHARE_CHANNEL__',channel),[channel]);
  const syncVisibility=()=>frame.current?.contentWindow?.postMessage({kind:'harness-share-visibility',channel,visible},'*');
  useEffect(syncVisibility,[visible,channel]);
  useEffect(()=>{
    let live=true;
    const receive=async(event:MessageEvent)=>{
      if(event.source!==frame.current?.contentWindow||event.data?.channel!==channel||event.data?.kind!=='harness-share-call')return;
      const {id,method,input}=event.data;if(typeof id!=='string'||id.length>80||!methods.has(method))return;
      let reply;try{reply=JSON.parse(await invoke(method,input))}catch(error:any){console.error('[Harness Share]',error?.message);reply={ok:false,error:'与 Harness 的连接中断，请重新打开页面。'}}
      if(live)frame.current?.contentWindow?.postMessage({kind:'harness-share-result',channel,id,...reply},'*');
    };
    window.addEventListener('message',receive);return()=>{live=false;window.removeEventListener('message',receive)};
  },[invoke,channel]);
  // The iframe owns one scroll surface and inherits the host pane's actual size.
  return <><style>{sidebarResizeCss}</style><iframe ref={frame} onLoad={syncVisibility} title="Harness Share 分享与安装" srcDoc={html} sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write" style={{border:0,width:'100%',height:'100%',flex:'1 1 auto',display:'block',minHeight:0,minWidth:0,background:'#10182a'}}/></>;
}
