import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "dairy-flat-air";

let clientPromise: Promise<MongoClient> | null = null;

export async function getDb(): Promise<Db | null> {
  if (!uri) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }

  const client = await clientPromise;
  return client.db(dbName);
}

export function requireDbMessage() {
  return "MongoDB is not configured. Add MONGODB_URI and MONGODB_DB in Vercel or .env.local.";
}
