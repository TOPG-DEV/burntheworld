// /app/api/presale-entry/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);
const dbName = "unpluggedDB";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, amount, tx, tier } = body;

    if (!wallet || !amount || !tx) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await client.connect();
    const db = client.db(dbName);
    const presales = db.collection("presale");

    await presales.insertOne({
      wallet,
      amount,
      tx,
      tier: tier || "default",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
