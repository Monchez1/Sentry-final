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
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        className="h-full rounded-full bg-[#FF6B35] transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(value || 0, 100)}%` }}
      />
    </div>
  );
}

export default function PositionCard({ position }) {
  const pnl    = useAnimatedValue(Number(position.pnl)     || 0, 4, 500);
  const pnlPct = useAnimatedValue(Number(position.pnl_pct) || 0, 2, 500);
  const positive = pnl >= 0;

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{position.symbol}</h2>
          <p className={position.side === "LONG" ? "text-green-600 text-sm" : "text-red-500 text-sm"}>
            {position.side}
          </p>
        </div>

        <div className="text-right tabular-nums">
          <p className={`text-2xl font-bold transition-colors duration-300 ${positive ? "text-green-600" : "text-red-500"}`}>
            {positive ? "+" : ""}${pnl.toFixed(4)}
          </p>
          <p className={`text-sm transition-colors duration-300 ${positive ? "text-green-600" : "text-red-500"}`}>
            {positive ? "+" : ""}{pnlPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm text-zinc-500">
          <span>TP Progress</span>
          <span className="tabular-nums">{position.progress || 0}%</span>
        </div>
        <ProgressBar value={position.progress || 0} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Held</p>
          <p className="font-semibold tabular-nums">{position.held_bars || 0} bars</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Stop</p>
          <p className="font-semibold">{position.stop || "-"}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Peak</p>
          <p className="font-semibold">{position.peak || "-"}</p>
        </div>
      </div>
    </div>
  );
}
