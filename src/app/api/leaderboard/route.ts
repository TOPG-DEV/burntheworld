import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

// Scaling function: clamp value between 0 and 1
function normalize(value: number, max: number): number {
  return Math.min(value / max, 1);
}

// Optional: Non-linear scaling for topgBalance (sqrt example)
function nonlinearNormalize(value: number, max: number): number {
  return Math.min(Math.sqrt(value) / Math.sqrt(max), 1);
}

// Map score (0–10000) to a title
function determineTitle(score: number): string {
  if (score >= 9000) return "TOPG";
  if (score >= 7100) return "UNPLUGGED G";
  if (score >= 4100) return "Matrix Hacker";
  if (score >= 2100) return "Red Pilled";
  return "G";
}

export async function GET() {
  const client = await clientPromise;
  const db = client.db("unpluggedDB");
  const collection = db.collection("entries");

  const users = await collection.find({ verified: true }).toArray();
  console.log("Verified users from DB:", users);

  const scored = users
    .map((user) => {
      const topg = user.topgBalance || 0;
      const presale = user.totalPresaleAmount || 0;
      const referrals = user.referralCount || 0;
      const engagement = user.telegramEngagement || 0;

      // Adjusted max values to be more realistic
      const topgNorm = nonlinearNormalize(topg, 200_000); // sqrt scale with 200k max
      const presaleNorm = normalize(presale, 2.0); // max = 2 SOL
      const referralNorm = normalize(referrals, 15); // max = 15 referrals
      const engagementNorm = normalize(engagement, 100); // max = 100 messages

      // Adjusted weights - more weight on referrals & engagement
      const rawScore =
        topgNorm * 0.35 +
        presaleNorm * 0.25 +
        referralNorm * 0.25 +
        engagementNorm * 0.15;

      const powerScore = Math.round(rawScore * 10000);

      return {
        username: user.username || user.telegram || user.wallet,
        wallet: user.wallet,
        topgBalance: topg,
        buyIn: presale,
        referrals,
        engagement,
        powerScore, // for frontend
        title: determineTitle(powerScore),
      };
    })
    .filter((user) => user.powerScore > 0); // optional: filter out zero scorers

  const sorted = scored.sort((a, b) => b.powerScore - a.powerScore);

  const ranked = sorted.map((user, index) => ({
    ...user,
    numericRank: index + 1,
  }));

  return NextResponse.json(ranked);
}
