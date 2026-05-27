import { useEffect, useRef, useState } from "react";
import useSentrySocket from "../hooks/useSentrySocket";
import useExchanges from "../hooks/useExchanges";
import PositionCard from "../components/cards/PositionCard";
import OnboardingWizard from "../components/system/OnboardingWizard";

export default function HomeScreen() {
  const { exchanges, loading: loadingExchanges, refresh: refreshExchanges } = useExchanges();
  const { connected, snapshot } = useSentrySocket();

  if (loadingExchanges) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-5">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent" />
          <p className="text-sm font-semibold text-zinc-500">Checking exchange configurations...</p>
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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent" />
          <p className="text-sm font-semibold text-zinc-500">Waiting for live rotator updates...</p>
          <p className="text-xs text-zinc-400 max-w-[280px]">
            Please ensure you have started the rotator engine from the Control Center or Profile screen.
          </p>
        </div>
      </div>
    );
  }

  const portfolio = snapshot.portfolio;
  const status    = snapshot.status;
  const rotation  = snapshot.rotation;
  const positions = snapshot.positions || [];

  const getStatusBadge = (val) => {
    if (!val) return null;
    const cleanVal = val.toUpperCase();
    if (cleanVal === "ACTIVE" || cleanVal === "ENABLED") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
          {cleanVal}
        </span>
      );
    }
    if (cleanVal === "COOLDOWN") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/10 animate-pulse">
          {cleanVal}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-50 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
        {cleanVal}
      </span>
    );
  };

  const getPositionsBadge = () => (
    <span className="inline-flex items-center rounded-full bg-[#FF6B35]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#FF6B35] ring-1 ring-inset ring-[#FF6B35]/20">
      {portfolio.positions_filled}/{portfolio.max_positions}
    </span>
  );

  return (
    <div className="p-5 space-y-4">

      {/* ── Equity Hero Card ─────────────────────────────────── */}
      <div className="rounded-[32px] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">

          <div>
            <p className="text-sm text-zinc-500">Total Equity</p>

            <h1 className="mt-2 text-5xl font-bold tabular-nums transition-[color] duration-300">
              <AnimatedDollar value={portfolio.equity} decimals={2} />
            </h1>

            <PnlLine value={portfolio.today_pnl} pct={portfolio.today_pnl_pct} />
          </div>

          <div className="flex items-center gap-2">
            <div className={connected
              ? "h-3 w-3 rounded-full bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.5)]"
              : "h-3 w-3 rounded-full bg-red-500"
            } />
            <span className="font-semibold text-zinc-700 text-sm">
              {connected ? "LIVE" : "OFFLINE"}
            </span>
            {snapshot.paper_trading !== undefined && (
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                snapshot.paper_trading
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {snapshot.paper_trading ? "Paper" : "Live"}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── Portfolio Status ─────────────────────────────────── */}
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Portfolio Status</p>
        <div className="mt-4 grid grid-cols-3 gap-2">

          <div className="flex flex-col gap-1 items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Positions</p>
            <div className="mt-1">{getPositionsBadge()}</div>
          </div>

          <div className="flex flex-col gap-1 items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Scanner</p>
            <div className="mt-1">{getStatusBadge(status.scanner)}</div>
          </div>

          <div className="flex flex-col gap-1 items-start">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rotation</p>
            <div className="mt-1">{getStatusBadge(status.rotation)}</div>
          </div>

        </div>
      </div>

      {/* ── Drawdown ─────────────────────────────────────────── */}
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Drawdown</p>
        <h2 className="mt-3 text-3xl font-bold tabular-nums">
          <AnimatedNumber value={portfolio.drawdown} decimals={2} />%
        </h2>
        {/* thin progress bar so it feels live */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#FF6B35] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(portfolio.drawdown, 100)}%` }}
          />
        </div>
      </div>

      {/* ── Rotation Opportunity ─────────────────────────────── */}
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Rotation Opportunity</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-xs text-zinc-400 uppercase tracking-wider">Current Weakest</p>
            <p className="text-lg font-bold mt-1 transition-all duration-300">{rotation.current || "-"}</p>
            <p className="text-xs text-zinc-500">Score: {rotation.current_score !== undefined ? rotation.current_score : "-"}</p>
          </div>

          {rotation.candidate && rotation.candidate !== "-" && (
            <div>
              <p className="font-semibold text-xs text-zinc-400 uppercase tracking-wider">Best Candidate</p>
              <p className="text-lg font-bold mt-1 text-[#FF6B35] transition-all duration-300">{rotation.candidate}</p>
              <p className="text-xs text-zinc-500">Score: {rotation.candidate_score !== undefined ? rotation.candidate_score : "-"}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Positions ───────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-zinc-500 text-sm">Live Positions</p>

        {positions.length === 0 ? (
          <div className="rounded-[28px] bg-white p-5 text-zinc-500 shadow-sm">
            No positions open
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map((position) => (
              <PositionCard key={position.symbol} position={position} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ── Animated helpers ─────────────────────────────────────── */

function AnimatedNumber({ value, decimals = 2, durationMs = 600 }) {
  const animated = useAnimatedValue(Number(value) || 0, decimals, durationMs);
  return <>{animated.toFixed(decimals)}</>;
}

function AnimatedDollar({ value, decimals = 2 }) {
  const animated = useAnimatedValue(Number(value) || 0, decimals);
  return <>${animated.toFixed(decimals)}</>;
}

function PnlLine({ value, pct }) {
  const animVal = useAnimatedValue(Number(value) || 0, 4);
  const animPct = useAnimatedValue(Number(pct)  || 0, 2);
  const positive = animVal >= 0;
  return (
    <p className={`mt-2 tabular-nums text-sm font-semibold transition-colors duration-300 ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? "+" : ""}${animVal.toFixed(4)}&nbsp;
      <span className="text-xs font-normal opacity-70">
        ({positive ? "+" : ""}{animPct.toFixed(2)}%)
      </span>
    </p>
  );
}

function useAnimatedValue(target, decimals = 2, durationMs = 600) {
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
