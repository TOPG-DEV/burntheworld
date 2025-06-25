export interface UserEntry {
  wallet: string;                 // Public key
  telegram: string;              // Telegram handle
  username: string;              // Display name
  email?: string;                // Optional
  referredBy?: string;             // Telegram of referrer

  createdAt: Date;
  updatedAt: Date;

  topgBalance: number;           // $TOPG token balance
  unpluggedRounds: number;       // Presale buy-ins
  totalPresaleAmount: number;    // Total SOL sent
  referralCount: number;         // # of people referred
  telegramEngagement: number;    // Interaction score (0–100)
  rank: string;                  // S, A, B, C
  verified: boolean;             // Paid + info submitted
}
