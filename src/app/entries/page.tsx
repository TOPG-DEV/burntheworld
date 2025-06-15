"use client";

import { useEffect, useState } from "react";

interface Entry {
  name: string;
  email: string;
  wallet: string;
  telegram?: string;
  timestamp: string;
}

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("https://bvdhhtbacf4qrghy.public.blob.vercel-storage.com/submissions.json");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setEntries(data);
        setError(null);
      } catch (error: unknown) {
        console.error("Failed to load entries:", error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p className="p-8 text-white">Loading entries...</p>;
  if (error) return <p className="p-8 text-red-500">{error}</p>;
  if (entries.length === 0) return <p className="p-8 text-white">No entries found.</p>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl mb-4"> Matrix Submissions</h1>
      <ul className="space-y-4">
        {entries.map((entry, idx) => (
          <li key={idx} className="border p-4 rounded bg-gray-800">
            <p><strong>Name:</strong> {entry.name}</p>
            <p><strong>Email:</strong> {entry.email}</p>
            <p><strong>Wallet:</strong> {entry.wallet}</p>
            <p><strong>Telegram:</strong> {entry.telegram || "-"}</p>
            <p className="text-sm text-gray-400">⏱️ {new Date(entry.timestamp).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
