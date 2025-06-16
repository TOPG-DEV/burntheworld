import React, { useState, useEffect, JSX } from "react";

interface CountdownProps {
  onComplete?: () => void;
}

export default function CountdownToFixedEastern({ onComplete }: CountdownProps): JSX.Element {
  const targetTimestamp = Date.UTC(2025, 5, 16, 14, 0, 0); // 11AM AST (2PM ET)

  const [timeLeft, setTimeLeft] = useState<number>(targetTimestamp - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = targetTimestamp - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        if (onComplete) onComplete();
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp, onComplete]);

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
    <p className="global-timer text-green-400 font-mono mt-4 text-xl">
      {hours.toString().padStart(2, "0")}:
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </p>
  );
}
