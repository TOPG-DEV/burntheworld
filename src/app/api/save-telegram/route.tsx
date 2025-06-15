import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const BLOB_NAME = "submissions.json"; 
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

    let existing: Entry[] = [];
    try {
      const res = await fetch(`https://blob.vercel-storage.com/${BLOB_NAME}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        existing = (await res.json()) as Entry[];
      } else if (res.status === 404) {
        console.warn("Blob not found, starting fresh.");
      } else {
        console.warn(`Failed to fetch blob, status: ${res.status}`);
      }
    } catch (err) {
      console.warn("Error fetching blob:", err);
    }

    const normalizedWallet = wallet?.trim() || null;
    const normalizedTelegram = telegram.trim();

    // Find index of existing entry by wallet or telegram
    const entryIndex = existing.findIndex(
      (entry) =>
        (normalizedWallet && entry.wallet === normalizedWallet) ||
        (entry.telegram === normalizedTelegram)
    );

    if (entryIndex > -1) {
      const existingEntry = existing[entryIndex];

      // Merge new fields but keep existing wallet if new one is missing or empty
      existing[entryIndex] = {
        telegram: normalizedTelegram || existingEntry.telegram,
        wallet: normalizedWallet || existingEntry.wallet || null,
        name: name?.trim() || existingEntry.name || null,
        email: email?.trim() || existingEntry.email || null,
        timestamp: new Date().toISOString(),
      };
    } else {
      // No existing entry, push new
      existing.push({
        telegram: normalizedTelegram,
        wallet: normalizedWallet,
        name: name?.trim() || null,
        email: email?.trim() || null,
        timestamp: new Date().toISOString(),
      });
    }

    const blob = await put(BLOB_NAME, JSON.stringify(existing, null, 2), {
      access: "public",
      token,
      allowOverwrite: true,
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
