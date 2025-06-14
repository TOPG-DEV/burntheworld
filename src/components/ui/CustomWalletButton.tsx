"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export default function CustomWalletButton() {
  const { wallet, publicKey, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (connecting) return <button className="wallet-btn">Connecting...</button>;

  if (publicKey) {
    return (
      <button
        onClick={disconnect}
        className="wallet-btn text-yellow-400 border border-yellow-400 hover:bg-yellow-700 transition"
      >
        {wallet?.adapter.name || "Wallet Connected"}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="wallet-btn text-yellow-400 border border-yellow-400 hover:bg-yellow-700 transition"
    >
      Connect Wallet
    </button>
  );
}
