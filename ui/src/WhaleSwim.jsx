import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Button} from 'antd';
import {PauseOutlined,CaretRightOutlined} from '@ant-design/icons';
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import {MotionPathPlugin} from 'gsap/MotionPathPlugin';
import {WHALE_COLORS} from './whale-themes';
import originalWhale from '../public/art/whale/deepseek-whale.svg?raw';

gsap.registerPlugin(useGSAP,MotionPathPlugin);
// Preserve every point of the original DeepSeek mark, including its eye.
const whalePath=originalWhale.match(/<path d="([^"]+)"/)?.[1];
const TAU=Math.PI*2;
const arc=(start,end)=>{
  const points=Array.from({length:65},(_,i)=>{
    const a=start+(end-start)*i/64;
    return `${280+196*Math.cos(a)},${278+99*Math.sin(a)}`;
  });
  return `M${points.join(' L')}`;
};
const backArc=arc(Math.PI,TAU),frontArc=arc(0,Math.PI);

export default function WhaleSwim({ids,availableIds,view,category,reduced,generation,paused,completed,reading,dragging,exportReady,exportFailed,catalog=[],completedLabel,compact=false}){
  const root=useRef(null),swimmer=useRef(null),dive=useRef(null),ripple=useRef(null),wake=useRef(null);
  const loop=useRef(null),burst=useRef(null),previous=useRef(new Set(ids));
  const [userPaused,setUserPaused]=useState(false);
  const gate=useRef({visible:true,onScreen:true,paused:false});
  const active=useMemo(()=>new Set(ids),[ids]);
  const available=useMemo(()=>new Set(availableIds),[availableIds]);
  const finished=useMemo(()=>new Set(completed),[completed]);
  const dots=catalog.filter(a=>a.type!=='preference'||available.has(a.id));
  const sync=()=>{const g=gate.current;const run=g.visible&&g.onScreen&&!g.paused;loop.current?.paused(!run);burst.current?.paused(!run);};

  useGSAP(()=>{
    if(reduced)return;
    const pose={x:334,y:265},history=[];
    const bubbles=[...wake.current.children];
    const paint=()=>{
      const progress=loop.current?.progress()||0;
      const rotation=Math.sin(progress*TAU)*8-5;
      const scale=1+Math.sin(progress*TAU)*.045;
      swimmer.current.setAttribute('transform',`translate(${pose.x} ${pose.y}) rotate(${rotation}) scale(${scale})`);
      history.unshift({x:pose.x+94,y:pose.y-35});
      if(history.length>110)history.pop();
      bubbles.forEach((bubble,i)=>{
        const point=history[Math.min(history.length-1,i*7)];
        if(!point)return;
        bubble.setAttribute('cx',point.x+i*.7);
        bubble.setAttribute('cy',point.y-i*1.15);
      });
    };
    // A closed ellipse has matching endpoint tangents; the loop never changes
    // direction abruptly. Its low pass takes the body behind the front water.
    loop.current=gsap.to(pose,{duration:15,repeat:-1,ease:'none',motionPath:{path:'M334 265 A60 50 0 1 1 214 265 A60 50 0 1 1 334 265 Z'},onUpdate:paint});
    paint();sync();
    return()=>{loop.current=null;swimmer.current?.setAttribute('transform','translate(280 250) rotate(-5)');};
  },{scope:root,dependencies:[reduced],revertOnUpdate:true});

  useEffect(()=>{gate.current.paused=paused||userPaused||reduced;sync();},[paused,userPaused,reduced]);
  useEffect(()=>{
    const visibility=()=>{gate.current.visible=!document.hidden;sync();};
    const observer=new IntersectionObserver(([entry])=>{gate.current.onScreen=entry.isIntersecting;sync();});
    observer.observe(root.current);visibility();document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
  },[]);

  useGSAP(()=>{
    const changed=[...root.current.querySelectorAll('[data-asset-dot]')].filter(node=>previous.current.has(node.dataset.assetDot)!==active.has(node.dataset.assetDot));
    previous.current=new Set(ids);
    if(reduced||!changed.length)return;
    gsap.fromTo(changed,{attr:{r:5.2}},{attr:{r:2.9},duration:.7,ease:'power2.out'});
  },{scope:root,dependencies:[ids.join(','),reduced],revertOnUpdate:true});

  useGSAP(()=>{
    if(reduced||!generation||view!=='shared')return;
    // A local wake acknowledges the action. Export success comes from the canvas.
    burst.current=gsap.timeline().fromTo(dive.current,{y:0,rotation:0},{y:22,rotation:7,duration:.38,ease:'power2.in'}).to(dive.current,{y:0,rotation:0,duration:1,ease:'power3.out'});
    burst.current.fromTo(ripple.current,{opacity:.7,scale:.92},{opacity:0,scale:1.18,duration:1.35,ease:'power2.out',transformOrigin:'50% 50%'},.2);
    sync();
    return()=>{burst.current=null;};
  },{scope:root,dependencies:[generation,reduced,view],revertOnUpdate:true});

  const countLabel=reading?'正在识别图片':dragging?'松开图片，开始识别':view==='install'?`已完成 ${completed.length} / ${ids.length} 项`:view==='done'?(completedLabel??`${ids.length} 项演示完成`):view==='shared'?(exportFailed?'图片暂未生成':exportReady?`已打包 ${ids.length} 项`:'正在生成分享卡'):`已选 ${ids.length} 项`;
  return <div className={`whale-swim ${reduced?'is-still':''} ${dragging?'is-dragging':''}`} ref={root}>
    <svg className="swim-scene" viewBox={compact?'20 74 520 390':'0 0 560 520'} role="img" aria-label={`DeepSeek 小鲸鱼穿梭水环，${countLabel}`}>
      <defs>
        <linearGradient id="swim-water" x1=".1" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#647fff"/><stop offset=".44" stopColor="#b1eaff"/><stop offset=".73" stopColor="#4d6bfe"/><stop offset="1" stopColor="#29477e"/></linearGradient>
        <linearGradient id="swim-front" x1="0" y1="0" x2="1" y2=".7"><stop stopColor="#5474e8"/><stop offset=".35" stopColor="#d0f3ff"/><stop offset=".67" stopColor="#8abaff"/><stop offset="1" stopColor="#3f5acc"/></linearGradient>
        <linearGradient id="swim-whale" x1=".1" y1=".2" x2=".8" y2="1"><stop stopColor="#b3d5ff"/><stop offset=".38" stopColor="#668eff"/><stop offset=".74" stopColor="#4d6bfe"/><stop offset="1" stopColor="#314bb8"/></linearGradient>
        <radialGradient id="swim-haze"><stop stopColor="#476eff" stopOpacity=".15"/><stop offset="1" stopColor="#476eff" stopOpacity="0"/></radialGradient>
        <filter id="swim-soft" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>
        <filter id="swim-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="15" stdDeviation="14" floodColor="#030a20" floodOpacity=".5"/></filter>
      </defs>
      <ellipse cx="280" cy="276" rx="273" ry="225" fill="url(#swim-haze)"/>
      <ellipse cx="282" cy="431" rx="125" ry="13" fill="#3858bc" opacity=".13" filter="url(#swim-soft)"/>
      <g transform="rotate(-24 280 278)">
        <path d={backArc} fill="none" stroke="#7c9fff" strokeWidth="36" opacity=".07" filter="url(#swim-soft)"/>
        <path d={backArc} fill="none" stroke="url(#swim-water)" strokeWidth="29" strokeLinecap="round" opacity=".65"/>
        <path d={backArc} fill="none" stroke="#d3efff" strokeWidth="1.25" opacity=".66" transform="translate(0 -12)"/>
        <path d={backArc} fill="none" stroke="#8ba6ff" strokeWidth=".6" opacity=".4" transform="translate(0 14)"/>
      </g>
      <g ref={wake} className="swim-wake" fill="none" stroke="#9dcfff" strokeWidth="1.2">{Array.from({length:13},(_,i)=><circle key={i} cx={380+i*4} cy={220-i*2} r={3.4-i*.17} opacity={(1-i/13)*.5}/>)}</g>
      <g ref={swimmer} transform="translate(280 250) rotate(-5)"><g ref={dive} className="swim-diver"><g transform="translate(-102 -102) scale(4.08)" filter="url(#swim-shadow)"><path d={whalePath} fill="url(#swim-whale)"/></g></g></g>
      <g transform="rotate(-24 280 278)">
        <path d={frontArc} fill="none" stroke="#5b8aff" strokeWidth="43" opacity=".12" filter="url(#swim-soft)"/>
        <path d={frontArc} fill="none" stroke="url(#swim-front)" strokeWidth="29" strokeLinecap="round" opacity=".8"/>
        <path d={frontArc} fill="none" stroke="#d7f5ff" strokeWidth="1.6" opacity=".9" transform="translate(0 -13)"/>
        <path d={frontArc} fill="none" stroke="#5977ea" strokeWidth="1.2" opacity=".55" transform="translate(0 13)"/>
        <path d={frontArc} fill="none" stroke="#e2f4ff" strokeWidth=".6" opacity=".5" transform="translate(0 -7)"/>
      </g>
      <g ref={ripple} opacity="0"><ellipse cx="280" cy="278" rx="220" ry="118" transform="rotate(-24 280 278)" fill="none" stroke="#acd9ff" strokeWidth="1.4"/></g>
      <g className="swim-dots" transform="rotate(-24 280 278)">{dots.map((a,i)=>{
        const angle=-Math.PI/2+i/dots.length*TAU;
        const selected=active.has(a.id),included=available.has(a.id),focused=!category||category===a.type;
        const opacity=!included ? .05 : !selected ? .15 : !focused ? .24 : view==='install'&&!finished.has(a.id) ? .3 : .95;
        return <circle key={a.id} data-asset-dot={a.id} data-selected={selected} cx={280+224*Math.cos(angle)} cy={278+132*Math.sin(angle)} r="2.9" fill={selected?WHALE_COLORS[a.type]:'#637493'} opacity={opacity}/>;
      })}</g>
    </svg>
    <div className="swim-caption"><span>{countLabel}</span>{!reduced&&<Button type="text" shape="circle" aria-label={userPaused?'播放小鲸鱼动效':'暂停小鲸鱼动效'} icon={userPaused?<CaretRightOutlined/>:<PauseOutlined/>} onClick={()=>setUserPaused(p=>!p)}/>}</div>
  </div>;
}
