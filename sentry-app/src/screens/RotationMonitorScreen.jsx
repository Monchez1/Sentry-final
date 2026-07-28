import { ArrowRight, Activity, TrendingUp, HelpCircle } from "lucide-react";
import useRotationMonitor from "../hooks/useRotationMonitor";

export default function RotationMonitorScreen() {
  const data = useRotationMonitor();

  if (!data) {
    return (
      <div>
        <div className="page-header">
          <div className="stat-label">Rotation</div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Rotation Monitor</h1>
        </div>
        <div className="content">
          <div className="card fade-up" style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div className="skeleton" style={{ width:40, height:40, borderRadius:12 }} />
            <div style={{ flex:1 }}>
              <div className="skeleton" style={{ height:14, width:"50%", marginBottom:8 }} />
              <div className="skeleton" style={{ height:11, width:"70%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHold = data.decision === "HOLD";

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
              Portfolio Rotation
            </div>
            <h1 style={{ fontSize:22, fontWeight:800 }}>Rotation Monitor</h1>
          </div>
          <div className="badge badge-muted">
            <Activity size={12} className="pulse-dot" style={{ color:"var(--accent)", marginRight:4 }} />
            Active
          </div>
        </div>
      </div>

      <div className="content">
        {/* ── Decision banner ─────────────────────────────────── */}
        <div className="card fade-up" style={{
          background: isHold ? "var(--accent-soft)" : "var(--green-soft)",
          border: `1.5px solid ${isHold ? "var(--accent)" : "var(--green)"}33`,
          display:"flex", alignItems:"center", gap:14,
        }}>
          <div style={{
            width:40, height:40, borderRadius:12,
            background:"rgba(0,0,0,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <TrendingUp size={20} color={isHold ? "var(--accent)" : "var(--green)"} />
          </div>
          <div>
            <div className="stat-label" style={{ color: isHold ? "var(--accent)" : "var(--green)" }}>Engine Decision</div>
            <div style={{ fontSize:18, fontWeight:800, color: "var(--text-primary)" }}>{data.decision}</div>
          </div>
        </div>

        {/* ── Rotation Cards ──────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {/* Current Weakest */}
          <div className="card fade-up" style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)" }}>
            <div className="stat-label">Weakest Holding</div>
            <div style={{ fontSize:24, fontWeight:800, margin:"8px 0 4px" }}>{data.current}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:2, fontSize:12, color:"var(--text-secondary)" }}>
              <span>Score: {data.current_score?.toFixed(4)}</span>
              <span>Rank: #{data.current_rank}</span>
            </div>
          </div>

          {/* Candidate */}
          <div className="card fade-up" style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)" }}>
            <div className="stat-label">Top Candidate</div>
            <div style={{ fontSize:24, fontWeight:800, margin:"8px 0 4px" }}>{data.candidate}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:2, fontSize:12, color:"var(--text-secondary)" }}>
              <span>Score: {data.candidate_score?.toFixed(4)}</span>
              <span>Rank: #{data.candidate_rank}</span>
            </div>
          </div>
        </div>

        {/* ── Rotation Flow Diagram ───────────────────────────── */}
        <div className="card fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, padding:"24px 20px" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, textTransform:"uppercase", fontWeight:700, color:"var(--text-muted)", marginBottom:4 }}>From</div>
            <span className="badge badge-muted" style={{ fontSize:13, padding:"6px 14px", borderRadius:10 }}>{data.current}</span>
          </div>
          <ArrowRight size={20} color="var(--text-muted)" style={{ marginTop:14 }} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, textTransform:"uppercase", fontWeight:700, color:"var(--text-muted)", marginBottom:4 }}>To</div>
            <span className="badge badge-accent" style={{ fontSize:13, padding:"6px 14px", borderRadius:10 }}>{data.candidate}</span>
          </div>
        </div>

        {/* ── Expected Improvement Card ──────────────────────── */}
        <div className="card fade-up">
          <div className="section-title">Expected Metrics</div>
          <div className="row">
            <span className="row-label">Score Delta</span>
            <span className="row-value" style={{ color: data.score_difference >= 0 ? "var(--green)" : "var(--red)" }}>
              {data.score_difference >= 0 ? "+" : ""}{data.score_difference}
            </span>
          </div>
          <div className="row">
            <span className="row-label">Expected Improvement</span>
            <span className="row-value text-accent">
              +{data.expected_improvement}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
