"use client";

import { useEffect, useState, useCallback } from "react";

interface LeaderEntry {
  telegram: string;
  wallet: string;
  answers: string[];
  timestamp: string;
}

export default function LeaderEntriesPage() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/get-leader-submissions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      setEntries(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading leader entries:", err);
      setError("Could not load entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    const interval = setInterval(loadEntries, 60000);
    return () => clearInterval(interval);
  }, [loadEntries]);

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl mb-4">🔥 Leader Interview Submissions</h1>

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

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {!loading && entries.length === 0 && <p>No leader submissions yet.</p>}

      <ul className="space-y-4">
        {entries.map((entry, idx) => (
          <li key={idx} className="border p-4 rounded bg-gray-800">
            <p><strong>Telegram:</strong> {entry.telegram}</p>
            <p><strong>Wallet:</strong> {entry.wallet}</p>
            <p className="text-sm text-gray-400">
              ⏱️ {new Date(entry.timestamp).toLocaleString()}
            </p>
            <div className="mt-2 space-y-1 text-sm">
              {entry.answers.map((answer, i) => (
                <p key={i}><strong>Q{i + 1}:</strong> {answer}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
