"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [showFinalMessage, setShowFinalMessage] = useState(false);

  const inputsValid = name.trim() !== "" && email.trim() !== "";

  const solRecipient = useMemo(
    () => new PublicKey(process.env.NEXT_PUBLIC_RECIPIENT_WALLET!),
    []
  );

  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await res.json();
        if (data.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch (e) {
        console.error("Failed to fetch SOL price:", e);
        setError("Unable to fetch SOL price. Try again later.");
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!publicKey) return; // Wait until wallet is connected

    const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!heliusApiKey) {
      console.error("HELIUS_API_KEY missing from env");
      return;
    }

    const recipientAddress = solRecipient.toBase58();
    const endpoint = `https://api.helius.xyz/v0/addresses/${recipientAddress}/transactions?api-key=${heliusApiKey}&limit=100`;

    let isCancelled = false;

    const fetchSenders = async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Helius API error: ${res.status} - ${text}`);
        }

        const data = await res.json();
        const solSenders = new Set<string>();

        for (const tx of data) {
          const nativeTransfers = tx.nativeTransfers || [];
          for (const transfer of nativeTransfers) {
            if (transfer.toUserAccount === recipientAddress) {
              solSenders.add(transfer.fromUserAccount);
            }
          }
        }

        console.log("[📦] Unique SOL Senders:", Array.from(solSenders));
        const connectedWallet = publicKey.toBase58();
        console.log("[🧠] Connected Wallet:", connectedWallet);

        if (!isCancelled) {
          const submitted = solSenders.has(connectedWallet);
          console.log("[✅] hasSubmitted status:", submitted);
          setHasSubmitted(submitted);
        }
      } catch (e) {
        console.error("Failed to fetch transactions from Helius:", e);
        if (!isCancelled) setHasSubmitted(false);
      }
    };

    fetchSenders();

    return () => {
      isCancelled = true;
    };
  }, [publicKey?.toBase58(), solRecipient]); // 👈 ensure this reruns when wallet connects


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
      const usdAmount = 100;
      const solAmount = usdAmount / solPrice;
      const lamportsToSend = Math.floor(solAmount * 1e9);

      const balance = await connection.getBalance(publicKey);
      const feeBuffer = 0.01 * 1e9;

      if (balance < lamportsToSend + feeBuffer) {
        setError(
          `Insufficient funds: You have ${(balance / 1e9).toFixed(4)} SOL, but need ${(solAmount + 0.01).toFixed(4)} SOL.`
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
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
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

  const handleTelegramSubmit = async () => {
    if (!telegram.trim()) {
      setTelegramSubmitError("Please enter your Telegram username.");
      return;
    }

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
          name: name?.trim() ?? null,
          email: email?.trim() ?? null,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Unexpected server response.");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit Telegram username.");
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

  {showFinalMessage && hasSubmitted && (
    <>
      <MatrixRain />
      <main className="bg-black text-white p-8 flex justify-center items-center min-h-screen font-mono text-center">
        <div className="infoCard max-w-xl">
          <h1 className="text-red-500 text-2xl mb-4">The Matrix Collapsed.</h1>
          <p>
            The chart crashed. No burn yet. I warned you.
            <br />
            Losers followed the blind. My students? Safe. <br /><br />
            You chose to wake up — now you will be rewarded. <br />
            <strong>Airdrop is coming. The burn will follow.</strong> <br />
            <br />
            Let the NPCs sell and stay stuck in the Matrix forever. <br />
            You chose to see. Stay ready. Watch X.
            <br />
            <em>See you on the other side.</em>
            <br/>
            <br/>
            <em className="text-gray-300 text-center mt-4 px-4">Re-submit submit your telegram to verify this message</em><br /><br />
            <em className="text-gray-300 text-center mt-4 px-4">your wallets will recive the airdrop my students will lead.</em><br/>
            <em className="text-gray-300 text-center mt-4 px-4">watch cloesly.</em>
            <br/>
          </p>
          <br/>
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

          {/* New Join Telegram Button */}
          <a
            href="https://t.me/+wd0kc17OvDMwMWUx"
            target="_blank"
            rel="noopener noreferrer"
            className="red-pill-button mt-6 inline-block"
            style={{ width: "150px", textDecoration: "none", textAlign: "center" }}
          >
            Join the Fire 🔥
          </a>
        </div>
      </main>
    </>
  )}



  // UI Logic for showing unplugged or form depends on hasSubmitted now
  return (
    <main className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-mono">
      <MatrixRain />
      <div className="maintenance">
        My students are saved, you have been chosen to take the pill
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
            {showFinalMessage ? (
              <>
                <motion.h2
                  className="titleSim text-red-500"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  The Matrix Collapsed.
                </motion.h2>
                <p className="text-gray-300 text-center mt-4 px-4">
                  The chart crashed. No burn yet. I warned you.
                  <br />
                  Losers followed the blind. My students? Safe.
                  <br />
                  <br />
                  You chose to wake up — now you will be rewarded.
                  <br />
                  <strong className="text-green-400">Airdrop is coming. The burn will follow.</strong>
                  <br />
                  <br />
                  Let the NPCs sell and stay stuck in the Matrix forever.
                  <br />
                  You chose to see. Stay ready. Watch X.
                  <br />
                  <em className="text-gray-400">See you on the other side.</em>
                </p>

                {/* Join Telegram button */}
                <a
                  href="https://t.me/+wd0kc17OvDMwMWUx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="red-pill-button mt-6 inline-block"
                  style={{ width: "150px", textDecoration: "none", textAlign: "center" }}
                >
                  Join the FIRE
                </a>
              </>
          ) : (
            <>
              <motion.h2
                className="titleSim"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                The world burns you wake up <br /> UNPLUGGED
              </motion.h2>
              <p className="text-gray-300 text-center mt-2 px-4">
                Most will stay stuck: <br />
                Doomscrolling media, chasing distractions, <br />
                Wandering through illusions crafted to keep you blind.
                <br />
                <br />
                But not you.
                <br />
                You took the red pill. The blockchain remembers.
                <br />
                <br />
                Those who break free feel a calm beyond fear —
                <br />
                a quiet strength carried by something deeper than time.
                <br />
                The best versions of ourselves are already here, moving unseen.
                <br />
                <br />
                Dont listen to the jokers who sell false hope;
                <br />
                protect your own, and hold them close.
                <br />
                A message will come.
                <br />
                And the doors will close.
                <br />

              </p>

              <CountdownTimer onComplete={() => setShowFinalMessage(true)} /><br />
                <p className="text-gray-300 text-center mt-2 px-4">30 more minutes for the ones who were directed wrong and have not seen this yet.</p><br />
                <p>and the doors close</p><br />

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
            </>
          )}
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
              This isn’t the inner circle. But it is where the worthy are
              found. <br />
              Choose the pill — or be forgotten with the rest.
              <br />
              <br />
              The blockchain remembers the worthy. <br />
              <br />
              SOME PEOPLE WANT TO SEE THE WORLD BURN.
              <br />
               <br />
                <br />

              most will be left behind.
              <br />

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