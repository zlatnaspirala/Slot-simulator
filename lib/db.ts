import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const globalForMongo = globalThis as unknown as { mongo?: Promise<MongoClient> };
export const mongoClient = globalForMongo.mongo ?? new MongoClient(uri).connect();
if (process.env.NODE_ENV !== "production") globalForMongo.mongo = mongoClient;

export async function db() {
  const client = await mongoClient;
  return client.db(process.env.MONGODB_DB ?? "slot_simulator");
}