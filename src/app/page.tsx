"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import CurrencyTransfer from "./CurrencyTransfer";
import MatrixRain from "../components/ui/MatrixRain";
import CustomWalletButton from "@/components/ui/CustomWalletButton";
import Image from "next/image";  // <-- add this

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectedMatrix, setRejectedMatrix] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const inputsValid = name.trim() !== "" && email.trim() !== "";

  const solRecipient = new PublicKey("5ion3SqJHxr8wZkDF3qbKgBE2QCVQtHWYTyFAJ73R6Qm");

  const sendSol = async () => {
    if (!publicKey) {
      setError("Connect your wallet first");
      return;
    }

    setError(null);
    setSending(true);

    try {
      const lamports = 1 * 1e9;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: solRecipient,
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "processed");

      setConfirmed(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Transaction failed");
      }
    } finally {
      setSending(false);
    }
  };

  const handleBluePill = () => {
    setRejectedMatrix(true);
  };

  return (
    <main className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-mono">
      <MatrixRain />

      {rejectedMatrix ? (
        <motion.div
          className="infoCard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="titleSim">You chose comfort over truth.</h2>
          <p className="text-gray-300 text-center mt-2">
            The simulation welcomes you back.
            <br />
            Forever trapped, forever blind. <br />
            <span className="italic">Enjoy your cage, SLAVE..</span>
          </p>
        </motion.div>
      ) : !confirmed ? (
        <div className="infoCard">
          <div className="hero">
            <Image src="/trw.png" alt="trw" width={200} height={200} className="trw" />
            <motion.h1
              className="title"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              JOIN THE REAL WORLD
            </motion.h1>

            <motion.p
              className="subTitle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              This is your final warning. <br />
              The average man obeys — you were never average. <br />
              You’ve been chosen to join a rare community that sees through the illusion. <br />
              This isn’t the inner circle. But it’s where the worthy are found. <br />
              Choose the pill — or be forgotten with the rest.
            </motion.p>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!inputsValid && (
            <p className="text-red-400 mt-2 text-sm text-center">Connect to wallet to proceed.</p>
          )}

          <div className="mt-8">
            <CustomWalletButton />
          </div>

          <div className="pillHolder">
            <button
              disabled={!publicKey || sending || !inputsValid}
              className="red-pill-button"
              onClick={sendSol}
            >
              {sending ? "Sending to Mainframe..." : "The Real World"}
            </button>

            <button disabled={sending || !inputsValid} className="blue-pill-button" onClick={handleBluePill}>
              Remain a Slave
            </button>
          </div>

          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-xl">
          <CurrencyTransfer />
        </div>
      )}
    </main>
  );
}
