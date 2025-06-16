import React, { useState, useEffect, JSX } from "react";

export default function CountdownToFixedEastern(): JSX.Element {
  // June 16, 2025 2:00 AM Eastern Time = June 16, 2025 06:00 AM UTC (EDT is UTC-4)
  const targetTimestamp = Date.UTC(2025, 5, 16, 15, 0, 0);

  const [timeLeft, setTimeLeft] = useState<number>(targetTimestamp - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = targetTimestamp - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  if (timeLeft <= 0) {
    return (
      <p className="text-red-400 mt-4 text-center text-xl font-mono">
        BURN COMING SOON
      </p>
    );
  }

  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <p className="global-timer">
      {hours.toString().padStart(2, "0")}:
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </p>
  );
}
