import useRotationMonitor from "../hooks/useRotationMonitor";

function ScoreBar({ score }) {
  const s = Math.min(Math.abs(Number(score)) || 0, 1);
  return (
    <div style={{marginTop:"8px", height:"5px", width:"100%", borderRadius:"99px", background:"var(--bg-input)", overflow:"hidden"}}>
      <div style={{
        height:"100%", borderRadius:"99px",
        width:`${s * 100}%`,
        background: s >= 0.6 ? "var(--success)" : s >= 0.45 ? "var(--warning)" : "var(--accent)",
        transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)"
      }} />
    </div>
  );
}

function SignalRow({ signal, index }) {
  const score = Number(signal.score) || 0;
  const isLong = signal.side === "LONG" || score > 0;
  const strength = Math.abs(score);
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 0",
      borderBottom:"1px solid var(--border)",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
        <span style={{
          width:"22px", height:"22px", borderRadius:"50%",
          background:"var(--bg-input)", display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"0.65rem", fontWeight:700, color:"var(--text-muted)", flexShrink:0
        }}>#{index + 1}</span>
        <div>
          <p style={{fontWeight:700, fontSize:"0.9rem", color:"var(--text-primary)", letterSpacing:"-0.01em"}}>
            {signal.symbol}
          </p>
          <p style={{fontSize:"0.65rem", color:"var(--text-muted)", marginTop:"2px"}}>
            ST: {Number(signal.st || 0).toFixed(3)} · Mom: {Number(signal.mom || 0).toFixed(3)}
          </p>
        </div>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
        <div style={{textAlign:"right"}}>
          <p style={{
            fontWeight:800, fontSize:"0.9rem",
            color: isLong ? "var(--success)" : "var(--danger)",
            fontVariantNumeric:"tabular-nums"
          }}>
            {score > 0 ? "+" : ""}{score.toFixed(4)}
          </p>
          <div style={{marginTop:"4px", height:"3px", width:"60px", borderRadius:"99px", background:"var(--bg-input)", overflow:"hidden"}}>
            <div style={{
              height:"100%", borderRadius:"99px",
              width:`${Math.min(strength * 100, 100)}%`,
              background: isLong ? "var(--success)" : "var(--danger)",
            }} />
          </div>
        </div>
        <span style={{
          fontSize:"0.6rem", fontWeight:700, padding:"3px 8px", borderRadius:"99px",
          background: isLong ? "hsl(142,71%,45%,0.12)" : "hsl(0,84%,60%,0.12)",
          color: isLong ? "var(--success)" : "var(--danger)",
          border:`1px solid ${isLong ? "hsl(142,71%,45%,0.25)" : "hsl(0,84%,60%,0.25)"}`,
          whiteSpace:"nowrap"
        }}>{isLong ? "LONG" : "SHORT"}</span>
      </div>
    </div>
  );
}

