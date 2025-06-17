// app/api/get-submissions/route.ts
import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    // 1. List all blobs in submissions/
    const { blobs } = await list({ prefix: "submissions/" });

    // 2. Fetch each blob and parse JSON
    const submissions = await Promise.all(
      blobs.map(async (blob) => {
        const res = await fetch(blob.url);
        if (!res.ok) throw new Error(`Failed to fetch ${blob.url}`);
        return res.json();
      })
    );

    return NextResponse.json(submissions);
  } catch (err) {
    console.error("Failed to load submissions:", err);
    return NextResponse.json({ submissions: [] }, { status: 500 });
  }
}
