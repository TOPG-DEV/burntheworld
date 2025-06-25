// src/app/api/check-unplugged/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("unplugged");
    const collection = db.collection("verified_users");

    const user = await collection.findOne({ wallet });

    if (!user) {
      return NextResponse.json({ verified: false });
    }

    const rank = "S"; // You can customize this logic later

    return NextResponse.json({ verified: true, rank });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DB check failed" }, { status: 500 });
  }
}
