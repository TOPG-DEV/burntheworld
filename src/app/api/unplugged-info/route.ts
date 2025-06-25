import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY!;
const UNPLUG_WALLET = process.env.NEXT_PUBLIC_RECIPIENT_WALLET!;

async function getTopgBalance(walletAddress: string): Promise<number> {
  const mintAddress = "9HSMssrVecFSs494Zw1QBZL5m3Wjtnic4o1nX6u7pump";
  const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  const res = await fetch(heliusRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        walletAddress,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" }
      ]
    }),
  });

  if (!res.ok) {
    console.error("Helius RPC error:", await res.text());
    return 0;
  }

  const data = await res.json();

  if (!data.result || !Array.isArray(data.result.value)) {
    console.error("Unexpected response:", data);
    return 0;
  }

  const tokenAccount = data.result.value.find(
    (acc: any) => acc.account.data.parsed.info.mint === mintAddress
  );

  if (!tokenAccount) return 0;

  const amountStr = tokenAccount.account.data.parsed.info.tokenAmount.amount;
  const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;

  return Number(amountStr) / Math.pow(10, decimals);
}

// Your rank determination function based on score
function determineTitle(score: number): string {
  if (score >= 9000) return "TOPG";
  if (score >= 7100) return "UNPLUGGED G";
  if (score >= 4100) return "Matrix Hacker G";
  if (score >= 2100) return "Red Pill G";
  return "G";
}

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1) * 100;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ verified: false, reason: "No wallet provided." }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("unpluggedDB");
  const collection = db.collection("entries");

  const user = await collection.findOne({ wallet });

  if (!user) {
    return NextResponse.json({
      verified: false,
      reason: "You haven’t submitted your info yet. Fill the form and unplug first.",
    });
  }

  const heliusEndpoint = `https://api.helius.xyz/v0/addresses/${UNPLUG_WALLET}/transactions?api-key=${HELIUS_API_KEY}&limit=100`;

  try {
    const res = await fetch(heliusEndpoint);
    if (!res.ok) {
      return NextResponse.json(
        {
          verified: false,
          reason: "Error reaching the blockchain. Try again shortly.",
        },
        { status: 500 }
      );
    }

    const txData = await res.json();
    const nativeTransfers = txData.flatMap((tx: any) => tx.nativeTransfers || []);

    const hasPaid = nativeTransfers.some(
      (transfer: any) =>
        transfer.toUserAccount === UNPLUG_WALLET &&
        transfer.fromUserAccount === wallet
    );

    if (!hasPaid) {
      return NextResponse.json({
        verified: false,
        reason: "Your wallet is known, but no $100 payment found to the UNPLUG wallet.",
      });
    }

    // Fetch extra data
    const fetchedTopgBalance = await getTopgBalance(wallet);
    const calculatedRounds = nativeTransfers.filter(
      (tx: { toUserAccount: string; fromUserAccount: string }) =>
        tx.toUserAccount === UNPLUG_WALLET && tx.fromUserAccount === wallet
    ).length;

    const totalSolPaid = calculatedRounds * 0.5; // example: 0.5 SOL per round

    const calculatedReferralCount = await collection.countDocuments({ referral: user.telegram || "unknown" });

    const telegramEngagement = user.telegramEngagement || 0;

    // Calculate power score based on normalized weights
    const topgScore = normalize(fetchedTopgBalance, 1_000_000) * 0.4;
    const presaleScore = normalize(totalSolPaid, 2.0) * 0.3;
    const referralScore = normalize(calculatedReferralCount, 10) * 0.2;
    const engagementScore = normalize(telegramEngagement, 50) * 0.1;

    const powerScore = topgScore + presaleScore + referralScore + engagementScore;

    // Determine rank title string based on power score
    const rankTitle = determineTitle(powerScore);

    // Update MongoDB document with computed rank and stats
    await collection.updateOne(
      { wallet },
      {
        $set: {
          rank: rankTitle,
          topgBalance: fetchedTopgBalance,
          unpluggedRounds: calculatedRounds,
          referralCount: calculatedReferralCount,
          telegramEngagement,
          updatedAt: new Date(),
          verified: true,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      verified: true,
      rank: rankTitle,
      wallet,
      telegram: user.telegram,
      topg: fetchedTopgBalance,
      rounds: calculatedRounds,
      referrals: calculatedReferralCount,
      totalPaid: totalSolPaid,
      engagement: telegramEngagement,
      date: user.createdAt || new Date(),
      message: "You’re verified — Welcome UNPLUGGED.",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        verified: false,
        reason: "Verification failed. Try again later.",
      },
      { status: 500 }
    );
  }
}
