// app/api/get-submissions/route.ts
import { NextResponse } from "next/server";

const BLOB_NAME = "submissions.json";

export async function GET() {
  try {
    const res = await fetch(`https://blob.vercel-storage.com/${BLOB_NAME}`);
    if (!res.ok) {
      return NextResponse.json({ submissions: [] });
    }
    const submissions = await res.json();
    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ submissions: [] });
  }
}
