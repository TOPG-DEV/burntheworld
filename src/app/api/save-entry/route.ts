import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { wallet, telegram, username, email, referredBy } = body;

    if (!wallet || !telegram) {
      return NextResponse.json(
        { error: "Wallet and Telegram username are required." },
        { status: 400 }
      );
    }

    // Normalize usernames
    telegram = telegram.trim().toLowerCase();
    referredBy = referredBy?.trim().toLowerCase() || "none";

    const client = await clientPromise;
    const db = client.db("unpluggedDB");
    const collection = db.collection("entries");

    const now = new Date();

    // Check if this is a new user
    const existingUser = await collection.findOne({ wallet });

    const updateResult = await collection.updateOne(
      { wallet },
      {
        $set: {
          wallet,
          telegram,
          username: username?.trim() || null,
          email: email?.trim() || null,
          referredBy: referredBy !== "none" ? referredBy : null,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          referralCount: 0, // default for new users
        },
      },
      { upsert: true }
    );

    // Handle referral logic if:
    // - it's a new user (not previously in DB)
    // - the referredBy field is present
    // - they aren't referring themselves
    if (!existingUser && referredBy !== "none" && referredBy !== telegram) {
      const refUpdate = await collection.updateOne(
        { telegram: referredBy },
        { $inc: { referralCount: 1 } }
      );

      if (refUpdate.modifiedCount === 0) {
        console.warn(`⚠️ Referral failed: No user found with telegram @${referredBy}`);
      }
    }

    return NextResponse.json({ success: true, message: "Info saved successfully." });
  } catch (error) {
    console.error("❌ Error saving entry:", error);
    return NextResponse.json(
      { error: "Failed to save entry." },
      { status: 500 }
    );
  }
}
