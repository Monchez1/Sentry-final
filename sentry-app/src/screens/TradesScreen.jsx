import useTradeHistory from "../hooks/useTradeHistory";
import { RefreshCw } from "lucide-react";

function StatCard({ label, value, positive }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p
        className={
          positive === true
            ? "mt-1 text-xl font-bold text-green-600"
            : positive === false
            ? "mt-1 text-xl font-bold text-red-500"
            : "mt-1 text-xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function TradesScreen() {
  const { trades, stats, loading, refresh } = useTradeHistory();

  const formatPrice = (price) => {
    if (price == null) return "—";
    return Number(price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    });
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between rounded-[28px] bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">
            Trade History
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Closed trades from the live rotator
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className={`rounded-full p-2.5 text-[#FF6B35] hover:bg-zinc-100 transition active:scale-95 ${
            loading ? "animate-spin" : ""
          }`}
          title="Refresh trades"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Trades"
          value={stats.total}
        />

        <StatCard
          label="Win Rate"
          value={`${stats.winRate}%`}
        />

        <StatCard
          label="Net PnL"
          value={`$${Number(stats.netPnl || 0).toFixed(4)}`}
          positive={stats.netPnl > 0 ? true : stats.netPnl < 0 ? false : null}
        />

        <StatCard
          label="Latest Balance"
          value={`$${Number(stats.latestBalance || 0).toFixed(2)}`}
        />
      </div>

      {loading && trades.length === 0 ? (
        <div className="rounded-[28px] bg-white p-8 text-center text-zinc-500 shadow-sm">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#FF6B35] mb-2" />
          <p className="text-sm">Syncing trade history...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="rounded-[28px] bg-white p-6 text-center text-zinc-500 shadow-sm">
          No closed trades yet.
        </div>
      ) : (
        trades.map((trade) => (
          <div
            key={trade.id}
            className="rounded-[24px] bg-white p-4 shadow-sm"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-semibold text-base">
                  {trade.symbol}
                </p>

                <p className={`text-xs font-bold mt-0.5 ${
                  trade.side?.toUpperCase() === "LONG" ? "text-green-600" : "text-red-500"
                }`}>
                  {trade.side}
                </p>
              </div>

              <div
                className={
                  trade.pnl >= 0
                    ? "text-right font-bold text-base text-green-600"
                    : "text-right font-bold text-base text-red-500"
                }
              >
                {trade.pnl >= 0 ? "+" : ""}${Number(trade.pnl || 0).toFixed(4)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">
                  Entry
                </p>
                <p className="font-semibold text-zinc-800 mt-0.5">
                  {formatPrice(trade.entry_price)}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">
                  Exit
                </p>
                <p className="font-semibold text-zinc-800 mt-0.5">
                  {formatPrice(trade.exit_price)}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">
                  Reason
                </p>
                <p className="font-semibold text-zinc-800 mt-0.5 capitalize">
                  {trade.reason?.toLowerCase().replace("_", " ") || "UNKNOWN"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">
                  Held
                </p>
                <p className="font-semibold text-zinc-800 mt-0.5">
                  {trade.bars_held || 0} bars
                </p>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-zinc-400">
              {trade.closed_at}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
