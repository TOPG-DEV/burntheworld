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
  const [telegramSubmitLoading, setTelegramSubmitLoading] = useState(false);
  const [telegramSubmitSuccess, setTelegramSubmitSuccess] = useState<string | null>(null);
  const [telegramSubmitError, setTelegramSubmitError] = useState<string | null>(null);

  const inputsValid = name.trim() !== "" && email.trim() !== "";

  const solRecipient = new PublicKey(process.env.NEXT_PUBLIC_RECIPIENT_WALLET!);

  // State for current SOL price (USD)
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // New state: if current wallet has already sent SOL to recipient (via Helius)
  const [hasSubmitted, setHasSubmitted] = useState(false);

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

  // New: Check on Helius if current wallet sent SOL to recipient
  useEffect(() => {
    if (!publicKey) {
      setHasSubmitted(false);
      return;
    }

    // If current wallet is the recipient, mark as submitted immediately
    if (publicKey.equals(solRecipient)) {
      setHasSubmitted(true);
      return;
    }

    const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!heliusApiKey) {
      console.error("HELIUS_API_KEY missing from env");
      return;
    }

    let isCancelled = false; // to avoid state update if component unmounts

    const checkSentSol = async () => {
      try {
        const endpoint = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
        const body = {
          jsonrpc: "2.0",
          id: 1,
          method: "getTransactionsByAddress",
          params: [publicKey.toBase58(), { limit: 50, commitment: "confirmed" }],
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Helius RPC request failed with status ${res.status}: ${text}`
          );
        }

        const data = await res.json();

        if (!data.result) {
          throw new Error("Helius response missing result");
        }

        const txs = data.result as any[];

        const sentToRecipient = txs.some((tx) => {
          try {
            const message = tx.transaction.message;
            const accountKeys = message.accountKeys;
            const instructions = message.instructions;

            return instructions.some((instr: any) => {
              // Check if the instruction is a SystemProgram transfer
              if (
                accountKeys[instr.programIdIndex] === SystemProgram.programId.toBase58()
              ) {
                // Check if the transfer instruction accounts include fromPubkey and toPubkey as expected
                // For SystemProgram transfer, usually:
                // accounts[0] = fromPubkey
                // accounts[1] = toPubkey
                if (
                  instr.accounts.length >= 2 &&
                  accountKeys[instr.accounts[1]] === solRecipient.toBase58() &&
                  accountKeys[instr.accounts[0]] === publicKey.toBase58()
                ) {
                  return true;
                }
              }
              return false;
            });
          } catch {
            return false;
          }
        });

        if (!isCancelled) {
          setHasSubmitted(sentToRecipient);
        }
      } catch (e) {
        if (!isCancelled) {
          console.error("Error checking sent SOL via Helius:", e);
          setHasSubmitted(false);
        }
      }
    };

    checkSentSol();

    return () => {
      isCancelled = true;
    };
  }, [publicKey, solRecipient]);

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

      // Update hasSubmitted to true immediately after send
      setHasSubmitted(true);
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

  // New function to submit telegram + wallet on hasSubmitted view
  const handleTelegramSubmit = async () => {
    if (!telegram.trim()) {
      setTelegramSubmitError("Please enter your Telegram username.");
      return;
    }

    // Get wallet address
    const wallet = publicKey?.toBase58() ?? null;

    if (!wallet) {
      setTelegramSubmitError("Please connect your wallet first.");
      return;
    }

    setTelegramSubmitLoading(true);
    setTelegramSubmitError(null);
    setTelegramSubmitSuccess(null);

    try {
      const res = await fetch("/api/save-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram: telegram.trim(),
          wallet,
          name: name?.trim() ?? null,  // if you collect name
          email: email?.trim() ?? null // if you collect email
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit Telegram username.");
      }

      setTelegramSubmitSuccess("Telegram username submitted successfully.");
    } catch (e) {
      if (e instanceof Error) {
        setTelegramSubmitError(e.message);
      } else {
        setTelegramSubmitError("Unknown error occurred.");
      }
    } finally {
      setTelegramSubmitLoading(false);
    }
  };




  // UI Logic for showing unplugged or form depends on hasSubmitted now
  return (
    <main className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-mono">
      <MatrixRain />
      <div className="maintenance">
        🚧 We're currently undergoing maintenance. You may experience some bugs or issues. Thanks for your patience and sorry for the inconvenience.🚧
      </div>


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
      ) : confirmed ? (
        <div className="relative z-10 w-full max-w-xl">
          <CurrencyTransfer />
        </div>
      ) : hasSubmitted ? (
        <div className="infoCard">
          <motion.h2
            className="titleSim"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            The world burns you wake up <br /> UNPLUGGED
          </motion.h2>
          <p
            className="text-gray-300 text-center mt-2"
            style={{ paddingLeft: "10px", paddingRight: "10px" }}
          >
            Most will stay stuck: <br />
            Doomscrolling media, chasing distractions, <br />
            Wandering through illusions crafted to keep you blind. <br />
            <br />
            But not you. <br />
            You took the red pill. The blockchain remembers. <br />
            <br />
            Those who break free feel a calm beyond fear — <br />
            a quiet strength carried by something deeper than time. <br />
            The best versions of ourselves are already here, moving unseen. <br />
            <br />
            Don’t listen to the jokers who sell false hope; <br />
            protect your own, and hold them close. <br />
            A message will come. <br />
            And the doors will close.
          </p>

          <CountdownTimer />

          <div className="form-group mt-4 flex flex-col items-center">
            <input
              type="text"
              placeholder="Telegram Username"
              className="input-field mb-2"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              style={{ maxWidth: "300px" }}
            />
            <button
              onClick={handleTelegramSubmit}
              disabled={telegramSubmitLoading || !telegram.trim() || !publicKey}
              className="red-pill-button"
              style={{ width: "150px" }}
            >
              {telegramSubmitLoading ? "Submitting..." : "Submit Telegram"}
            </button>

            {telegramSubmitError && (
              <p className="text-red-500 mt-2 text-sm">{telegramSubmitError}</p>
            )}
            {telegramSubmitSuccess && (
              <p className="text-green-400 mt-2 text-sm">{telegramSubmitSuccess}</p>
            )}
          </div>

          <p className="text-gray-400 text-sm mt-4 text-center italic">
            Make sure you’re ready.
          </p>
        </div>
      ) : (
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
              the illusion. <br />
              <br />
              This isn’t the inner circle. But it’s where the worthy are
              found. <br />
              Choose the pill — or be forgotten with the rest.
              <br />
              <br />
              The blockchain remembers the worthy. <br />
              <br />
              SOME PEOPLE WANT TO SEE THE WORLD BURN.
              <br />
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
      )}
    </main>
  );
}
