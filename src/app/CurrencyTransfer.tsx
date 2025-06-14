"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "../components/ui/card";

export default function CurrencyTransfer() {
  return (
    <motion.div
      className="flex justify-center items-center min-h-[300px] w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 text-center shadow-lg rounded-xl border border-zinc-200 dark:border-zinc-800">
        <motion.div
          className="mx-auto mb-4 text-green-500 dark:text-green-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          ✅
        </motion.div>
        <h3 className="text-xl font-semibold text-black dark:text-white">Access Granted</h3>
        <CardContent>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            You’ve unlocked full access. Enjoy the benefits.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
