import { useEffect, useRef, useState } from "react";

function useAnimatedValue(target, decimals = 2, durationMs = 500) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const fromRef  = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to   = Number(target);
    if (Math.abs(to - from) < Math.pow(10, -decimals) / 2) return;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startRef.current = null;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * ease;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, decimals, durationMs]);

  return display;
}

function ProgressBar({ value }) {
  return (
    <div style={{ height: "6px", width: "100%", borderRadius: "99px", background: "var(--bg-input)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          borderRadius: "99px",
          width: `${Math.min(value || 0, 100)}%`,
          background: "var(--accent)",
          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      />
    </div>
  );
}

export default function PositionCard({ position }) {
  const pnl    = useAnimatedValue(Number(position.pnl)     || 0, 4, 500);
  const pnlPct = useAnimatedValue(Number(position.pnl_pct) || 0, 2, 500);
  const positive = pnl >= 0;

  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {position.symbol}
          </h2>
          <span style={{
            display: "inline-block", marginTop: "6px",
            fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em",
            padding: "2px 8px", borderRadius: "99px",
            background: position.side === "LONG" ? "hsl(142,71%,45%,0.15)" : "hsl(0,84%,60%,0.15)",
            color: position.side === "LONG" ? "var(--success)" : "var(--danger)",
            border: `1px solid ${position.side === "LONG" ? "hsl(142,71%,45%,0.3)" : "hsl(0,84%,60%,0.3)"}`
          }}>
            {position.side}
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{
            fontWeight: 800, fontSize: "1.4rem", fontVariantNumeric: "tabular-nums",
            color: positive ? "var(--success)" : "var(--danger)"
          }}>
            {positive ? "+" : ""}${pnl.toFixed(4)}
          </p>
          <p style={{
            fontSize: "0.8rem", fontWeight: 600, marginTop: "2px", fontVariantNumeric: "tabular-nums",
            color: positive ? "var(--success)" : "var(--danger)"
          }}>
            {positive ? "+" : ""}{pnlPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
          <span>TP Progress</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{position.progress || 0}%</span>
        </div>
        <ProgressBar value={position.progress || 0} />
      </div>

      <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
        {[
          { label: "Held", value: `${position.held_bars || 0} bars` },
          { label: "Stop", value: position.stop || "-" },
          { label: "Peak", value: position.peak || "-" }
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)",
            padding: "8px 10px", border: "1px solid var(--border)"
          }}>
            <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {label}
            </p>
            <p style={{ marginTop: "3px", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

