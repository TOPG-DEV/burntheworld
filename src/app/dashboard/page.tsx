"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import MatrixRain from "@/components/ui/MatrixRain";
import Link from "next/link";
import Image from "next/image";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export default function DashboardPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const { publicKey, sendTransaction } = useWallet();
  const connection = new Connection(SOLANA_RPC);
  const [tokenAmount, setTokenAmount] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [solAmount, setSolAmount] = useState<number>(0);

  const RECEIVING_WALLET = useMemo(() => new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!), []);
  const fetchSolPrice = async () => {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await res.json();
      const price = data.solana.usd;
      setSolPrice(price);
      const usdAmount = parseFloat(process.env.NEXT_PUBLIC_PRESALE_USD_AMOUNT || "200");
      setSolAmount(usdAmount / price);
    } catch (e) {
      console.error("Failed to fetch SOL price:", e);
      setSolPrice(140);
      setSolAmount(200 / 140); // fallback
    }
  };

  useEffect(() => {
    fetchSolPrice();
  }, []);


  const handleBuy = async () => {
    if (!publicKey) {
      setError("Connect your wallet first.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      // const tokenPriceUSD = 0.00001;
      // const usdAmount = 200;
      const usdAmount = parseFloat(process.env.NEXT_PUBLIC_PRESALE_USD_AMOUNT || "200");
      const tokenPriceUSD = parseFloat(process.env.NEXT_PUBLIC_TOKEN_USD_PRICE || "0.00001");

      const tokenAmountFixed = Math.floor(usdAmount / tokenPriceUSD);
      const solPrice = await fetchSolPrice();
      const solAmount = Number(usdAmount) / Number(solPrice); 
      const lamports = Math.floor(solAmount * 1e9);          

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVING_WALLET,
          lamports,
        })
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "processed");
      setTxSig(sig);

      // Optional: Save to Mongo via your API
      await fetch("/api/presale-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          amount: tokenAmountFixed,
          tx: sig,
          tier: "presale1", // helpful if you later offer different tiers
        }),
      });

    } catch (e: any) {
      setError(e.message || "Transaction failed.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!publicKey) return;

      const walletBase58 = publicKey.toBase58();
      const recipientWallet = process.env.NEXT_PUBLIC_RECIPIENT_WALLET;

      // ✅ Allow the recipient wallet to bypass verification
      if (walletBase58 === recipientWallet) {
        setUserInfo({
          wallet: walletBase58,
          telegram: "Recipient Wallet",
          rank: "ADMIN",
          topg: 0,
          verified: true,
        });
        setStatusMessage("Full access granted.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/unplugged-info?wallet=${walletBase58}`);
        const data = await res.json();

        setUserInfo(data);
        setStatusMessage(data.message || data.reason || "Unknown status.");
      } catch (error) {
        setStatusMessage("⚠️ Failed to check verification. Try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [publicKey]);


  if (loading)
    return (
      <main className="min-h-screen bg-black text-white px-6 py-12 font-mono relative overflow-hidden flex items-center justify-center">
        <MatrixRain />
        <p className="text-white-400 text-lg z-10">Checking dashboard access...</p>
      </main>
    );

  if (!userInfo?.verified) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-12 font-mono relative overflow-hidden flex flex-col items-center justify-center">
        <MatrixRain />
        <div className="z-10 relative max-w-xl mx-auto text-center mt-24 bg-[#060e156e] p-8 rounded-2xl border border-[#1e4465] backdrop-blur-md">
          <h1 className="text-4xl font-bold text-red-600 mb-4 uppercase tracking-wide">ACCESS DENIED</h1>
          <p className="text-white-400 text-lg">{statusMessage}</p>
          <p className="mt-4 text-gray-400 italic">Return when you are ready to unplug.</p>
        </div>
      </main>
    );
  }

  return (
    <>
    <MatrixRain />
    <div className="background">
      <div className="z-10 relative max-w-3xl mx-auto">
        <h1 className="title text-center mb-6">UNPLUGGED DASHBOARD</h1>

        <p className="text-gray-400 text-center mb-4 italic">{statusMessage}</p>

        <div className="dashInfoCard">
          <div className="infoRow">
            <p><strong>Wallet:</strong></p>
            <p>{userInfo.wallet.slice(0,4)} . . . {userInfo.wallet.slice(-4)}</p>
          </div>
          <div className="infoRow">
            <p><strong>Telegram:</strong></p>
            <p>{userInfo.telegram}</p>
          </div>
          <div className="infoRow">
            <p><strong>Rank:</strong></p>
            <p>{userInfo.rank}</p>
          </div>
          <div className="infoRow">
            <p><strong>TOPG Tokens:</strong></p>
            <p>{Number(userInfo.topg).toLocaleString()}</p>
          </div>
          {/* <div className="infoRow">
            <p><strong>Unplugged Since:</strong></p>
            <p>{userInfo.date}</p>
          </div> */}
        </div>

        <div className="infoRow">
          <div className="dashInfoCard mt-8 bg-[#15212a72] border border-[#7bff91] p-4 text-center rounded-xl">
            <p className="toolTitle">COMMUNITY</p>
            <div className="btnColumn">
            <Link href="/dashboard/leaderboard" className="dashBtn leaderBtn">
              <button>View Leaderboard</button>
            </Link>
            <button
              className="dashBtn"
              onClick={() => window.location.reload()}
              aria-label="Refresh Dashboard"
            >
              Refresh
            </button>  
          </div>
            <p className="mt-2">
              You are inside. You have Unplugged — now what?
            </p>
            <p className="mt-2">
              This portal holds tools that do not exist for the average man.
              Power tools for the few who earned their way in.
            </p>
            <p className="mt-2">
              Your rank. Your progress. Your window before the burn.
            </p>
            <p className="mt-2">
              Loyalty means opportunity. Most will not see it until job is done.
            </p>
            <p className="mt-2 text-green-300 italic">
              You are early. Do not waste that position.
            </p>
          </div>
        </div>

         <div className="airdropBtnHolder">
              <div className="airdropTitle">Unplugged ICO <br /> TIER 1</div>
              <p className="airdropDescription">
                This is Tier 1. The door is open.
                The price will rise, and it will not be subtle.
                Some will lock in early and never look back.
                Others will watch everything burn and realize they should have taken action.
                <br /><br />
                We have capped each buy-in — not for fairness, but to keep weak hands out.
                This is not a charity. It is a test.
                <br /><br />
                Locking in now proves you're serious. Take action, be unplugged, and make a statement.
                The loyal have the fuel.
              </p>
              <Image
                src="/unplugged.jpg"
                alt="unplugged"
                width={200}
                height={200}
                className="trw tokenImage"
              />
              <button className="airdropBtn" onClick={handleBuy}>Lock In</button>
              <p className="airdropMessage">
                The future is yours. <br />
                Tier 1 Lock-In: {solAmount.toFixed(3)} SOL
              </p>
            </div>

        <div className="dashInfoCard">
          <div className="title">UNPLUGGED ASSETS</div>
          <div className="infoGrid">
            <div className="toolBox"> 
              <p className="toolTitle">Whale Chat</p>
              <p className="toolDescription">Coming Soon </p>
            </div>
            <div className="toolBox"> 
              <p className="toolTitle">AI Hustle Tools</p>
              <p className="toolDescription">Coming Soon</p>
            </div>
            <div className="toolBox">
              <p className="toolTitle">Bots</p>
              <p className="toolDescription">Coming Soon</p>
            </div>
            <div className="toolBox">
              <p className="toolTitle">Whale Watcher</p>
              <p className="toolDescription">Coming Soon</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 italic text-center mt-4">
          This is for community engagement and experimentation. This is not financial advice. Participation is voluntary. No expectations of profit are promised or implied.
          <br />
          Participation in this token does not constitute an investment contract, and all tokens are utility-based for community access and features. No monetary return is expected or guaranteed.
        </p>


      </div>
    </div>
    </>
  );
}
