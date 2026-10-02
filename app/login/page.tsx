"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const router = useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});
    const data=await r.json();setBusy(false);
    if(!r.ok){setError(data.error??"Login failed");return} router.replace("/");
  }
  return <main className="authPage"><form className="authCard" onSubmit={submit}><h1>Slot Simulator</h1><p>Admin login</p><label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="error">{error}</div>}<button disabled={busy}>{busy?"Signing in...":"Sign in"}</button></form></main>}