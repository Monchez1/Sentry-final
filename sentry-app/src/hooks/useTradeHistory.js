import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function useTradeHistory() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTrades = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    api.get("/trade-history/")
      .then((res) => setTrades(res.data))
      .catch(console.error)
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    loadTrades(true);

    const interval = setInterval(() => loadTrades(false), 10000);

    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => Number(t.pnl) > 0).length;
    const losses = trades.filter((t) => Number(t.pnl) < 0).length;

    const netPnl = trades.reduce(
      (sum, t) => sum + Number(t.pnl || 0),
      0
    );

    const winRate =
      total > 0
        ? Math.round((wins / total) * 100)
        : 0;

    const latestBalance =
      total > 0
        ? (trades[0].balance || 0)
        : 0;

    return {
      total,
      wins,
      losses,
      netPnl,
      winRate,
      latestBalance,
    };
  }, [trades]);

  return {
    trades,
    stats,
    loading,
    refresh: () => loadTrades(true),
  };
}
