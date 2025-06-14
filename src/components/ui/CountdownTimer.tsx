"use client";

import { useEffect, useState } from "react";

// Global countdown starts at 2025-06-14 13:30 UTC (6:30 AM PDT)
const GLOBAL_START_TIME = new Date("2025-06-14T13:30:00Z").getTime();
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function getRemainingTime() {
  const now = Date.now();
  const endTime = GLOBAL_START_TIME + SIX_HOURS_MS;
  const timeLeft = endTime - now;
  return timeLeft > 0 ? timeLeft : 0;
}

function formatTime(ms: number) {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((ms % (1000 * 60)) / 1000);
  return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s
    .toString()
    .padStart(2, "0")}s`;
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getRemainingTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="global-timer">
      {timeLeft > 0 ? (
        formatTime(timeLeft)
      ) : (
        <span className="expired">CURRENTLY SLEEPING</span>
      )}
    </div>
  );
}
