"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import MatrixRain from "@/components/ui/MatrixRain";
import Link from "next/link";
import Image from "next/image";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import CountdownTimer from "@/components/ui/CountdownTimer";

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
  const [tierClosedMessage, setTierClosedMessage] = useState(false);

  const RECEIVING_WALLET = useMemo(() => new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!), []);
  const fetchSolPrice = async () => {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await res.json();
      const price = data.solana.usd;
      setSolPrice(price);
      const usdAmount = parseFloat(process.env.NEXT_PUBLIC_PRESALE_USD_AMOUNT || "200");
      setSolAmount(usdAmount / price);
      return price;  // RETURN THE PRICE
    } catch (e) {
      console.error("Failed to fetch SOL price:", e);
      setSolPrice(140);
      setSolAmount(200 / 140);
      return 140; // fallback price
    }
  };

  useEffect(() => {
    fetchSolPrice();
  }, []);


  const handleBuy = async () => {
  console.log("handleBuy called");
  if (!publicKey) {
    console.log("Wallet not connected");
    setError("Connect your wallet first.");
    return;
  }

  setSending(true);
  setError(null);

  try {
    const usdAmount = parseFloat(process.env.NEXT_PUBLIC_PRESALE_USD_AMOUNT || "200");
    const tokenPriceUSD = parseFloat(process.env.NEXT_PUBLIC_TOKEN_USD_PRICE || "0.00001");

    const tokenAmountFixed = Math.floor(usdAmount / tokenPriceUSD);
    console.log("Calculating price, tokenAmountFixed:", tokenAmountFixed);

    const solPrice = await fetchSolPrice();
    console.log("Fetched solPrice:", solPrice);

    // Note: fetchSolPrice currently doesn't return anything. That could be an issue.
    // You need to modify fetchSolPrice to return the price for this to work.

    const solAmount = Number(usdAmount) / Number(solPrice);
    const lamports = Math.floor(solAmount * 1e9);
    console.log("Calculated lamports:", lamports);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: RECEIVING_WALLET,
        lamports,
      })
    );

    const sig = await sendTransaction(tx, connection);
    console.log("Transaction sent, sig:", sig);

    await connection.confirmTransaction(sig, "processed");
    setTxSig(sig);

    // Save to Mongo
    const res = await fetch("/api/presale-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: publicKey.toBase58(),
        amount: tokenAmountFixed,
        tx: sig,
        tier: "presale1",
      }),
    });
    console.log("Saved to Mongo, response:", res.status);

  } catch (e: any) {
    console.log("Error in handleBuy:", e);
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
            <p ><strong>TOPG Tokens:</strong></p>
            <p className="topGTokens">{Number(userInfo.topg).toLocaleString()}</p>
          </div>
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
          {/* <div className="infoRow">
            <p><strong>Unplugged Since:</strong></p>
            <p>{userInfo.date}</p>
          </div> */}
        </div>

        <div className="infoRow">
          <div className="dashInfoCard mt-8 bg-[#15212a72] border border-[#7bff91] p-4 text-center rounded-xl">
            <p className="toolTitle">COMMUNITY</p>
            <p className="mt-2">
              Welcome to the Unplugged Dashboard
            </p><br />
            <p className="mt-2">
              This portal provides insights and tools for active members of the community. 
              It is designed to help you track your position, progress, and standing.
            </p>
            <p className="mt-2">
              You can monitor your rank, view leaderboard status, and prepare for upcoming phases.
            </p>
            <p className="mt-2 text-green-300 italic">
              You are early. Stay informed. Stay prepared.
            </p>
          </div>
        </div>

        <div className="dashInfoCard">
          <div className="title">UNPLUGGED ASSETS</div>
          <div className="infoGrid">
            <div className="toolBox">
              <p className="toolTitle inProgress">Bots</p>
              <p className="toolDescription">In Progress</p>
            </div>
            <div className="toolBox">
              <p className="toolTitle">Whale Watcher</p>
              <p className="toolDescription">Coming Soon</p>
            </div>
            <div className="toolBox"> 
              <p className="toolTitle">AI Hustle Tools</p>
              <p className="toolDescription">Coming Soon</p>
            </div>
            <div className="toolBox"> 
              <p className="toolTitle">Whale Chat</p>
              <p className="toolDescription">Coming Soon </p>
            </div>
          </div>
        </div>


         <div className="airdropBtnHolder">
              <div className="airdropTitle">Unplugged ICO <br /> TIER 1 <br /> </div>
              <CountdownTimer onComplete={() => setTierClosedMessage(true)}/>
                <Image
                src="/unplugged.jpg"
                alt="unplugged"
                width={200}
                height={200}
                className="trw tokenImage"
              />
              {!tierClosedMessage ? (
                <p className="airdropDescription">
                  The door is open.
                  The price will rise, and it will not be subtle.
                  Some will lock in early and never look back.
                  <br /><br />
                  This is your chance to lock in at the lowest price.
                  <br /><br />
                  Locking in proves you are serious. Take action, be unplugged, and make a statement.
                </p>
              ) : (
                <p className="airdropDescription">
                  Tier 1 has officially closed.
                  <br />
                  <strong>Thank you for your early support.</strong> <br />
                  Congratulations to those who secured their position early — your commitment has been noted. <br />
                  Details regarding the next phase will be announced at an undisclosed time. <br />
                  Stay prepared. Opportunities will not be announced twice.
                </p>
              )}
              
              <button 
                className="airdropBtn" 
                onClick={handleBuy}
                disabled={tierClosedMessage || sending}
              >
                {sending ? "Processing..." : tierClosedMessage ? "Tier Closed" : "Lock In"}
              </button>
              <p className="airdropMessage">
                The future is yours. <br />
                Tier 1 Lock-In: {solAmount.toFixed(3)} SOL
              </p>
            </div>

        

        <p className="text-[10px] text-gray-500 italic text-center mt-4">
          This is for community engagement and experimentation. This is not financial advice. Participation is voluntary. No expectations of profit are promised or implied.
          <br />
          Participation in this token does not constitute an investment contract, and all tokens are utility-based for community access and features. No monetary return is expected or guaranteed.By connecting your wallet and participating, you acknowledge that you understand and accept the terms outlined above.
        </p>

      </div>
    </div>
    </>
  );
}
