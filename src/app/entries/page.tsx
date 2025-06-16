"use client";

import { useEffect, useState, useCallback } from "react";

interface Entry {
  name: string | null;
  email: string | null;
  wallet: string;
  telegram?: string;
  timestamp: string;
}

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // UseCallback to avoid recreating function on each render
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://bvdhhtbacf4qrghy.public.blob.vercel-storage.com/submissions.json?ts=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setEntries(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load entries:", err);
      setEntries([]);
      setError("Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries(); // initial load

    // Refresh every 60 seconds
    const interval = setInterval(loadEntries, 60000);
    return () => clearInterval(interval);
  }, [loadEntries]);

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl mb-4">Matrix Submissions</h1>
      <div className="mb-4 flex items-center space-x-4">
        <button
          onClick={loadEntries}
          disabled={loading}
          className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
        {lastUpdated && (
          <p className="text-gray-400 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {!loading && entries.length === 0 && (
        <p className="p-8 text-white">No entries found.</p>
      )}

      <ul className="space-y-4">
        {entries.map((entry, idx) => (
          <li key={idx} className="border p-4 rounded bg-gray-800">
            <p><strong>Name:</strong> {entry.name || "-"}</p>
            <p><strong>Email:</strong> {entry.email || "-"}</p>
            <p><strong>Wallet:</strong> {entry.wallet}</p>
            <p><strong>Telegram:</strong> {entry.telegram || "-"}</p>
            <p className="text-sm text-gray-400">
              ⏱️ {new Date(entry.timestamp).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
