import { TrendingUp, TrendingDown, Zap, Clock, DollarSign, BarChart3, RefreshCw } from "lucide-react";
import usePortfolio      from "../hooks/usePortfolio";
import usePositions      from "../hooks/usePositions";
import useRecentActivity from "../hooks/useRecentActivity";
import useStatus         from "../hooks/useStatus";

function PnlValue({ value }) {
  const pos = value >= 0;
  return (
    <span className={pos ? "pnl-pos" : "pnl-neg"}>
      {pos ? "+" : ""}${Math.abs(value).toFixed(2)}
    </span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card fade-up" style={{ flex: 1 }}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value-sm ${accent || ""}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function HomeScreen() {
  const { portfolio, loading: pLoading } = usePortfolio();
  const positions                        = usePositions() || [];
  const { activities }                   = useRecentActivity();
  const { status }                       = useStatus();

  const totalPnl   = portfolio?.total_pnl   ?? 0;
  const balance    = portfolio?.balance      ?? 0;
  const winRate    = portfolio?.win_rate     ?? 0;
  const totalTrades= portfolio?.total_trades ?? 0;
  const openCount  = positions?.length       ?? 0;

  return (
    <div>
      {/* ── Header ────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
              Sentry Bot
            </div>
            <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)" }}>Dashboard</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className={`dot ${status?.running ? "dot-green pulse-dot" : "dot-muted"}`} />
            <span style={{ fontSize:12, color:"var(--text-secondary)", fontWeight:600 }}>
              {status?.running ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="content">
        {/* ── Balance card ──────────────────────────────────── */}
        <div className="card fade-up" style={{ background:"linear-gradient(135deg, #1e2330 0%, #181c24 100%)", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"var(--accent-glow)", filter:"blur(40px)", pointerEvents:"none" }} />
          <div className="stat-label">Total Balance</div>
          <div style={{ fontSize:36, fontWeight:800, color:"var(--text-primary)", lineHeight:1.1, margin:"6px 0 4px" }}>
            ${pLoading ? "—" : balance.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {totalPnl >= 0
              ? <TrendingUp size={14} color="var(--green)" />
              : <TrendingDown size={14} color="var(--red)" />}
            <span style={{ fontSize:13, fontWeight:600 }} className={totalPnl >= 0 ? "pnl-pos" : "pnl-neg"}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toFixed(2)} all time
            </span>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────── */}
        <div style={{ display:"flex", gap:10 }}>
          <StatCard
            label="Win Rate"
            value={`${(winRate * 100).toFixed(1)}%`}
            sub={`${totalTrades} trades`}
            accent="text-green"
          />
          <StatCard
            label="Open"
            value={openCount}
            sub="positions"
            accent="text-accent"
          />
        </div>

        {/* ── Open positions ────────────────────────────────── */}
        {openCount > 0 && (
          <div className="card fade-up">
            <div className="section-title">Open Positions</div>
            {positions.map((pos, i) => (
              <div key={i} className="row">
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{pos.symbol}</div>
                  <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                    <span className={pos.side === "buy" ? "text-green" : "text-red"} style={{ fontWeight:600, textTransform:"uppercase" }}>
                      {pos.side}
                    </span>
                    {" "}@ ${pos.entry_price?.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700, fontSize:14 }} className={pos.pnl_usdt >= 0 ? "pnl-pos" : "pnl-neg"}>
                    <PnlValue value={pos.pnl_usdt ?? 0} />
                  </div>
                  <div style={{ fontSize:12, color:"var(--text-muted)" }}>
                    {pos.pnl_percent?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Recent activity ───────────────────────────────── */}
        <div className="card fade-up">
          <div className="section-title">Recent Activity</div>
          {!activities?.length ? (
            <div style={{ color:"var(--text-muted)", fontSize:13, padding:"8px 0" }}>No recent activity</div>
          ) : (
            activities.slice(0, 6).map((a, i) => (
              <div key={i} className="row">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:"var(--bg-elevated)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Zap size={14} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{a.event_type?.replace(/_/g," ")}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>{a.message?.slice(0,48)}</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:"var(--text-muted)", flexShrink:0 }}>
                  <Clock size={10} style={{ display:"inline", marginRight:3 }} />
                  {new Date(a.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
