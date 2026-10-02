import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SlotConfig } from "@/lib/slot/types";

export const runtime = "nodejs";

function cleanConfig(input: unknown): SlotConfig {
  const c = input as SlotConfig;
  if (!c || typeof c !== "object" || !Array.isArray(c.reels) || !Array.isArray(c.symbols)) {
    throw new Error("Invalid slot configuration");
  }
  return c;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const database = await db();
  const document = await database.collection("slot_configs").findOne({
    userId: new ObjectId(String(session.userId)),
  });

  return NextResponse.json({ config: document?.config ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const config = cleanConfig(await req.json());
    const database = await db();
    const userId = new ObjectId(String(session.userId));

    await database.collection("slot_configs").updateOne(
      { userId },
      {
        $set: {
          userId,
          config,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Saving slot configuration failed:", error);
    return NextResponse.json({ error: "Invalid slot configuration" }, { status: 400 });
  }
}