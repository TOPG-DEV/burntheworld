"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import MatrixRain from "@/components/ui/MatrixRain";

type Leader = {
  username: string;
  wallet: string;
  rank: string;
  powerScore: number;
  topgBalance: number;
  referrals: number;
  buyIn: number;
  engagement: number;
};

function getPowerRankTitle(score: number) {
  if (score >= 9000) return "TOPG";
  if (score >= 7100) return "UNPLUGGED TOPG";
  if (score >= 4100) return "Matrix Hacker";
  if (score >= 2100) return "Red Pilled";
  return "G";
}

export default function LeaderDashboard() {
  const { publicKey } = useWallet();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [currentUser, setCurrentUser] = useState<Leader | null>(null);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        setLeaders(data);

        if (publicKey) {
          const key = publicKey.toBase58();
          const me = data.find((u: Leader) => u.wallet === key);
          setCurrentUser(me || null);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaders([]);
        setCurrentUser(null);
      }
    };

    fetchLeaders();
  }, [publicKey]);

  return (
    <>
      <MatrixRain />
      <div className="background min-h-screen text-white font-mono px-6 py-12">
        <div className="z-10 relative max-w-4xl mx-auto">
          <h1 className="title text-center mb-6">UNPLUGGED LEADERBOARD</h1>

          {currentUser && (
            <div className="dashInfoCard mb-8 bg-[#121e2c] border border-yellow-500">
              <p className="toolTitle text-yellow-400">Your Rank</p>
              <div className="infoRow">
                <p><strong>Wallet:</strong></p>
                <p>{currentUser.wallet.slice(0, 4)}...{currentUser.wallet.slice(-4)}</p>
              </div>
              <div className="infoRow">
                <p><strong>Title:</strong></p>
                <p>{getPowerRankTitle(currentUser.powerScore)}</p>
              </div>
              <div className="infoRow">
                <p><strong>Power Score:</strong></p>
                <p>{currentUser.powerScore}</p>
              </div>
              <div className="infoRow">
                <p><strong>$TOPG Tokens:</strong></p>
                <p className="topGTokens">{Math.floor(currentUser.topgBalance).toLocaleString()}</p>
              </div>
            </div>
          )}


          <div className="dashInfoCard border border-[#1e4465] overflow-x-auto">
            <div className="toolTitle text-yellow-400 text-center">TOP G LEADERS</div>
            <table className="min-w-full text-white text-sm mt-4">
              <thead>
                <tr className="bg-[#1e4465] text-green-300">
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">Score</th>
                  <th className="px-4 py-2 text-left">$TOPG</th>
                  <th className="px-4 py-2 text-left">Referrals</th>
                  <th className="px-4 py-2 text-left">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((user, i) => (
                  <tr
                    key={user.wallet}
                    className="border-b border-[#1e4465] hover:bg-[#15212a88] transition duration-150"
                  >
                    <td className="px-4 py-2">{getPowerRankTitle(user.powerScore)}</td>
                    <td className="px-4 py-2">{user.username || "Anon"}</td>
                    <td className="px-4 py-2 font-bold">{user.powerScore}</td>
                    <td className="px-4 py-2">{Math.floor(user.topgBalance).toLocaleString()}</td>
                    <td className="px-4 py-2">{user.referrals}</td>
                    <td className="px-4 py-2">{user.engagement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="btnColumn mt-6">
            <a href="/dashboard" className="dashBtn">
              <button>← Back to Dashboard</button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
