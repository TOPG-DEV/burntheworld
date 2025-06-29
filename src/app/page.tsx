"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import Link from "next/link";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectedMatrix, setRejectedMatrix] = useState(false);

  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [referredBy, setReferredBy] = useState("");


  const [telegramSubmitLoading, setTelegramSubmitLoading] = useState(false);
  const [telegramSubmitSuccess, setTelegramSubmitSuccess] = useState<string | null>(null);
  const [telegramSubmitError, setTelegramSubmitError] = useState<string | null>(null);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [confirmedInMongo, setConfirmedInMongo] = useState(false);

  const [inputErrors, setInputErrors] = useState<{ telegram?: string; username?: string }>({});

  const inputsValid = telegram.trim() !== "" && username.trim() !== "" && !!publicKey;

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

  const walletAddress = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  useEffect(() => {
    if (!walletAddress) return;
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

          try {
            const mongoRes = await fetch(`/api/unplugged-info?wallet=${connectedWallet}`);
            const mongoData = await mongoRes.json();
            const verified = mongoData?.verified === true;
            setConfirmedInMongo(verified);
            console.log("[🧠] confirmedInMongo:", verified);

            if (submitted && verified) {
              setShowFinalMessage(true);
            } else {
              setShowFinalMessage(false);
            }
          } catch (mongoErr) {
            console.error("Mongo check failed:", mongoErr);
            setConfirmedInMongo(false);
            setShowFinalMessage(false);
          }
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
          username, // renamed to match backend
          email,
          telegram,
          wallet: publicKey.toBase58(),
          referredBy: referredBy.trim() || null,
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

  const testSave = async () => {
    const errors: { telegram?: string; username?: string } = {};

    if (!telegram.trim()) {
      errors.telegram = "Telegram username is required.";
    }
    if (!username.trim()) {
      errors.username = "Username is required for the leaderboard.";
    }

    if (!publicKey) {
      setError("Connect your wallet first");
      return;
    }

    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }

    setInputErrors({});
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/save-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram,
          username,
          email,
          wallet: publicKey.toBase58(),
          referredBy: referredBy.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("[🔥] Mongo Entry Saved:", data);
        setHasSubmitted(true);
        const confirmRes = await fetch("/api/check-unplugged", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: publicKey.toBase58() }),
        });
        const confirmData = await confirmRes.json();

        if (confirmData.confirmed) {
          setConfirmedInMongo(true);
        }
      } else {
        setError(data.error || "Failed to save entry.");
      }
    } catch (e) {
      setError("Network or server error.");
    } finally {
      setSending(false);
    }
  };

  const handleUnplug = async () => {
    // Validate inputs first
    const errors: { telegram?: string; username?: string } = {};
    if (!telegram.trim()) errors.telegram = "Telegram username is required.";
    if (!username.trim()) errors.username = "Username is required for the leaderboard.";
    if (!publicKey) {
      setError("Connect your wallet first");
      return;
    }
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }

    setInputErrors({});
    setError(null);
    setSending(true);

    try {
      if (solPrice === null) {
        setError("SOL price not loaded yet. Please wait.");
        setSending(false);
        return;
      }

      const usdAmount = 100;
      const solAmount = usdAmount / solPrice;
      const lamportsToSend = Math.floor(solAmount * 1e9);

      const balance = await connection.getBalance(publicKey);
      const feeBuffer = 0.01 * 1e9; // buffer for fees

      if (balance < lamportsToSend + feeBuffer) {
        setError(
          `Insufficient funds: You have ${(balance / 1e9).toFixed(4)} SOL, but need ${(solAmount + 0.01).toFixed(4)} SOL.`
        );
        setSending(false);
        return;
      }

      // Build and send transaction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: solRecipient,
        lamports: lamportsToSend,
      });

      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from("ACCESS UNPLUGGED"),
      });

      const transaction = new Transaction().add(transferInstruction, memoInstruction);

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "processed");

      setConfirmed(true);

      // Save entry to backend
      const res = await fetch("/api/save-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram,
          username,
          email,
          wallet: publicKey.toBase58(),
          referredBy: referredBy.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save entry.");
        setSending(false);
        return;
      }

      setHasSubmitted(true);

      // Optional: confirm from backend if needed
      const confirmRes = await fetch("/api/check-unplugged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const confirmData = await confirmRes.json();

      if (confirmData.confirmed) {
        setConfirmedInMongo(true);
      }
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



  const handleSubmit = async () => {
    const errors: { telegram?: string; username?: string } = {};
    if (!telegram.trim()) errors.telegram = "Telegram username is required.";
    if (!username.trim()) errors.username = "Username is required for the leaderboard.";

    if (!publicKey) {
      setError("Connect your wallet first.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return;
    }

    setInputErrors({});
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/save-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          telegram: telegram.trim(),
          username: username.trim(),
          email: email.trim() || null,
          referredBy: referredBy.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Failed to save your info.");
      }
    } catch {
      setError("Unexpected error. Try again.");
    } finally {
      setLoading(false);
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
          username: username?.trim() ?? null,
          email: email?.trim() ?? null,
          referredBy: referredBy.trim() || null,
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



  // UI Logic for showing unplugged or form depends on hasSubmitted now
  return (
    <main className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-mono">
      <MatrixRain />
      <div className="maintenance">
        The Matrix is watching — only the worthy unplug. Choose the pill or be forgotten.
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
      ) : hasSubmitted && confirmedInMongo && showFinalMessage ? (
        <div className="infoCard">
          {showFinalMessage ? (
            <>
              <motion.h2
                className="titleSim text-red-500"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                You Unplugged. The System Collapsed.
              </motion.h2>
              <p className="text-gray-300 text-center mt-4 px-4">
                You didn’t follow hype — you followed truth. <br />
                The chart fell. The burn didn’t come. Yet. <br />
                <br />
                But this isn’t the end. It’s the beginning. <br />
                The signal is out. The airdrop approaches. <br />
                <strong className="text-red-400">
                  Only the ones who unplugged will be remembered.
                </strong>
                <br />
                <br />
                  The portal is open. Step in.
                <br />
                <em className="text-gray-400">The ones who act now, win forever.</em>
              </p>

              <div className="mt-6 flex flex-col items-center gap-4">
                <a
                  href="https://t.me/+wd0kc17OvDMwMWUx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="red-pill-button"
                  style={{ width: "150px", textAlign: "center" }}
                >
                  Join the FIRE
                </a>

                <Link href="/dashboard" passHref>
                  <div className="red-pill-button text-center cursor-pointer" style={{ width: "150px" }}>
                    Enter Dashboard
                  </div>
                </Link>
              </div>
            </>
          ) : null}
        </div>
      ) : hasSubmitted && !confirmedInMongo ? (
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
                The chart fell. No burn yet — You were warned.
                <br />
                The blind followed noise. You followed truth.
                <br />
                <br />
                You chose the pill. You stayed awake.
                <br />
                <br />
                Let the NPCs scroll and sell. Stay focused.
                <br />
                You saw through the illusion. Prepare.
                <br />
                <em className="text-gray-400">The real ones meet on the other side.</em>
              </p>

              <a
                href="https://t.me/+wd0kc17OvDMwMWUx"
                target="_blank"
                rel="noopener noreferrer"
                className="red-pill-button mt-6 inline-block"
                style={{ width: "150px", textDecoration: "none", textAlign: "center" }}
              >
                Join the FIRE
              </a>

              {/* ADD THE FORM HERE */}
              <div className="form-group mt-4 flex flex-col items-center max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Telegram Username"
                  className="input-field mb-1"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  required
                />
                {inputErrors.telegram && (
                  <p className="text-red-500 text-sm mb-2">{inputErrors.telegram}</p>
                )}
                <input
                  type="text"
                  placeholder="Username (for leaderboard)"
                  className="input-field mb-1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                {inputErrors.username && (
                  <p className="text-red-500 text-sm mb-2">{inputErrors.username}</p>
                )}
                <input
                  type="email"
                  placeholder="Email (optional)"
                  className="input-field mb-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Referral (Telegram Username)"
                  className="input-field mb-2"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                />

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  // className="red-pill-button"
                  className="dashBtn"
                  style={{ width: "150px" }}
                >
                  {loading ? "Submitting..." : "Sign Up"}
                </button>

                {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
              </div>
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
                Those who break free feel a calm beyond fear —<br />
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

              {/* <CountdownTimer onComplete={() => setShowFinalMessage(true)} /> */}

              <br />
              <p className="text-gray-300 text-center mt-2 px-4">
                30 more minutes for the ones who were directed wrong and have not seen this yet.
              </p>
              <br />
              <p>and the doors close</p>
              <br />

              {/* Telegram username submission form */}
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
              src="/unplugged.jpg"
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
              UNPLUG FROM THE MATRIX
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
          {/* <CountdownTimer /> */}
          <div className="form-group">
            <input
              type="text"
              placeholder="Telegram Username"
              className="input-field mb-1"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
            {inputErrors.telegram && (
              <p className="text-red-500 text-sm mb-2">{inputErrors.telegram}</p>
            )}

            <input
              type="text"
              placeholder="Username (for leaderboard)"
              className="input-field mb-1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {inputErrors.username && (
              <p className="text-red-500 text-sm mb-2">{inputErrors.username}</p>
            )}

            <input
              type="email"
              placeholder="Email (optional)"
              className="input-field mb-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="text"
              placeholder="Referral (Telegram Username)"
              className="input-field mb-2"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
            />
          </div>
          

          {!inputsValid && (
            <p className="text-red-400 mt-2 text-sm text-center">
              Fill in required fields and connect your wallet.
            </p>
          )}

          <div className="mt-8">
            <CustomWalletButton />
          </div>

          <p className="hint">Join the UNPLUGGED. $100</p>

          <div className="pillHolder">
            <button
              disabled={!publicKey || sending || !inputsValid}
              className="red-pill-button"
              // onClick={sendSol}
              // onClick={testSave}
              onClick={handleUnplug}
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

          <br /><br />

          <p className="text-[10px] text-gray-500 italic text-center mt-4">
            This is for community engagement and experimentation. This is not financial advice. Participation is voluntary. No expectations of profit are promised or implied.
            <br />
            Participation in this token does not constitute an investment contract, and all tokens are utility-based for community access and features. No monetary return is expected or guaranteed.By connecting your wallet and participating, you acknowledge that you understand and accept the terms outlined above.
          </p>
          

          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
        
        
      )}
    </main>
  );
}