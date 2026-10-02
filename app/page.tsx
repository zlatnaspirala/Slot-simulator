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

 useEffect(()=>{let alive=true;fetch("/api/auth/me").then(async r=>{if(!r.ok){router.replace("/login");return}setUser((await r.json()).user);const cr=await fetch("/api/config");if(!cr.ok){if(alive)setSaveState("error");return}const data=await cr.json();if(alive){if(data.config)setC(clone(data.config));setSaveState(data.config?"saved":"loading");setAuthChecking(false)}}).catch(()=>router.replace("/login"));return()=>{alive=false}},[router]);

useEffect(()=>{if(authChecking||saveState==="loading")return;setSaveState("saving");const timer=setTimeout(async()=>{try{const r=await fetch("/api/config",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(c)});if(r.status===401){router.replace("/login");return}setSaveState(r.ok?"saved":"error")}catch{setSaveState("error")}},500);return()=>clearTimeout(timer)},[c,authChecking,router]);
 const payCounts=useMemo(()=>{const set=new Set<string>();Object.values(c.paytable).forEach(p=>Object.keys(p).forEach(n=>set.add(n)));return[...set].sort((a,b)=>Number(a)-Number(b))},[c.paytable]);
 if(authChecking)return <main><p className="muted">Checking session...</p></main>;
 function patch(p:Partial<SlotConfig>){setC(v=>({...v,...p}));setM(null);setS(null)}
 function updateReel(i:number,reel:Reel){patch({reels:c.reels.map((r,n)=>n===i?reel:r)})}
 function addReel(){patch({reels:[...c.reels,{id:"R"+(c.reels.length+1),strip:[c.symbols[0]?.id??"A"]}]})}
 function deleteReel(i:number){if(c.reels.length>1)patch({reels:c.reels.filter((_,n)=>n!==i)})}
 function addField(i:number){const r=c.reels[i];updateReel(i,{...r,strip:[...r.strip,c.symbols[0]?.id??"A"]})}
 function deleteField(ri:number,fi:number){const r=c.reels[ri];if(r.strip.length>1)updateReel(ri,{...r,strip:r.strip.filter((_,n)=>n!==fi)})}
 function setField(ri:number,fi:number,value:string){const r=c.reels[ri],strip=[...r.strip];strip[fi]=value;updateReel(ri,{...r,strip})}
 function addSymbol(){const id="SYM"+(c.symbols.length+1);patch({symbols:[...c.symbols,{id,name:id,type:"normal"}],reels:c.reels.map(r=>({...r,strip:[...r.strip,id]})),paytable:{...c.paytable,[id]:{}}})}
 function updatePayout(symbol:string,count:string,value:number){patch({paytable:{...c.paytable,[symbol]:{...c.paytable[symbol],[count]:value}}})}
 function addPayoutCount(){const next=Math.max(2,...payCounts.map(Number))+1;patch({paytable:Object.fromEntries(Object.entries(c.paytable).map(([x,p])=>[x,{...p,[String(next)]:0}]))})}
 function removePayoutCount(count:string){patch({paytable:Object.fromEntries(Object.entries(c.paytable).map(([x,p])=>{const q={...p};delete q[count];return[x,q]}))})}
 async function calc(){setBusy(true);try{const r=await fetch("/api/math",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(c)});if(r.status===401)return router.replace("/login");setM(await r.json())}finally{setBusy(false)}}
 async function sim(){setBusy(true);try{const r=await fetch("/api/simulate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({config:c,spins})});if(r.status===401)return router.replace("/login");setS(await r.json())}finally{setBusy(false)}}
 async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login")}
 return <div className={`appShell theme-${theme} ${simOpen?"sim-open":""}`}>
  <header className="topbar"><div className="brand"><b>Slot Simulator</b><span>Admin · {user?.email} · {saveState==="saving"?"Saving...":saveState==="saved"?"Saved":"Save error"}</span></div><div className="topActions"><div className="themeSwitch"><button className={theme==="dark"?"active":""} onClick={()=>setTheme("dark")}>Dark</button><button className={theme==="red"?"active":""} onClick={()=>setTheme("red")}>Red</button></div><button onClick={logout}>Logout</button></div></header>
  <main className="workspace">
   <div className="editor">
    <section className="panel compact"><div className="sectionTitle"><h1>Machine Configuration</h1><button onClick={calc} disabled={busy}>Calculate RTP</button></div><div className="fields"><label>Machine name<input value={c.name} onChange={e=>patch({name:e.target.value})}/></label><label>Target RTP %<input type="number" step=".01" value={c.targetRtp*100} onChange={e=>patch({targetRtp:Number(e.target.value)/100})}/></label><label>Bet per spin<input type="number" step=".01" value={c.betPerSpin} onChange={e=>patch({betPerSpin:Number(e.target.value)})}/></label></div></section>

    <section className="panel compact"><div className="sectionTitle"><h2>Reel Strips <small>{c.reels.length} reels</small></h2><button onClick={addReel}>+ Reel</button></div><div className="reels dynamicReels">{c.reels.map((reel,ri)=><div className="reel" key={reel.id}><div className="reelHeader"><strong>{reel.id}</strong><button className="danger small" onClick={()=>deleteReel(ri)} disabled={c.reels.length<=1}>Delete</button></div>{reel.strip.map((field,fi)=><div className="reelField" key={fi}><input aria-label={`${reel.id} stop ${fi+1}`} value={field} onChange={e=>setField(ri,fi,e.target.value)}/><button className="danger tiny" onClick={()=>deleteField(ri,fi)} disabled={reel.strip.length<=1}>×</button></div>)}<button className="small addField" onClick={()=>addField(ri)}>+ Field</button></div>)}</div></section>

    <section className="panel compact"><div className="sectionTitle"><h2>Symbols</h2><button onClick={addSymbol}>+ Symbol</button></div><div className="symbolEditor">{c.symbols.map((sym,i)=><div className="symbolRow" key={sym.id}><input value={sym.id} onChange={e=>{const a=[...c.symbols];a[i]={...sym,id:e.target.value};patch({symbols:a})}}/><input value={sym.name} onChange={e=>{const a=[...c.symbols];a[i]={...sym,name:e.target.value};patch({symbols:a})}}/><select value={sym.type} onChange={e=>{const a=[...c.symbols];a[i]={...sym,type:e.target.value as any};patch({symbols:a})}}><option value="normal">Normal</option><option value="wild">Wild</option><option value="scatter">Scatter</option></select></div>)}</div></section>

    <section className="panel compact"><div className="sectionTitle"><h2>Paytable</h2><button onClick={addPayoutCount}>+ Payout Count</button></div><div className="tableWrap"><table><thead><tr><th>Symbol</th>{payCounts.map(n=><th key={n}>{n} <button className="tiny danger" onClick={()=>removePayoutCount(n)}>×</button></th>)}</tr></thead><tbody>{c.symbols.map(sym=><tr key={sym.id}><td>{sym.name}</td>{payCounts.map(n=><td key={n}><input className="payInput" type="number" min="0" step=".01" value={c.paytable[sym.id]?.[n]??0} onChange={e=>updatePayout(sym.id,n,Number(e.target.value))}/></td>)}</tr>)}</tbody></table></div></section>

    <section className="panel compact"><div className="sectionTitle"><h2>Free Spins</h2><label className="check"><input type="checkbox" checked={c.freeSpins.enabled} onChange={e=>patch({freeSpins:{...c.freeSpins,enabled:e.target.checked}})}/> Enabled</label></div><div className="fields featureFields"><label>Trigger symbol<select value={c.freeSpins.triggerSymbol} onChange={e=>patch({freeSpins:{...c.freeSpins,triggerSymbol:e.target.value}})}>{c.symbols.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Trigger count<input type="number" min="1" value={c.freeSpins.triggerCount} onChange={e=>patch({freeSpins:{...c.freeSpins,triggerCount:Number(e.target.value)}})}/></label><label>Spins awarded<input type="number" min="0" value={c.freeSpins.spinsAwarded} onChange={e=>patch({freeSpins:{...c.freeSpins,spinsAwarded:Number(e.target.value)}})}/></label><label>Multiplier<input type="number" min="0" step=".1" value={c.freeSpins.multiplier} onChange={e=>patch({freeSpins:{...c.freeSpins,multiplier:Number(e.target.value)}})}/></label><label className="check"><input type="checkbox" checked={c.freeSpins.retrigger} onChange={e=>patch({freeSpins:{...c.freeSpins,retrigger:e.target.checked}})}/> Retrigger</label></div></section>

    {m&&<section className="panel compact"><h2>Theoretical Math</h2><div className="metrics"><Metric t="Target RTP" v={(c.targetRtp*100).toFixed(3)+"%"}/><Metric t="Calculated RTP" v={(m.theoreticalRtp*100).toFixed(3)+"%"}/><Metric t="Base RTP" v={(m.baseRtp*100).toFixed(3)+"%"}/><Metric t="Feature RTP" v={(m.featureRtp*100).toFixed(3)+"%"}/></div></section>}
   </div>

   <aside className={`simRail ${simOpen?"open":""}`}><button className="railToggle" onClick={()=>setSimOpen(!simOpen)}>{simOpen?"›":"‹"} <span>Simulation</span></button>{simOpen&&<div className="simContent"><div className="simHead"><h2>Simulation</h2><span>Backend</span></div><label>Number of spins<input type="number" min="1000" max="10000000" step="1000" value={spins} onChange={e=>setSpins(Number(e.target.value)||1000)}/></label><button className="runButton" onClick={sim} disabled={busy}>{busy?"Running...":"Run Simulation"}</button>{s&&<><div className="simResult"><Metric t="Observed RTP" v={(s.rtp*100).toFixed(3)+"%"}/><Metric t="Target difference" v={((s.rtp-c.targetRtp)*100).toFixed(3)+"%"}/><Metric t="Hit Frequency" v={(s.hitFrequency*100).toFixed(2)+"%"}/><Metric t="Average Win" v={s.averageWin.toFixed(3)}/><Metric t="Max Win" v={s.maxWin.toFixed(2)}/><Metric t="Free Spin Triggers" v={String(s.freeSpinTriggers)}/></div><div className="simMeta">{s.spins.toLocaleString()} spins · wager {s.wager.toLocaleString()}</div></>}</div>}</aside>
  </main>
 </div>
}
function Metric({t,v}:{t:string;v:string}){return <div className="metric"><small>{t}</small><strong>{v}</strong></div>}