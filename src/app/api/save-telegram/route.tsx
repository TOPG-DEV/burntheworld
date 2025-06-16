import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

interface Entry {
  telegram: string;
  wallet: string | null;
  name: string | null;
  email: string | null;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    const { telegram, wallet, name, email } = await req.json();

    if (!telegram || typeof telegram !== "string" || !telegram.trim()) {
      return NextResponse.json(
        { success: false, error: "Telegram username is required." },
        { status: 400 }
      );
    }

    const normalizedWallet = wallet?.trim() || null;
    const normalizedTelegram = telegram.trim();

    const newEntry: Entry = {
      telegram: normalizedTelegram,
      wallet: normalizedWallet,
      name: name?.trim() || null,
      email: email?.trim() || null,
      timestamp: new Date().toISOString(),
    };

    // Generate a unique blob file name using timestamp + wallet/telegram
    const safeId = normalizedWallet || normalizedTelegram.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    const blobName = `submissions/${safeId}-${timestamp}.json`;

    const blob = await put(blobName, JSON.stringify(newEntry, null, 2), {
      access: "public",
      token,
      allowOverwrite: false, // ensure it's a new file
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (err) {
    console.error("Save-telegram route error:", err);
    return NextResponse.json(
      { success: false, error: "Save failed" },
      { status: 500 }
    );
  }
}
