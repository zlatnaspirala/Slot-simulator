import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { defaultSlot } from "@/lib/slot/default";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalized=String(email||"").toLowerCase().trim();
    if(!normalized||!password)return NextResponse.json({error:"Email and password are required"},{status:400});
    if(String(password).length<8)return NextResponse.json({error:"Password must be at least 8 characters"},{status:400});
    const database=await db(),users=database.collection("users");
    if(await users.findOne({email:normalized}))return NextResponse.json({error:"User already exists"},{status:409});
    const passwordHash=await bcrypt.hash(String(password),12);
    const result=await users.insertOne({email:normalized,passwordHash,role:"user",createdAt:new Date()});
    const now=new Date(),config=structuredClone(defaultSlot);config.name="My Slot Machine";
    await database.collection("slot_machines").insertOne({userId:result.insertedId,name:config.name,config,createdAt:now,updatedAt:now});
    await createSession(String(result.insertedId));
    return NextResponse.json({ok:true,email:normalized,role:"user"});
  }catch(error){console.error(error);return NextResponse.json({error:"Registration service unavailable"},{status:500});}
}