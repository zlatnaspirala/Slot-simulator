import { NextRequest, NextResponse } from "next/server";
import { calculateMath } from "@/lib/slot/math";
import { getSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(calculateMath(await req.json())); }
  catch { return NextResponse.json({ error: "Invalid configuration" }, { status: 400 }); }
}