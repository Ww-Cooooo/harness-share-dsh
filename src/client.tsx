import React,{useCallback,useEffect,useState} from 'react';
import {MenuItemButton} from '@deepseek-ai/dsh-client-ui-primitives';
import {TYPERT_REMOTE} from '../lib/typert.remote-client.js';
declare const require:any;
const NS='eh3-harness-share';
function ShareIcon(){return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>}
function Panel({ctx,visible=true}:{ctx:any,visible?:boolean}){
  const [module,setModule]=useState<any>(null),[failed,setFailed]=useState(false);
  const invoke=useCallback(async(method:string,input:any)=>{const result=await ctx.remote[NS].call(method,JSON.stringify(input));if(!result.ok)throw Error(result.error.message);return result.value},[ctx]);
  // Version-pinned adapter to the same 0.2.2-rc.1 action used by its native drag handle.
  // Pointer dragging remains host-owned; keyboard support is omitted if this action changes.
  const resizeHost=useCallback((width:number)=>ctx.layout.panels.setRightbar(width),[ctx]);
  useEffect(()=>{let live=true;require.async('./client.panel.js').then((m:any)=>{if(live)setModule(m)}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[]);
  if(failed)return <div style={{padding:32}}>分享页面没能打开，请重新打开 Harness Share。</div>;
  if(!module)return <div role="status" style={{padding:32,color:'var(--color-text-secondary)'}}>正在打开分享页面…</div>;
  const Content=module.SharePanel;return <Content invoke={invoke} visible={visible} resizeHost={typeof ctx.layout.panels?.setRightbar==='function'?resizeHost:undefined}/>;
}
export const inject=['slots','locale','layout','remote','sidebarRight','sidebarRightTabs'];
export async function apply(ctx:any){
  await ctx.remote.$mount(TYPERT_REMOTE);
  await ctx.inject([...inject,'remote.'+NS],(ctx:any)=>{
    ctx.effect(()=>ctx.locale.register(NS,{zh:{title:'分享与安装'},en:{title:'Harness Share'}}));
    const definition={id:NS+'/sidebar',kind:NS,priority:'extension',title:()=> '分享与安装',keepMounted:true};
    ctx.effect(()=>ctx.sidebarRightTabs.register(definition));
    function SidebarPanel({useTabInfo}:any){const info=useTabInfo();return <Panel ctx={ctx} visible={info.tab.visible}/>}
    ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({name:'sidebar.right.pane.tab',key:definition.id},SidebarPanel));
    // Use the host's existing small menus. No persistent homepage button.
    const open=()=>{if(ctx.sidebarRight.mounted.getSnapshot())ctx.sidebarRight.openTab(NS);else ctx.layout.selectPanel(NS)};
    const MenuEntry=({onDismiss}:any)=><MenuItemButton icon={<ShareIcon/>} onSelect={()=>{onDismiss();open()}}>分享与安装</MenuItemButton>;
    ctx.slots.inject('sidebar.panellist.actions',()=>ctx.slots.register({name:'sidebar.panellist.actions',id:NS,order:35},MenuEntry));
    ctx.slots.inject('sidebar.right.tab.guide.actions',()=>ctx.slots.register({name:'sidebar.right.tab.guide.actions',id:NS,order:35},MenuEntry));
    // Keep a standalone fallback for the host's no-conversation state.
    ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:NS},()=> <Panel ctx={ctx}/>));
  });
}
