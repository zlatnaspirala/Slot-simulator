"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultSlot } from "@/lib/slot/default";
import { Reel, SlotConfig } from "@/lib/slot/types";

const clone=<T,>(v:T):T=>structuredClone(v);

export default function Home(){
 const router=useRouter();
 const [c,setC]=useState<SlotConfig>(()=>clone(defaultSlot));
 const [m,setM]=useState<any>(null),[s,setS]=useState<any>(null),[spins,setSpins]=useState(100000);
 const [busy,setBusy]=useState(false),[user,setUser]=useState<any>(null),[authChecking,setAuthChecking]=useState(true),[simOpen,setSimOpen]=useState(true),[saveState,setSaveState]=useState<"loading"|"saved"|"saving"|"error">("loading");
 const [theme,setTheme]=useState<"dark"|"red">("dark");
 const [machines,setMachines]=useState<{id:string;name:string;updatedAt:string}[]>([]),[machineId,setMachineId]=useState(""),[machineName,setMachineName]=useState(""),[machineBusy,setMachineBusy]=useState(false);

 useEffect(()=>{let alive=true;fetch("/api/auth/me").then(async r=>{if(!r.ok){router.replace("/login");return}setUser((await r.json()).user);const cr=await fetch("/api/config");if(!cr.ok){if(alive)setSaveState("error");return}const data=await cr.json();if(alive){setMachines(data.machines||[]);setMachineId(data.activeId||"");setMachineName(data.config?.name||"");if(data.config)setC(clone(data.config));setSaveState("saved");setAuthChecking(false)}}).catch(()=>router.replace("/login"));return()=>{alive=false}},[router]);useEffect(()=>{if(authChecking||!machineId)return;setSaveState("saving");const timer=setTimeout(async()=>{try{const r=await fetch("/api/config",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id:machineId,name:machineName||c.name,config:{...c,name:machineName||c.name}})});if(r.status===401){router.replace("/login");return}const data=await r.json().catch(()=>({}));if(!r.ok){console.error("Machine save failed:",data);setSaveState("error");return}setMachines(list=>list.map(x=>x.id===machineId?{...x,name:machineName||c.name,updatedAt:data.updatedAt}:x));setSaveState("saved")}catch(error){console.error(error);setSaveState("error")}},500);return()=>clearTimeout(timer)},[c,machineId,machineName,authChecking,router]);}