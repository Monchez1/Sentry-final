import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import useTradeHistory from "../hooks/useTradeHistory";

function TradeRow({ trade }) {
  const isBuy = trade.side === "buy";
  const pos   = trade.pnl_usdt >= 0;
  return (
    <div className="card-sm card fade-up" style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{
          width:36, height:36, borderRadius:11,
          background: isBuy ? "var(--green-soft)" : "var(--red-soft)",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          {isBuy
            ? <ArrowUpRight size={18} color="var(--green)" />
            : <ArrowDownRight size={18} color="var(--red)" />}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontWeight:700, fontSize:14 }}>{trade.symbol}</span>
            <span style={{ fontWeight:700, fontSize:14 }} className={pos ? "pnl-pos" : "pnl-neg"}>
              {pos ? "+" : ""}${Math.abs(trade.pnl_usdt).toFixed(2)}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4 }}>
            <div style={{ display:"flex", gap:8 }}>
              <span className={`badge ${isBuy ? "badge-green" : "badge-red"}`} style={{ padding:"2px 8px", fontSize:10 }}>
                {trade.side?.toUpperCase()}
              </span>
              <span style={{ fontSize:11, color:"var(--text-muted)" }}>
                ${trade.entry_price?.toFixed(2)} → ${trade.exit_price?.toFixed(2)}
              </span>
            </div>
            <span style={{ fontSize:11, color:"var(--text-muted)" }}>
              {trade.pnl_percent >= 0 ? "+" : ""}{trade.pnl_percent?.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradesScreen() {
  const { trades, loading } = useTradeHistory();

  const wins   = trades.filter(t => t.pnl_usdt > 0);
  const losses = trades.filter(t => t.pnl_usdt <= 0);
  const totalPnl = trades.reduce((s, t) => s + (t.pnl_usdt || 0), 0);
  const winRate  = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="page-header">
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
          History
        </div>
        <h1 style={{ fontSize:22, fontWeight:800 }}>Trade Log</h1>
      </div>

      <div className="content">
        {/* Stats summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Total PnL",  value: `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(0)}`, accent: totalPnl >= 0 ? "pnl-pos" : "pnl-neg" },
            { label:"Win Rate",   value: `${winRate}%`, accent:"text-green" },
            { label:"Trades",     value: trades.length, accent:"" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="card fade-up" style={{ padding:"14px 12px" }}>
              <div className="stat-label" style={{ fontSize:10 }}>{label}</div>
              <div className={`stat-value-sm ${accent}`} style={{ fontSize:16 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Trade list */}
        {loading && [1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height:70, borderRadius:16, marginBottom:8 }} />
        ))}

        {!loading && trades.length === 0 && (
          <div className="card fade-up" style={{ textAlign:"center", padding:"40px 20px" }}>
            <Clock size={28} color="var(--text-muted)" style={{ margin:"0 auto 12px" }} />
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>No trades yet</div>
            <div style={{ color:"var(--text-secondary)", fontSize:13 }}>Trades will appear here once the bot executes</div>
          </div>
        )}

        {!loading && trades.map((t, i) => <TradeRow key={i} trade={t} />)}
      </div>
    </div>
  );
}
