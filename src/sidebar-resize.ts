import {useEffect,type RefObject} from 'react';

// Enhance the host's handle instead of creating a second width/drag owner.
export const sidebarResizeCss=`
.harness-share-resize-handle{width:20px!important;margin-left:-10px!important;cursor:col-resize;touch-action:none;outline:none}
.harness-share-resize-handle::before{content:"";position:absolute;inset:0 auto 0 9px;width:2px;background:#6f8cff;opacity:0;transition:opacity .16s ease}
.harness-share-resize-handle::after{content:"";box-sizing:border-box;position:absolute;top:50%;left:3px;width:14px;height:64px;transform:translateY(-50%);border:1px solid #718bcb;border-radius:8px;background:linear-gradient(#afc5ff,#afc5ff) 4px center/2px 22px no-repeat,linear-gradient(#afc5ff,#afc5ff) 8px center/2px 22px no-repeat,#243653;box-shadow:0 2px 8px #07122338;transition:background-color .16s ease,box-shadow .16s ease}
.harness-share-resize-handle:hover::before,.harness-share-resize-handle:focus-visible::before,.harness-share-resize-handle[data-dragging]::before{opacity:.85}
.harness-share-resize-handle:hover::after,.harness-share-resize-handle:focus-visible::after,.harness-share-resize-handle[data-dragging]::after{background-color:#405bd3;border-color:#b4c8ff;box-shadow:0 0 0 3px #6f8cff24}
body:has(.harness-share-resize-handle[data-dragging]){cursor:col-resize;user-select:none}
body:has(.harness-share-resize-handle[data-dragging]) iframe[title="Harness Share 分享与安装"]{pointer-events:none}
@media(prefers-reduced-motion:reduce){.harness-share-resize-handle::before,.harness-share-resize-handle::after{transition:none}}
`;

export function useSidebarResize(frame:RefObject<HTMLIFrameElement|null>,visible:boolean,resizeHost?:((width:number)=>void)){
  useEffect(()=>{
    const iframe=frame.current;
    const column=iframe?.closest<HTMLElement>('[data-rightbar-col]');
    const host=column?.parentElement;
    if(!visible||!iframe||!column||!host)return;
    let handle:HTMLElement|null=null,restore:(()=>void)|undefined;
    const width=()=>Math.round(column.getBoundingClientRect().width);
    const maxWidth=()=>Math.round(host.getBoundingClientRect().width*.7);
    const update=()=>{
      handle?.setAttribute('aria-valuenow',String(width()));
      handle?.setAttribute('aria-valuemax',String(maxWidth()));
      handle?.setAttribute('aria-valuetext',`${width()} 像素`);
    };
    const bind=()=>{
      const next=host.querySelector<HTMLElement>(':scope > [data-side="rightbar"]');
      if(next===handle)return;
      restore?.();restore=undefined;handle=next;
      if(!next)return;
      const attrs=['title','role','tabindex','aria-label','aria-orientation','aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext','aria-keyshortcuts'];
      const previous=attrs.map(name=>[name,next.getAttribute(name)] as const);
      const hadClass=next.classList.contains('harness-share-resize-handle');
      next.classList.add('harness-share-resize-handle');
      next.title='左右拖动，调整侧栏宽度';
      if(resizeHost){
        next.setAttribute('role','separator');next.tabIndex=0;
        next.setAttribute('aria-label','调整分享侧栏宽度');
        next.setAttribute('aria-orientation','vertical');next.setAttribute('aria-valuemin','300');
        next.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home End');
      }
      const focus=()=>{if(resizeHost)next.focus({preventScroll:true})};
      const key=(event:KeyboardEvent)=>{
        if(!resizeHost||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();event.stopPropagation();
        const step=event.shiftKey?8:32;
        resizeHost(event.key==='Home'?300:event.key==='End'?maxWidth():width()+(event.key==='ArrowLeft'?step:-step));
      };
      next.addEventListener('pointerdown',focus);next.addEventListener('keydown',key);
      restore=()=>{
        next.removeEventListener('pointerdown',focus);next.removeEventListener('keydown',key);
        if(!hadClass)next.classList.remove('harness-share-resize-handle');
        for(const [name,value] of previous){if(value===null)next.removeAttribute(name);else next.setAttribute(name,value)}
      };
      update();
    };
    bind();
    const sizeObserver=new ResizeObserver(update);sizeObserver.observe(column);sizeObserver.observe(host);
    const handleObserver=new MutationObserver(bind);handleObserver.observe(host,{childList:true});
    return()=>{handleObserver.disconnect();sizeObserver.disconnect();restore?.()};
  },[frame,visible,resizeHost]);
}
