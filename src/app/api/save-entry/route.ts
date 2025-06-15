// app/api/save-entry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const BLOB_NAME = "submissions.json";
const token = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: NextRequest) {
  const { name, email, telegram, wallet } = await req.json();

  try {
    // Read existing blob entries
    let existing = [];
    try {
      const res = await fetch(`https://blob.vercel-storage.com/${BLOB_NAME}`);
      if (res.ok) {
        existing = await res.json();
      }
    } catch (err) {
      console.warn("No existing blob found, starting fresh.");
    }

    const newEntry = {
      name,
      email,
      wallet,
      telegram,
      timestamp: new Date().toISOString(),
    };

    const updated = [...existing, newEntry];

    // Save back to blob storage
    const blob = await put(BLOB_NAME, JSON.stringify(updated, null, 2), {
      access: "public",
      token,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (err) {
    console.error("Failed to save:", err);
    return NextResponse.json({ success: false, error: "Save failed" }, { status: 500 });
  }
}