export default function RotationMonitorScreen() {
  const data = useRotationMonitor();

  if (!data) return (
    <div style={{padding:"16px"}}>
      <div className="glass-card" style={{padding:"32px", textAlign:"center", color:"var(--text-muted)"}}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{borderColor:"hsl(217,91%,60%)",borderTopColor:"transparent",margin:"0 auto 12px"}} />
        Loading rotation data...
      </div>
    </div>
  );

  const signals = data.signals || [];
  const noRotation = !data.current || data.current === "-";
  const noCandidate = !data.candidate || data.candidate === "-";

  return (
    <div style={{padding:"16px", display:"flex", flexDirection:"column", gap:"12px", paddingBottom:"100px"}}>

      <div className="glass-card fade-up" style={{padding:"20px"}}>
        <h1 style={{fontWeight:800, fontSize:"1.4rem", color:"var(--text-primary)"}}>Rotation Monitor</h1>
        <p style={{marginTop:"6px", fontSize:"0.8rem", color:"var(--text-muted)"}}>
          Real-time portfolio rotation intelligence and candidate scoring.
        </p>
      </div>

      {/* Rotation Cards — only show when positions exist */}
      {!noRotation ? (
        <>
          {/* Current Weakest */}
          <div className="glass-card fade-up" style={{padding:"20px"}}>
            <p style={{fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--danger)"}}>Weakest Holding</p>
            <div style={{marginTop:"10px", display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
              <div>
                <h2 style={{fontWeight:800, fontSize:"2rem", color:"var(--text-primary)", letterSpacing:"-0.02em"}}>{data.current}</h2>
                <p style={{fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"4px"}}>
                  Rank #{data.current_rank ?? "—"} · Score {Number(data.current_score || 0).toFixed(4)}
                </p>
              </div>
              <span style={{
                fontSize:"0.65rem", fontWeight:700, padding:"4px 10px", borderRadius:"99px",
                background:"hsl(0,84%,60%,0.12)", color:"var(--danger)",
                border:"1px solid hsl(0,84%,60%,0.25)"
              }}>WEAKEST</span>
            </div>
            <ScoreBar score={data.current_score} />
          </div>

          {/* Candidate */}
          {!noCandidate && (
            <div className="glass-card fade-up" style={{padding:"20px", borderColor:"var(--border-accent)"}}>
              <p style={{fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--success)"}}>Best Candidate</p>
              <div style={{marginTop:"10px", display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
                <div>
                  <h2 style={{fontWeight:800, fontSize:"2rem", color:"var(--accent)", letterSpacing:"-0.02em"}}>{data.candidate}</h2>
                  <p style={{fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"4px"}}>
                    Rank #{data.candidate_rank ?? "—"} · Score {Number(data.candidate_score || 0).toFixed(4)}
                  </p>
                </div>
                <span style={{
                  fontSize:"0.65rem", fontWeight:700, padding:"4px 10px", borderRadius:"99px",
                  background:"hsl(142,71%,45%,0.12)", color:"var(--success)",
                  border:"1px solid hsl(142,71%,45%,0.25)"
                }}>INCOMING</span>
              </div>
              <ScoreBar score={data.candidate_score} />
            </div>
          )}

          {/* Score difference */}
          {data.score_difference != null && (
            <div className="glass-card fade-up" style={{padding:"20px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <p style={{fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)"}}>Score Gap</p>
                <h2 style={{marginTop:"6px", fontWeight:800, fontSize:"2.2rem", color: data.score_difference > 0 ? "var(--success)" : "var(--danger)", letterSpacing:"-0.02em", fontVariantNumeric:"tabular-nums"}}>
                  {data.score_difference > 0 ? "+" : ""}{Number(data.score_difference).toFixed(4)}
                </h2>
                {data.expected_improvement && (
                  <p style={{fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"2px"}}>
                    Expected improvement: +{data.expected_improvement}%
                  </p>
                )}
              </div>
              <div style={{
                padding:"14px", borderRadius:"var(--radius-md)", textAlign:"center",
                background: data.decision?.includes("ROTATE") ? "hsl(217,91%,60%,0.12)" : "var(--bg-elevated)",
                border:`1px solid ${data.decision?.includes("ROTATE") ? "var(--border-accent)" : "var(--border)"}`,
                minWidth:"100px"
              }}>
                <p style={{fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)"}}>Decision</p>
                <p style={{marginTop:"4px", fontWeight:800, fontSize:"0.9rem", color: data.decision?.includes("ROTATE") ? "var(--accent)" : "var(--text-secondary)"}}>
                  {data.decision || "HOLD"}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="glass-card" style={{padding:"20px", textAlign:"center"}}>
          <p style={{fontSize:"1.5rem", marginBottom:"6px"}}>🌀</p>
          <p style={{fontWeight:600, color:"var(--text-primary)", fontSize:"0.9rem"}}>No active rotation</p>
          <p style={{fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"4px"}}>Rotation evaluates once enough positions are held.</p>
        </div>
      )}

      {/* Live Market Signals — always visible */}
      <div className="glass-card fade-up" style={{padding:"20px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px"}}>
          <p style={{fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)"}}>Live Market Signals</p>
          <span style={{
            fontSize:"0.6rem", fontWeight:700, padding:"3px 8px", borderRadius:"99px",
            background: signals.length > 0 ? "hsl(217,91%,60%,0.12)" : "var(--bg-input)",
            color: signals.length > 0 ? "var(--accent)" : "var(--text-muted)",
            border:`1px solid ${signals.length > 0 ? "var(--border-accent)" : "var(--border)"}`
          }}>{signals.length} SIGNALS</span>
        </div>

        {signals.length === 0 ? (
          <div style={{padding:"24px 0", textAlign:"center"}}>
            <p style={{fontSize:"1.5rem", marginBottom:"8px"}}>📡</p>
            <p style={{fontSize:"0.8rem", color:"var(--text-muted)"}}>No signals above threshold</p>
            <p style={{fontSize:"0.7rem", color:"var(--text-muted)", marginTop:"4px", opacity:0.6}}>Scanner is monitoring the market...</p>
          </div>
        ) : (
          <div>
            {signals.map((signal, idx) => (
              <SignalRow key={signal.symbol} signal={signal} index={idx} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
