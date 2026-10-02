import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const database = await db();
  const user = await database.collection("users").findOne({ _id: session.userId as any }, { projection: { email: 1, role: 1 } });
  return NextResponse.json({ authenticated: true, user });
}