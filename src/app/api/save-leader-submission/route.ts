import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const { telegram, wallet, answers } = await req.json();

    if (!telegram || typeof telegram !== "string" || !telegram.trim()) {
      return NextResponse.json({ error: "Telegram required" }, { status: 400 });
    }

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json({ error: "Wallet required" }, { status: 400 });
    }

    if (!Array.isArray(answers) || answers.length < 3) {
      return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
    }

    const entry = {
      telegram: telegram.trim(),
      wallet: wallet.trim(),
      answers,
      timestamp: new Date().toISOString(),
    };

    const safeId = wallet || telegram.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `leader-submissions/${safeId}-${Date.now()}.json`;

    const blob = await put(filename, JSON.stringify(entry, null, 2), {
      access: "public",
      token,
      allowOverwrite: false,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (err) {
    console.error("leader-submission error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
