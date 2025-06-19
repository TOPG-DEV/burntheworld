"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import CustomWalletButton from "@/components/ui/CustomWalletButton";
import { motion } from "framer-motion";
import MatrixRain from "@/components/ui/MatrixRain";

export default function LeaderApplicationPage() {
  const { publicKey } = useWallet();

  const [telegram, setTelegram] = useState("");
  const [answers, setAnswers] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (index: number, value: string) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    if (!telegram.trim()) {
      setError("Enter your Telegram username.");
      return;
    }
    if (!publicKey) {
      setError("Connect your wallet first.");
      return;
    }
    if (answers.some((a) => !a.trim())) {
      setError("Answer all questions.");
      return;
    }

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/save-leader-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram: telegram.trim(),
          wallet: publicKey.toBase58(),
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Submission failed.");
      }

      setSuccess("Submission received. Our team will review all applications and announce selected leaders soon. The selected admin will be contacted directly through DM before announcment.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-mono text-white">
      <MatrixRain />

      <div className="infoCard text-center relative z-10">
        <motion.h1
          className="titleSim mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Apply for UNPLUGGED Leadership
        </motion.h1>

        <p className="text-gray-300 mb-4">
          You are outside the Matrix. The mission is clear:
          <br />
          Lead. Protect. Keep the signal strong.
        </p>

        <input
          type="text"
          placeholder="@yourtelegram"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          className="input-field mb-4 w-full max-w-sm"
        />

        <div className="text-left text-sm mb-4">
          <label className="block mb-2 text-green-300">
            1. What makes you worthy to lead those who’ve unplugged?
          </label>
          <textarea
            className="input-field w-full mb-4"
            rows={3}
            value={answers[0]}
            onChange={(e) => handleChange(0, e.target.value)}
          />

          <label className="block mb-2 text-green-300">
            2. How would you keep the chat alive, sharp, and focused?
          </label>
          <textarea
            className="input-field w-full mb-4"
            rows={3}
            value={answers[1]}
            onChange={(e) => handleChange(1, e.target.value)}
          />

          <label className="block mb-2 text-green-300">
            3. If granted admin status, how would you protect the signal from noise?
          </label>
          <textarea
            className="input-field w-full mb-4"
            rows={3}
            value={answers[2]}
            onChange={(e) => handleChange(2, e.target.value)}
          />
        </div>

        <p className="text-yellow-400 mb-4 text-sm">
          You must connect the wallet that holds at least <strong>1,000,000 $TOPG</strong> to be eligible for admin status.
        </p>

        <CustomWalletButton />

        <button
          onClick={handleSubmit}
          disabled={loading || !publicKey}
          className="red-pill-button mt-4 w-40 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
        {success && <p className="text-green-400 mt-4">{success}</p>}
      </div>
    </main>
  );
}
