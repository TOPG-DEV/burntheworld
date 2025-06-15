import { useState, useEffect } from "react";

const COUNTDOWN_HOURS = 12;

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_HOURS * 3600 * 1000);

  // Helper to get next 3PM PST timestamp
  function getNext3PMPST() {
    const now = new Date();
    const laTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );
    let next3PM = new Date(laTime);
    next3PM.setHours(15, 0, 0, 0);
    if (laTime >= next3PM) {
      next3PM.setDate(next3PM.getDate() + 1);
    }
    return next3PM.getTime();
  }

  useEffect(() => {
    const startTime = getNext3PMPST();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = COUNTDOWN_HOURS * 3600 * 1000 - elapsed;

      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeLeft === 0) {
    return (
      <p className="text-red-400 mt-4 text-center text-xl font-mono">
        Time's up.
      </p>
    );
  }

  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <p className="text-yellow-400 font-mono text-center text-xl mt-4 select-none">
      {hours.toString().padStart(2, "0")}:
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </p>
  );
}
