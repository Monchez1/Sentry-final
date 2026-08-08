import { useEffect, useRef, useState } from "react";
import useSentrySocket from "../hooks/useSentrySocket";
import useExchanges from "../hooks/useExchanges";
import PositionCard from "../components/cards/PositionCard";
import OnboardingWizard from "../components/system/OnboardingWizard";

export default function HomeScreen() {
  const { exchanges, loading: loadingExchanges, error: exchangesError, refresh: refreshExchanges } = useExchanges();
  const { connected, snapshot } = useSentrySocket();

  if (loadingExchanges) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-5">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{borderColor:"hsl(217,91%,60%)",borderTopColor:"transparent"}} />
          <p className="text-sm font-semibold" style={{color:"var(--text-muted)"}}>Checking exchange configurations...</p>
        </div>
      </div>
    );
  }

  if (exchangesError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-5">
        <div className="flex flex-col items-center gap-3 text-center glass-card p-8 fade-up">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm font-bold" style={{color:"var(--danger)"}}>API Connection Error</p>
          <p className="text-xs max-w-[280px]" style={{color:"var(--text-muted)"}}>
            Unable to reach the backend. Verify your connection or check backend status.
          </p>
          <button
            onClick={refreshExchanges}
            className="btn-primary mt-2 px-5 py-2 text-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (exchanges.length === 0) {
    return <OnboardingWizard onComplete={refreshExchanges} />;
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-5">
        <div className="flex flex-col items-center gap-3 text-center fade-up">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{borderColor:"hsl(217,91%,60%)",borderTopColor:"transparent"}} />
          <p className="text-sm font-semibold" style={{color:"var(--text-secondary)"}}>Waiting for live rotator...</p>
          <p className="text-xs max-w-[240px]" style={{color:"var(--text-muted)"}}>
            Start the rotator from Control Center or Profile screen.
          </p>
        </div>
      </div>
    );
  }

  const portfolio = snapshot.portfolio;
  const status    = snapshot.status;
  const rotation  = snapshot.rotation;
  const positions = snapshot.positions || [];
  const isLive    = snapshot.paper_trading === false;

  return (
    <div style={{padding:"16px", display:"flex", flexDirection:"column", gap:"12px"}}>

      {/* ── Equity Hero ─────────────────────────────────────── */}
      <div className="glass-card fade-up" style={{padding:"24px", background:"linear-gradient(135deg, hsl(222,22%,13%) 0%, hsl(217,40%,15%) 100%)"}}>
        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
              <p className="section-label">{isLive ? "Live Balance" : "Paper Balance"}</p>
              <span className={isLive ? "pill pill-live" : "pill pill-paper"} style={{fontSize:"0.55rem", padding:"2px 8px"}}>
                {isLive ? "● LIVE" : "● PAPER"}
              </span>
            </div>
            <h1 style={{
              marginTop:"8px",
              fontSize:"3rem",
              fontWeight:800,
              letterSpacing:"-0.03em",
              lineHeight:1,
              color:"var(--text-primary)",
              fontVariantNumeric:"tabular-nums"
            }}>
              <AnimatedDollar value={portfolio.balance ?? portfolio.equity} />
            </h1>
            <PnlLine value={portfolio.today_pnl} pct={portfolio.today_pnl_pct} />
            {portfolio.balance !== portfolio.equity && (
              <p style={{marginTop:"6px", fontSize:"0.72rem", color:"var(--text-muted)"}}>
                Equity (with open PnL): <span style={{color:"var(--text-secondary)", fontWeight:600, fontVariantNumeric:"tabular-nums"}}>${Number(portfolio.equity).toFixed(2)}</span>
              </p>
            )}
          </div>

          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"8px"}}>
            <div style={{
              width:"10px", height:"10px", borderRadius:"50%",
              background: connected ? "var(--success)" : "var(--text-muted)",
              boxShadow: connected ? "0 0 8px var(--success)" : "none",
              transition: "background 0.3s"
            }} title={connected ? "WebSocket connected" : "Reconnecting..."} />
          </div>
        </div>
      </div>

      {/* ── Portfolio Status ─────────────────────────────────── */}
      <div className="glass-card fade-up" style={{padding:"20px"}}>
        <p className="section-label">Portfolio Status</p>
        <div style={{marginTop:"14px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px"}}>

          <MetricTile
            label="Positions"
            value={`${portfolio.positions_filled}/${portfolio.max_positions}`}
          />

          <MetricTile
            label="Scanner"
            value={status.scanner}
            color={status.scanner === "ACTIVE" ? "var(--success)" : status.scanner === "COOLDOWN" ? "var(--warning)" : "var(--text-muted)"}
          />

          <MetricTile
            label="Rotation"
            value={status.rotation}
            color={status.rotation === "ENABLED" ? "var(--success)" : "var(--text-muted)"}
          />

        </div>
      </div>

      {/* ── Drawdown Bar ─────────────────────────────────────── */}
      <div className="glass-card fade-up" style={{padding:"20px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <p className="section-label">Drawdown</p>
          <span style={{
            fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.06em",
            color: portfolio.drawdown > 25 ? "var(--danger)" : portfolio.drawdown > 15 ? "var(--warning)" : "var(--success)"
          }}>
            {portfolio.drawdown > 25 ? "HIGH RISK" : portfolio.drawdown > 15 ? "MODERATE" : "HEALTHY"}
          </span>
        </div>
        <h2 style={{
          marginTop:"10px", fontSize:"2rem", fontWeight:800,
          letterSpacing:"-0.02em", color:"var(--text-primary)",
          fontVariantNumeric:"tabular-nums"
        }}>
          {Number(portfolio.drawdown).toFixed(2)}%
        </h2>
        <div style={{
          marginTop:"12px", height:"6px", width:"100%", borderRadius:"99px",
          background:"var(--bg-input)", overflow:"hidden"
        }}>
          <div style={{
            height:"100%", borderRadius:"99px",
            width:`${Math.min(portfolio.drawdown, 100)}%`,
            background: portfolio.drawdown > 25
              ? "var(--danger)"
              : portfolio.drawdown > 15
                ? "var(--warning)"
                : "var(--success)",
            transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: portfolio.drawdown > 25 ? "0 0 10px var(--danger-glow)" : "none"
          }} />
        </div>
        <p style={{marginTop:"6px", fontSize:"0.65rem", color:"var(--text-muted)"}}>
          Circuit limit: {portfolio.circuit_limit}%
        </p>
      </div>

      {/* ── Rotation Intel ───────────────────────────────────── */}
      {(rotation.current && rotation.current !== "-") && (
        <div className="glass-card fade-up" style={{padding:"20px"}}>
          <p className="section-label">Rotation Intelligence</p>
          <div style={{marginTop:"14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
            <div style={{
              background:"var(--bg-elevated)", borderRadius:"var(--radius-md)",
              padding:"12px", border:"1px solid var(--border)"
            }}>
              <p style={{fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)"}}>Weakest Hold</p>
              <p style={{marginTop:"6px", fontSize:"1.1rem", fontWeight:700, color:"var(--text-primary)"}}>{rotation.current || "—"}</p>
              <p style={{fontSize:"0.65rem", color:"var(--text-muted)", marginTop:"2px"}}>Score: {rotation.current_score ?? "—"}</p>
            </div>

            {rotation.candidate && rotation.candidate !== "-" && (
              <div style={{
                background:"hsl(217,40%,14%)", borderRadius:"var(--radius-md)",
                padding:"12px", border:"1px solid var(--border-accent)"
              }}>
                <p style={{fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--accent)"}}>Best Candidate</p>
                <p style={{marginTop:"6px", fontSize:"1.1rem", fontWeight:700, color:"var(--accent)"}}>{rotation.candidate}</p>
                <p style={{fontSize:"0.65rem", color:"var(--text-muted)", marginTop:"2px"}}>Score: {rotation.candidate_score ?? "—"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Live Positions ───────────────────────────────────── */}
      <div className="fade-up">
        <p className="section-label" style={{paddingLeft:"4px", marginBottom:"10px"}}>Open Positions</p>

        {positions.length === 0 ? (
          <div className="glass-card" style={{padding:"24px", textAlign:"center", color:"var(--text-muted)"}}>
            <p style={{fontSize:"1.5rem", marginBottom:"8px"}}>📭</p>
            <p style={{fontSize:"0.85rem"}}>No positions open</p>
            <p style={{fontSize:"0.7rem", marginTop:"4px", color:"var(--text-muted)"}}>Scanner is watching {status.scanner === "ACTIVE" ? "for setups..." : "— paused"}</p>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
            {positions.map((position) => (
              <PositionCard key={position.symbol} position={position} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function MetricTile({ label, value, color }) {
  return (
    <div style={{
      background:"var(--bg-elevated)", borderRadius:"var(--radius-md)",
      padding:"10px 12px", border:"1px solid var(--border)"
    }}>
      <p style={{fontSize:"0.55rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.09em", color:"var(--text-muted)"}}>{label}</p>
      <p style={{
        marginTop:"5px", fontSize:"0.8rem", fontWeight:700,
        color: color || "var(--text-primary)", lineHeight:1
      }}>{value}</p>
    </div>
  );
}

function AnimatedDollar({ value }) {
  const num = Number(value);
  return <>${isNaN(num) ? "0.00" : num.toFixed(2)}</>;
}

function PnlLine({ value, pct }) {
  const numVal = Number(value) || 0;
  const numPct = Number(pct) || 0;
  const positive = numVal >= 0;
  return (
    <p style={{
      marginTop:"8px", fontVariantNumeric:"tabular-nums",
      fontSize:"0.85rem", fontWeight:600,
      color: positive ? "var(--success)" : "var(--danger)"
    }}>
      {positive ? "+" : ""}${numVal.toFixed(4)}&nbsp;
      <span style={{fontSize:"0.75rem", opacity:0.75, fontWeight:400}}>
        ({positive ? "+" : ""}{numPct.toFixed(2)}%)
      </span>
    </p>
  );
}
