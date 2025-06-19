import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "leader-submissions/" });

    const entries = await Promise.all(
      blobs.map(async (blob) => {
        const res = await fetch(blob.url);
        if (!res.ok) throw new Error(`Failed to fetch ${blob.url}`);
        return res.json();
      })
    );

    return NextResponse.json(entries);
  } catch (err) {
    console.error("Failed to load leader submissions:", err);
    return NextResponse.json({ error: "Failed to load leader submissions" }, { status: 500 });
  }
}
