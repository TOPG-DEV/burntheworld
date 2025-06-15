"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import CurrencyTransfer from "./CurrencyTransfer";
import MatrixRain from "../components/ui/MatrixRain";
import CustomWalletButton from "@/components/ui/CustomWalletButton";
import CountdownTimer from "../components/ui/CountdownTimer";
import Image from "next/image";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectedMatrix, setRejectedMatrix] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");

  const inputsValid = name.trim() !== "" && email.trim() !== "";

  const solRecipient = new PublicKey(process.env.NEXT_PUBLIC_RECIPIENT_WALLET!);

  // State for current SOL price (USD)
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch current SOL price in USD on mount and every 60 seconds
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await res.json();
        if (data.solana && data.solana.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch (e) {
        console.error("Failed to fetch SOL price:", e);
        setError("Unable to fetch SOL price. Try again later.");
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const sendSol = async () => {
    if (!publicKey) {
      setError("Connect your wallet first");
      return;
    }

    if (solPrice === null) {
      setError("SOL price not loaded yet. Please wait.");
      return;
    }

    setError(null);
    setSending(true);

    try {
      // Calculate how much SOL is $100
      const usdAmount = 100;
      const solAmount = usdAmount / solPrice;
      const lamportsToSend = Math.floor(solAmount * 1e9);

      const balance = await connection.getBalance(publicKey);

      // Add a buffer for fees (0.01 SOL)
      const feeBuffer = 0.01 * 1e9;

      if (balance < lamportsToSend + feeBuffer) {
        setError(
          `Insufficient funds: Your wallet has ${(balance / 1e9).toFixed(
            4
          )} SOL, but you need at least ${(solAmount + 0.01).toFixed(
            4
          )} SOL to cover the transfer and fees.`
        );
        setSending(false);
        return;
      }

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: solRecipient,
        lamports: lamportsToSend,
      });

      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey(
          "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        ),
        data: Buffer.from("BTW Access"),
      });

      const transaction = new Transaction().add(
        transferInstruction,
        memoInstruction
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "processed");

      setConfirmed(true);

      await fetch("/api/save-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          telegram,
          wallet: publicKey.toBase58(),
        }),
      });

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
            <Image
              src="/trw.png"
              alt="trw"
              width={200}
              height={200}
              className="trw"
            />
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
              The average man obeys — you were never average. <br />
              You’ve been chosen to join a rare community that sees through
              the illusion. <br /><br />
              This isn’t the inner circle. But it’s where the worthy are found.{" "}
              <br />
              Choose the pill — or be forgotten with the rest.
              <br />
              <br />
          
              The blockchain remembers the worthy. <br />
              <br />
              SOME PEOPLE WANT TO SEE THE WORLD BURN.<br />
              most will be left behind.
            </motion.p>
          </div>
          <CountdownTimer />
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
            <input
              type="text"
              placeholder="Telegram Username"
              className="input-field"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
          </div>

          {!inputsValid && (
            <p className="text-red-400 mt-2 text-sm text-center">
              Fill in name/email and connect your wallet.
            </p>
          )}

          <div className="mt-8">
            <CustomWalletButton />
          </div>

          <p className="hint">Join our burn. $100</p>

          <div className="pillHolder">
            <button
              disabled={!publicKey || sending || !inputsValid}
              className="red-pill-button"
              onClick={sendSol}
            >
              {sending ? "Processing..." : "UNPLUG"}
            </button>

            <button
              disabled={sending || !inputsValid}
              className="blue-pill-button"
              onClick={handleBluePill}
            >
              OBEY
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
