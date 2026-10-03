import http from "node:http";
import fs from "node:fs";
import pathModule from "node:path";
import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { defaultSlot } from "../lib/slot/default";
import type { SlotConfig } from "../lib/slot/types";
import { calculateMath } from "../lib/slot/math";

const PORT=Number(process.env.SLOT_SERVER_PORT||4000);
const uri=process.env.MONGODB_URI;if(!uri)throw new Error("MONGODB_URI is required");
const mongo=new MongoClient(uri);
const listeners=new Map<string,Set<http.ServerResponse>>();
let db: ReturnType<MongoClient["db"]>;

async function session(req:http.IncomingMessage){const token=(req.headers.cookie||"").match(/(?:^|;\s*)slot_session=([^;]+)/)?.[1];if(!token)return null;const session=await db.collection("sessions").findOne<{token:string;userId:string;expiresAt:Date}>({token,expiresAt:{$gt:new Date()}});if(!session)return null;return {...session,userId:session.userId}}
async function json(req:http.IncomingMessage){let s="";for await(const x of req)s+=x;return s?JSON.parse(s):{}}
function send(res:http.ServerResponse,status:number,data:unknown){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(data))}
function filter(id:string,userId:ObjectId|string){return ObjectId.isValid(id)?{_id:new ObjectId(id),userId}:{_id:id,userId}}
function emit(id:string,data:unknown){const set=listeners.get(id);if(!set)return;const packet=`event: spin\ndata: ${JSON.stringify(data)}\n\n`;for(const res of set)try{res.write(packet)}catch{set.delete(res)}}
function spin(c:SlotConfig){const grid=c.reels.map(r=>{const i=Math.floor(Math.random()*r.strip.length);return[0,1,2].map(n=>r.strip[(i+n)%r.strip.length])});let win=0,scatter=0;for(const reel of grid)for(const symbol of reel)if(symbol===c.freeSpins.triggerSymbol)scatter++;for(const line of c.paylines){const seq=line.rows.map((row,i)=>grid[i][row]);const wild=c.symbols.find(s=>s.type==="wild")?.id;let target=seq[0];if(wild&&target===wild)target=seq.find(s=>s!==wild)??wild;let count=0;for(const symbol of seq){if(symbol===target||symbol===wild)count++;else break}if(count>=3)win+=c.paytable[target]?.[String(count)]??0}return{grid,win,scatter}}
async function start(){ await mongo.connect(); db=mongo.db(process.env.MONGODB_DB||"slot_simulator"); const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const allowedOrigins=new Set(["http://localhost","http://localhost:3000","http://localhost:3001"]);
  if(origin&&allowedOrigins.has(origin)){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Credentials","true");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");}
  if(req.method==="OPTIONS"){res.writeHead(204);return res.end();}
  try{
    const u=new URL(req.url||"/","http://localhost");const routePath=u.pathname;
    const publicMachineRoute=routePath.match(/^\/slot-api\/machines\/([^/]+)\/(slot-config|events|spin)$/);
    if(publicMachineRoute){
      const id=decodeURIComponent(publicMachineRoute[1]);const action=publicMachineRoute[2];
      const machine=await db.collection("slot_machines").findOne({_id:ObjectId.isValid(id)?new ObjectId(id):id});
      if(!machine)return send(res,404,{error:"Machine not found"});
      if(action==="slot-config"&&req.method==="GET"){const config=machine.config||{};return send(res,200,{machineId:id,name:machine.name,reels:config.reels||[],symbols:config.symbols||[],paytable:config.paytable||{},paylines:config.paylines||[],freeSpins:config.freeSpins||{},targetRtp:config.targetRtp??0.95})}
      if(action==="events"&&req.method==="GET"){res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-cache","connection":"keep-alive","access-control-allow-origin":origin||"*"});res.write(": connected\\n\\n");if(!listeners.has(id))listeners.set(id,new Set());listeners.get(id)!.add(res);req.on("close",()=>listeners.get(id)?.delete(res));return}
      if(action==="spin"&&req.method==="POST"){const result={id:randomUUID(),machineId:id,timestamp:Date.now(),...spin(machine.config as SlotConfig)};emit(id,result);return send(res,200,result)}
    }
    if(routePath==="/"||routePath==="/vanilla/"||routePath==="/vanilla/index.html"||routePath.startsWith("/vanilla/dist/")){
      const file=routePath==="/"||routePath==="/vanilla/"||routePath==="/vanilla/index.html"?"vanilla/index.html":routePath.slice(1);
      const full=pathModule.resolve(process.cwd(),file);if(!fs.existsSync(full))return send(res,404,{error:"Static file not found"});
      const ext=path.extname(full);const types:any={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};res.writeHead(200,{"content-type":types[ext]||"application/octet-stream","cache-control":"no-cache"});return res.end(fs.readFileSync(full));
    }
    const path=u.pathname;const s=await session(req);if(!s)return send(res,401,{error:"Unauthorized"});const ownerId=ObjectId.isValid(String(s.userId))?new ObjectId(String(s.userId)):String(s.userId);
if(req.method==="GET"&&path==="/slot-api/machines"){const ms=await db.collection("slot_machines").find({userId:ownerId}).sort({updatedAt:-1}).toArray();return send(res,200,{machines:ms.map(x=>({id:String(x._id),name:x.name,active:listeners.has(String(x._id))})),activeId:ms[0]?String(ms[0]._id):"",config:ms[0]?.config})}
if(req.method==="POST"&&path==="/slot-api/math"){const c=await json(req) as SlotConfig;return send(res,200,calculateMath(c))}
if(req.method==="GET"&&path.startsWith("/slot-api/machines/")&&path.endsWith("/slot-config")){const id=path.split("/")[3];const machine=await db.collection("slot_machines").findOne({_id:new ObjectId(id)});if(!machine)return send(res,404,{error:"Machine not found"});const config=machine.config||{};return send(res,200,{machineId:id,name:machine.name,reels:config.reels||[],symbols:config.symbols||[],paytable:config.paytable||{},freeSpins:config.freeSpins||{},targetRtp:config.targetRtp??0.95})}
if(req.method==="POST"&&path==="/slot-api/machines"){const b=await json(req);const config=structuredClone((b.config as SlotConfig)||defaultSlot);const name=String(b.name||config.name||"New Slot Machine").trim()||"New Slot Machine";config.name=name;const now=new Date();const result=await db.collection("slot_machines").insertOne({userId:ownerId,name,config,createdAt:now,updatedAt:now});return send(res,200,{ok:true,machine:{id:String(result.insertedId),name},config})}

let match=path.match(/^\/slot-api\/machines\/([^/]+)(?:\/(activate|events|spin|simulate))?$/);
if(match){const id=decodeURIComponent(match[1]);const action=match[2];const m=await db.collection("slot_machines").findOne(filter(id,ownerId));if(!m)return send(res,404,{error:"Machine not found"});
 if(req.method==="GET"&&!action)return send(res,200,{id:String(m._id),name:m.name,config:m.config,active:listeners.has(id)});
 if(req.method==="PUT"&&!action){const b=await json(req);if(!ObjectId.isValid(id))return send(res,400,{error:"Invalid machine id"});const config=b.config as SlotConfig;config.name=String(b.name||config.name||m.name);const now=new Date();await db.collection("slot_machines").updateOne(filter(id,s.userId),{$set:{name:config.name,config,updatedAt:now}});return send(res,200,{ok:true,updatedAt:now.toISOString()})}
 if(req.method==="DELETE"&&!action){if(!ObjectId.isValid(id))return send(res,400,{error:"Invalid machine id"});await db.collection("slot_machines").deleteOne(filter(id,s.userId));listeners.delete(id);return send(res,200,{ok:true})}
 if(req.method==="POST"&&action==="activate"){if(!listeners.has(id))listeners.set(id,new Set());return send(res,200,{ok:true,machineId:id,events:`/slot-api/machines/${id}/events`})}
 if(req.method==="GET"&&action==="events"){res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-cache","connection":"keep-alive","access-control-allow-origin":origin||"http://localhost"});res.write(": connected\n\n");if(!listeners.has(id))listeners.set(id,new Set());listeners.get(id)!.add(res);req.on("close",()=>listeners.get(id)?.delete(res));return}
 if(req.method==="POST"&&action==="spin"){const result={id:randomUUID(),machineId:id,timestamp:Date.now(),...spin(m.config as SlotConfig)};emit(id,result);return send(res,200,result)}
 if(req.method==="POST"&&action==="simulate"){const b=await json(req),c=m.config as SlotConfig,n=Math.min(10000000,Math.max(1000,Number(b.spins)||100000));let total=0,wins=0,max=0,triggers=0;for(let i=0;i<n;i++){const x=spin(c);total+=x.win;if(x.win>0){wins++;max=Math.max(max,x.win)}if(c.freeSpins.enabled&&x.scatter>=c.freeSpins.triggerCount)triggers++}const wager=n*c.betPerSpin;return send(res,200,{spins:n,wager,totalWin:total,rtp:wager?total/wager:0,winSpins:wins,hitFrequency:wins/n,averageWin:wins?total/wins:0,maxWin:max,freeSpinTriggers:triggers})}
}
return send(res,404,{error:"Not found"})}catch(e){console.error("slot-server:",e);send(res,500,{error:e instanceof Error?e.message:"Server error"})}});
const port = Number(process.env.PORT) || 4000;
server.listen(port, "0.0.0.0", () => console.log(`Slot server listening on http://0.0.0.0:${port}`)); }
start().catch(error=>{console.error("Failed to start slot server:",error);process.exit(1)});