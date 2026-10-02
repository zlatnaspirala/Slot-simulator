import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

    const database = await db();
    const users = database.collection("users");
    let user = await users.findOne<{_id:any;email:string;passwordHash:string;role:string}>({ email: String(email).toLowerCase().trim() });

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!user && adminEmail && adminPassword && email.toLowerCase().trim() === adminEmail && password === adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const result = await users.insertOne({ email: adminEmail, passwordHash, role: "admin", createdAt: new Date() });
      user = { _id: result.insertedId, email: adminEmail, passwordHash, role: "admin" };
    }

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession(String(user._id));
    return NextResponse.json({ ok: true, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
}