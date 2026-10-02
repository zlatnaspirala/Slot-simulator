"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultSlot } from "@/lib/slot/default";
import { Reel, SlotConfig } from "@/lib/slot/types";

const clone = <T,>(v:T):T => structuredClone(v);

export default function Home() {
  const router = useRouter();
  const [c,setC] = useState<SlotConfig>(()=>clone(defaultSlot));
  const [m,setM] = useState<any>(null);
  const [s,setS] = useState<any>(null);
  const [spins,setSpins] = useState(100000);
  const [busy,setBusy] = useState(false);
  const [user,setUser] = useState<any>(null);
  const [authChecking,setAuthChecking] = useState(true);

  useEffect(()=>{fetch("/api/auth/me").then(async r=>{if(!r.ok){router.replace("/login");return}setUser((await r.json()).user);setAuthChecking(false)}).catch(()=>router.replace("/login"))},[router]);

  const payCounts = useMemo(()=>{
    const set=new Set<string>();
    Object.values(c.paytable).forEach(p=>Object.keys(p).forEach(n=>set.add(n)));
    return [...set].sort((a,b)=>Number(a)-Number(b));
  },[c.paytable]);

  if(authChecking) return <main><p className="muted">Checking session...</p></main>;

  function patch(p:Partial<SlotConfig>){setC(v=>({...v,...p}));setM(null);setS(null)}
  function updateReel(index:number,reel:Reel){patch({reels:c.reels.map((r,i)=>i===index?reel:r)})}
  function addReel(){const id="R"+(c.reels.length+1);patch({reels:[...c.reels,{id,strip:c.symbols.length? [c.symbols[0].id] : ["A"]}]})}
  function deleteReel(index:number){if(c.reels.length<=1)return;patch({reels:c.reels.filter((_,i)=>i!==index)})}
  function addField(reelIndex:number){const reel=c.reels[reelIndex];const value=c.symbols[0]?.id??"A";updateReel(reelIndex,{...reel,strip:[...reel.strip,value]})}
  function deleteField(reelIndex:number,fieldIndex:number){const reel=c.reels[reelIndex];if(reel.strip.length<=1)return;updateReel(reelIndex,{...reel,strip:reel.strip.filter((_,i)=>i!==fieldIndex)})}
  function setField(reelIndex:number,fieldIndex:number,value:string){const reel=c.reels[reelIndex];const strip=[...reel.strip];strip[fieldIndex]=value;updateReel(reelIndex,{...reel,strip})}
  function addSymbol(){const id="SYM"+(c.symbols.length+1);patch({symbols:[...c.symbols,{id,name:id,type:"normal"}],reels:c.reels.map(r=>({...r,strip:[...r.strip,id]})),paytable:{...c.paytable,[id]:{}}})}
  function updatePayout(symbol:string,count:string,value:number){patch({paytable:{...c.paytable,[symbol]:{...c.paytable[symbol],[count]:value}}})}
  function addPayoutCount(){const next=Math.max(2,...payCounts.map(Number))+1;patch({paytable:Object.fromEntries(Object.entries(c.paytable).map(([s,p])=>[s,{...p,[String(next)]:0}]))})}
  function removePayoutCount(count:string){patch({paytable:Object.fromEntries(Object.entries(c.paytable).map(([s,p])=>{const q={...p};delete q[count];return [s,q]}))})}
  async function calc(){setBusy(true);try{const r=await fetch("/api/math",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(c)});if(r.status===401){router.replace("/login");return}setM(await r.json())}finally{setBusy(false)}}
  async function sim(){setBusy(true);try{const r=await fetch("/api/simulate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({config:c,spins})});if(r.status===401){router.replace("/login");return}setS(await r.json())}finally{setBusy(false)}}
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login")}

  return <main>
    <header><div><b>Slot Simulator</b><span>Admin · {user?.email}</span></div><button onClick={logout}>Logout</button></header>

    <section className="panel">
      <h1>Machine Configuration</h1>
      <div className="fields">
        <label>Machine name<input value={c.name} onChange={e=>patch({name:e.target.value})}/></label>
        <label>Target RTP %<input type="number" step="0.01" value={c.targetRtp*100} onChange={e=>patch({targetRtp:Number(e.target.value)/100})}/></label>
        <label>Bet per spin<input type="number" step="0.01" value={c.betPerSpin} onChange={e=>patch({betPerSpin:Number(e.target.value)})}/></label>
      </div>
    </section>

    <section className="panel">
      <div className="sectionTitle"><h2>Reel Strips</h2><button onClick={addReel}>+ Add Reel</button></div>
      <div className="reels dynamicReels">{c.reels.map((reel,ri)=><div className="reel" key={reel.id}>
        <div className="reelHeader"><strong>{reel.id}</strong><button className="danger small" onClick={()=>deleteReel(ri)} disabled={c.reels.length<=1}>Delete</button></div>
        {reel.strip.map((field,fi)=><div className="reelField" key={fi}><input value={field} onChange={e=>setField(ri,fi,e.target.value)}/><button className="danger small" onClick={()=>deleteField(ri,fi)} disabled={reel.strip.length<=1}>×</button></div>)}
        <button className="small addField" onClick={()=>addField(ri)}>+ Add Field</button>
      </div>)}</div>
    </section>

    <section className="panel">
      <div className="sectionTitle"><h2>Symbols</h2><button onClick={addSymbol}>+ Add Symbol</button></div>
      <div className="symbolEditor">{c.symbols.map((sym,i)=><div className="symbolRow" key={sym.id}>
        <input value={sym.id} onChange={e=>{const symbols=[...c.symbols];symbols[i]={...sym,id:e.target.value};patch({symbols})}}/>
        <input value={sym.name} onChange={e=>{const symbols=[...c.symbols];symbols[i]={...sym,name:e.target.value};patch({symbols})}}/>
        <select value={sym.type} onChange={e=>{const symbols=[...c.symbols];symbols[i]={...sym,type:e.target.value as any};patch({symbols})}}><option value="normal">Normal</option><option value="wild">Wild</option><option value="scatter">Scatter</option></select>
      </div>)}</div>
    </section>

    <section className="panel">
      <div className="sectionTitle"><h2>Paytable</h2><button onClick={addPayoutCount}>+ Add Payout Count</button></div>
      <div className="tableWrap"><table><thead><tr><th>Symbol</th>{payCounts.map(n=><th key={n}>{n} <button className="tiny danger" onClick={()=>removePayoutCount(n)}>×</button></th>)}</tr></thead>
      <tbody>{c.symbols.map(sym=><tr key={sym.id}><td>{sym.name}</td>{payCounts.map(n=><td key={n}><input className="payInput" type="number" min="0" step="0.01" value={c.paytable[sym.id]?.[n]??0} onChange={e=>updatePayout(sym.id,n,Number(e.target.value))}/></td>)}</tr>)}</tbody></table></div>
    </section>

    <section className="panel">
      <h2>Free Spins</h2>
      <div className="fields featureFields">
        <label className="check"><input type="checkbox" checked={c.freeSpins.enabled} onChange={e=>patch({freeSpins:{...c.freeSpins,enabled:e.target.checked}})}/> Enabled</label>
        <label>Trigger symbol<select value={c.freeSpins.triggerSymbol} onChange={e=>patch({freeSpins:{...c.freeSpins,triggerSymbol:e.target.value}})}>{c.symbols.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Trigger count<input type="number" min="1" value={c.freeSpins.triggerCount} onChange={e=>patch({freeSpins:{...c.freeSpins,triggerCount:Number(e.target.value)}})}/></label>
        <label>Spins awarded<input type="number" min="0" value={c.freeSpins.spinsAwarded} onChange={e=>patch({freeSpins:{...c.freeSpins,spinsAwarded:Number(e.target.value)}})}/></label>
        <label>Multiplier<input type="number" min="0" step="0.1" value={c.freeSpins.multiplier} onChange={e=>patch({freeSpins:{...c.freeSpins,multiplier:Number(e.target.value)}})}/></label>
        <label className="check"><input type="checkbox" checked={c.freeSpins.retrigger} onChange={e=>patch({freeSpins:{...c.freeSpins,retrigger:e.target.checked}})}/> Retrigger</label>
      </div>
    </section>

    <section className="panel">
      <div className="sectionTitle"><h2>Simulation</h2><div className="simControls"><input type="number" min="1000" max="10000000" step="1000" value={spins} onChange={e=>setSpins(Number(e.target.value)||1000)}/><button onClick={sim} disabled={busy}>Run Simulation</button></div></div>
      <p className="muted">Backend simulation. Enter any supported spin count; the result is compared with the configured target RTP.</p>
    </section>

    <section className="layout results">
      <div className="panel"><h2>Theoretical Math</h2>{m?<div className="metrics"><Metric t="Target RTP" v={(c.targetRtp*100).toFixed(3)+"%"}/><Metric t="Calculated RTP" v={(m.theoreticalRtp*100).toFixed(3)+"%"}/><Metric t="Base RTP" v={(m.baseRtp*100).toFixed(3)+"%"}/><Metric t="Feature RTP" v={(m.featureRtp*100).toFixed(3)+"%"}/><Metric t="Scatter trigger" v={(m.scatterTriggerProbability*100).toFixed(3)+"%"}/></div>:<button onClick={calc} disabled={busy}>Calculate Theoretical RTP</button>}</div>
      {s&&<div className="panel"><h2>Simulation Result · {s.spins.toLocaleString()}</h2><div className="metrics"><Metric t="Observed RTP" v={(s.rtp*100).toFixed(3)+"%"}/><Metric t="Difference vs target" v={((s.rtp-c.targetRtp)*100).toFixed(3)+"%"}/><Metric t="Hit Frequency" v={(s.hitFrequency*100).toFixed(2)+"%"}/><Metric t="Average Win" v={s.averageWin.toFixed(3)}/><Metric t="Max Win" v={s.maxWin.toFixed(2)}/><Metric t="Free Spin Triggers" v={String(s.freeSpinTriggers)}/></div></div>}
    </section>
  </main>
}
function Metric({t,v}:{t:string;v:string}){return <div className="metric"><small>{t}</small><strong>{v}</strong></div>}