import { useState } from "react";
import useTradeHistory from "../hooks/useTradeHistory";
import { RefreshCw } from "lucide-react";

function StatTile({ label, value, color }) {
  return (
    <div className="glass-card" style={{padding:"14px 12px"}}>
      <p style={{fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)"}}>{label}</p>
      <p style={{marginTop:"6px", fontSize:"1.2rem", fontWeight:800, color: color || "var(--text-primary)", fontVariantNumeric:"tabular-nums", letterSpacing:"-0.01em"}}>{value}</p>
    </div>
  );
}

const REASON_LABEL = {
  TRAIL_STOP: "Trail Stop",
  TAKE_PROFIT: "Take Profit",
  FORCE_EXIT: "Force Exit",
  ROTATION: "Rotation",
  CIRCUIT_BREAKER: "Circuit Break",
};

export default function TradesScreen() {
  const { trades, stats, loading, refresh } = useTradeHistory();
  const [visibleCount, setVisibleCount] = useState(20);

  const fmt = (p) => p == null ? "—" : Number(p).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:5});

  return (
    <div style={{padding:"16px", display:"flex", flexDirection:"column", gap:"12px", paddingBottom:"100px"}}>

      {/* Header */}
      <div className="glass-card fade-up" style={{padding:"20px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <h1 style={{fontWeight:800, fontSize:"1.4rem", color:"var(--text-primary)"}}>Trade History</h1>
          <p style={{marginTop:"4px", fontSize:"0.75rem", color:"var(--text-muted)"}}>Closed positions from the live rotator</p>
        </div>
        <button onClick={refresh} disabled={loading} style={{
          background:"var(--bg-elevated)", border:"1px solid var(--border)",
          borderRadius:"50%", width:"38px", height:"38px",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", color:"var(--accent)"
        }}>
          <RefreshCw size={16} style={{animation: loading ? "spin 1s linear infinite" : "none"}} />
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"8px"}} className="fade-up">
        <StatTile label="Total Trades" value={stats.total} />
        <StatTile label="Win Rate" value={`${stats.winRate}%`}
          color={Number(stats.winRate) >= 50 ? "var(--success)" : "var(--danger)"} />
        <StatTile label="Net PnL" value={`$${Number(stats.netPnl || 0).toFixed(4)}`}
          color={stats.netPnl > 0 ? "var(--success)" : stats.netPnl < 0 ? "var(--danger)" : undefined} />
        <StatTile label="Balance" value={`$${Number(stats.latestBalance || 0).toFixed(2)}`} />
      </div>

      {/* Trades list */}
      {loading && trades.length === 0 ? (
        <div className="glass-card" style={{padding:"32px", textAlign:"center"}}>
          <RefreshCw size={20} style={{color:"var(--accent)", margin:"0 auto 10px", display:"block", animation:"spin 1s linear infinite"}} />
          <p style={{color:"var(--text-muted)", fontSize:"0.85rem"}}>Syncing trade history...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="glass-card" style={{padding:"32px", textAlign:"center"}}>
          <p style={{fontSize:"1.8rem", marginBottom:"8px"}}>📊</p>
          <p style={{fontWeight:600, color:"var(--text-primary)"}}>No closed trades yet</p>
          <p style={{fontSize:"0.75rem", color:"var(--text-muted)", marginTop:"4px"}}>Trades will appear here once the rotator closes a position.</p>
        </div>
      ) : (
        <>
          {trades.slice(0, visibleCount).map((trade) => {
            const positive = trade.pnl >= 0;
            const closedAt = trade.closed_at ? new Date(trade.closed_at) : null;
            const timeStr = closedAt
              ? closedAt.toLocaleString(undefined, {
                  month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                  hour12: false,
                })
              : "—";
            return (
              <div key={trade.id} className="glass-card fade-up" style={{padding:"16px"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                  <div>
                    <p style={{fontWeight:700, fontSize:"1rem", color:"var(--text-primary)"}}>{trade.symbol}</p>
                    <span style={{
                      display:"inline-block", marginTop:"4px",
                      fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.06em",
                      padding:"2px 7px", borderRadius:"99px",
                      background: trade.side?.toUpperCase() === "LONG" ? "hsl(142,71%,45%,0.15)" : "hsl(0,84%,60%,0.15)",
                      color: trade.side?.toUpperCase() === "LONG" ? "var(--success)" : "var(--danger)",
                      border: `1px solid ${trade.side?.toUpperCase() === "LONG" ? "hsl(142,71%,45%,0.3)" : "hsl(0,84%,60%,0.3)"}`,
                    }}>
                      {trade.side?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontWeight:800, fontSize:"1.1rem", fontVariantNumeric:"tabular-nums", color: positive ? "var(--success)" : "var(--danger)"}}>
                      {positive ? "+" : ""}${Number(trade.pnl || 0).toFixed(4)}
                    </p>
                    {trade.pnl_pct != null && (
                      <p style={{fontSize:"0.7rem", fontWeight:600, color: positive ? "var(--success)" : "var(--danger)", opacity:0.8, marginTop:"1px", fontVariantNumeric:"tabular-nums"}}>
                        {positive ? "+" : ""}{Number(trade.pnl_pct || 0).toFixed(2)}%
                      </p>
                    )}
                    <p style={{fontSize:"0.65rem", color:"var(--text-muted)", marginTop:"2px"}}>
                      {REASON_LABEL[trade.reason] || trade.reason || "Unknown"}
                    </p>
                  </div>
                </div>

                <div style={{marginTop:"12px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"6px"}}>
                  {[
                    {label:"Entry",  value: fmt(trade.entry_price)},
                    {label:"Exit",   value: fmt(trade.exit_price)},
                    {label:"Margin", value: trade.margin ? `$${Number(trade.margin).toFixed(3)}` : "—"},
                    {label:"Held",   value: `${trade.bars_held || 0} bars`},
                    {label:"Closed", value: timeStr},
                    {label:"Balance",value: trade.balance ? `$${Number(trade.balance).toFixed(3)}` : "—"},
                  ].map(({label, value}) => (
                    <div key={label} style={{background:"var(--bg-elevated)", borderRadius:"var(--radius-sm)", padding:"8px 10px", border:"1px solid var(--border)"}}>
                      <p style={{fontSize:"0.58rem", color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em"}}>{label}</p>
                      <p style={{marginTop:"3px", fontSize:"0.78rem", fontWeight:600, color:"var(--text-primary)", fontVariantNumeric:"tabular-nums"}}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {trades.length > visibleCount && (
            <button onClick={() => setVisibleCount(v => v + 20)}
              style={{
                background:"var(--bg-card)", border:"1px solid var(--border)",
                borderRadius:"var(--radius-md)", padding:"14px",
                fontWeight:600, fontSize:"0.85rem", color:"var(--accent)", cursor:"pointer"
              }}>
              Load More Trades
            </button>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
