import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "slot_session";
const TTL = 1000 * 60 * 60 * 12;

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const database = await db();
  await database.collection("sessions").insertOne({
    token, userId, createdAt: new Date(), expiresAt: new Date(Date.now() + TTL),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: TTL / 1000,
  });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const database = await db();
  const session = await database.collection("sessions").findOne({ token, expiresAt: { $gt: new Date() } });
  return session ?? null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function clearSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) {
    const database = await db();
    await database.collection("sessions").deleteOne({ token });
  }
  (await cookies()).delete(COOKIE);
}