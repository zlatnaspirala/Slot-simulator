import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultSlot } from "@/lib/slot/default";
import { SlotConfig } from "@/lib/slot/types";

export const runtime = "nodejs";

function ownerId(userId: unknown) {
  const value = String(userId);
  return ObjectId.isValid(value) ? new ObjectId(value) : value;
}
function cleanConfig(input: unknown): SlotConfig {
  const c=input as SlotConfig;
  if(!c || typeof c!=="object" || !Array.isArray(c.reels) || !Array.isArray(c.symbols) || !Array.isArray(c.paylines)) throw new Error("Invalid slot configuration");
  return c;
}

export async function GET() {
  try {
    const session=await getSession();
    if(!session) return NextResponse.json({error:"Unauthorized"},{status:401});
    const database=await db();
    const owner=ownerId(session.userId);
    const machines=await database.collection("slot_machines").find({userId:owner}).sort({updatedAt:-1}).toArray();
    if(!machines.length){
      const now=new Date();
      const result=await database.collection("slot_machines").insertOne({userId:owner,name:defaultSlot.name||"My Slot Machine",config:defaultSlot,createdAt:now,updatedAt:now});
      return NextResponse.json({machines:[{id:String(result.insertedId),name:defaultSlot.name||"My Slot Machine",updatedAt:now}],activeId:String(result.insertedId),config:defaultSlot});
    }
    const active=machines[0];
    return NextResponse.json({
      machines:machines.map(x=>({id:String(x._id),name:x.name,updatedAt:x.updatedAt})),
      activeId:String(active._id),
      config:active.config,
    });
  } catch(error) {
    console.error("Loading machines failed:",error);
    return NextResponse.json({error:"Unable to load slot machines"},{status:500});
  }
}

export async function POST(req:NextRequest) {
  try {
    const session=await getSession();
    if(!session) return NextResponse.json({error:"Unauthorized"},{status:401});
    const body=await req.json();
    const config=body.config?cleanConfig(body.config):structuredClone(defaultSlot);
    const name=String(body.name||config.name||"New Slot Machine").trim()||"New Slot Machine";
    config.name=name;
    const now=new Date();
    const database=await db();
    const result=await database.collection("slot_machines").insertOne({userId:ownerId(session.userId),name,config,createdAt:now,updatedAt:now});
    return NextResponse.json({ok:true,machine:{id:String(result.insertedId),name,updatedAt:now},config});
  } catch(error) {
    console.error("Creating machine failed:",error);
    return NextResponse.json({error:"Unable to create slot machine"},{status:400});
  }
}

export async function PUT(req:NextRequest) {
  try {
    const session=await getSession();
    if(!session) return NextResponse.json({error:"Unauthorized"},{status:401});
    const body=await req.json();
    if(!ObjectId.isValid(String(body.id))) return NextResponse.json({error:"Invalid machine id"},{status:400});
    const config=cleanConfig(body.config);
    const name=String(body.name||config.name||"Slot Machine").trim()||"Slot Machine";
    config.name=name;
    const now=new Date();
    const database=await db();
    const result=await database.collection("slot_machines").updateOne(
      {_id:new ObjectId(String(body.id)),userId:ownerId(session.userId)},
      {$set:{name,config,updatedAt:now}}
    );
    if(!result.matchedCount) return NextResponse.json({error:"Machine not found"},{status:404});
    return NextResponse.json({ok:true,updatedAt:now.toISOString()});
  } catch(error) {
    console.error("Saving machine failed:",error);
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to save machine"},{status:400});
  }
}

export async function DELETE(req:NextRequest) {
  try {
    const session=await getSession();
    if(!session) return NextResponse.json({error:"Unauthorized"},{status:401});
    const id=new URL(req.url).searchParams.get("id");
    if(!id || !ObjectId.isValid(id)) return NextResponse.json({error:"Invalid machine id"},{status:400});
    const database=await db();
    const result=await database.collection("slot_machines").deleteOne({_id:new ObjectId(id),userId:ownerId(session.userId)});
    if(!result.deletedCount) return NextResponse.json({error:"Machine not found"},{status:404});
    return NextResponse.json({ok:true});
  } catch(error) {
    console.error("Deleting machine failed:",error);
    return NextResponse.json({error:"Unable to delete machine"},{status:400});
  }
}