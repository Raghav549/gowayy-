"use client";
import {useEffect,useState} from "react";

export function Intro({consoleMode}:{consoleMode:"admin"|"business"}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(sessionStorage.getItem("gowayy-console-intro"))return;sessionStorage.setItem("gowayy-console-intro","1");setVisible(true);const t=setTimeout(()=>setVisible(false),1450);return()=>clearTimeout(t);},[]);
 if(!visible)return null;
 return <div className="intro" aria-hidden="true"><div className="intro-orbit"><span className="intro-logo">gowa<strong>yy</strong></span><small>{consoleMode==="admin"?"CONTROL EVERYTHING":"GROW WITH GOWAYY"}</small></div></div>;
}
