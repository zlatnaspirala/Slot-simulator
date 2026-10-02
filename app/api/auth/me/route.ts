import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";
export const runtime = "nodejs";
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const database = await db();
  const user = await database.collection("users").findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { email: 1, role: 1 } }
  );
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user });
}