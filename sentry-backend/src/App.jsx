import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import api from "./services/api";
import {
  Home,
  Radio,
  TrendingUp,
  User,
  Plus,
  Power,
  Pause,
  RefreshCcw,
  ShieldAlert,
  Settings,
  KeyRound,
  Bell,
  Lock,
  Activity,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Wallet,
  RotateCw,
  PlugZap,
} from "lucide-react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";

const COLORS = {
  bg: "bg-[#F8F9FB]",
  accent: "#FF6B35",
};

const positions = [
  {
    symbol: "BTCUSDT",
    side: "LONG",
    pnl: "+$1.45",
    pnlPct: "+5.3%",
    score: 0.67,
    held: 17,
    stop: "102,440",
    peak: "104,120",
    progress: 78,
  },
  {
    symbol: "ETHUSDT",
    side: "LONG",
    pnl: "+$0.84",
    pnlPct: "+3.1%",
    score: 0.52,
    held: 14,
    stop: "3,038",
    peak: "3,142",
    progress: 61,
  },
  {
    symbol: "SOLUSDT",
    side: "LONG",
    pnl: "+$2.11",
    pnlPct: "+7.9%",
    score: 0.74,
    held: 21,
    stop: "145.20",
    peak: "152.80",
    progress: 84,
  },
  {
    symbol: "XRPUSDT",
    side: "SHORT",
    pnl: "-$0.32",
    pnlPct: "-1.2%",
    score: 0.44,
    held: 12,
    stop: "0.592",
    peak: "0.571",
    progress: 32,
  },
];

const signals = [
  { symbol: "ADAUSDT", side: "LONG", score: 0.89, rank: 1, st: 0.82, mom: 0.19, rsi: 0.0 },
  { symbol: "AVAXUSDT", side: "LONG", score: 0.81, rank: 2, st: 0.77, mom: 0.13, rsi: 0.0 },
  { symbol: "NEARUSDT", side: "SHORT", score: 0.72, rank: 3, st: -0.68, mom: -0.11, rsi: 0.0 },
  { symbol: "LINKUSDT", side: "LONG", score: 0.64, rank: 4, st: 0.58, mom: 0.12, rsi: 0.0 },
];

const settingsGroups = [
  {
    title: "API Connectors",
    subtitle: "Bybit, Binance, OKX, Bitget",
    icon: PlugZap,
    status: "2 connected",
  },
  {
    title: "Strategy Settings",
    subtitle: "Max positions, leverage, rotation boost",
    icon: RotateCw,
    status: "10x active",
  },
  {
    title: "Risk Management",
    subtitle: "Circuit breaker, cooldowns, ATR stop",
    icon: ShieldAlert,
    status: "35% DD limit",
  },
  {
    title: "Notifications",
    subtitle: "Telegram, push alerts, trade events",
    icon: Bell,
    status: "Enabled",
  },
  {
    title: "Security",
    subtitle: "2FA, biometrics, sessions",
    icon: Lock,
    status: "Protected",
  },
  {
    title: "Audit Logs",
    subtitle: "Entries, exits, rotations, API events",
    icon: Activity,
    status: "Live",
  },
];

function Header({ title, subtitle }) {
  return (
    <div className="px-5 pt-6 pb-3">
      <p className="text-sm text-zinc-500">{subtitle}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
    </div>
  );
}

function SoftCard({ children, className = "" }) {
  return (
    <Card className={`rounded-[28px] border-0 bg-white shadow-sm ${className}`}>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${value}%` }} />
    </div>
  );
}

function HomeScreen() {
  return (
    <div className="space-y-4 px-5 pb-28">
      <SoftCard className="bg-gradient-to-br from-white to-orange-50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">Total Equity</p>
            <h2 className="mt-2 text-5xl font-semibold tracking-tight text-zinc-950">$53.42</h2>
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
              <TrendingUp size={16} /> +$3.12 today · +6.2%
            </div>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#FF6B35] shadow-sm">LIVE</div>
        </div>
      </SoftCard>

      <div className="grid grid-cols-2 gap-4">
        <SoftCard>
          <Wallet className="mb-3 text-[#FF6B35]" size={22} />
          <p className="text-sm text-zinc-500">Portfolio</p>
          <p className="mt-1 text-xl font-semibold">4 / 4</p>
          <p className="text-xs text-zinc-400">Positions filled</p>
        </SoftCard>
        <SoftCard>
          <RotateCw className="mb-3 text-[#FF6B35]" size={22} />
          <p className="text-sm text-zinc-500">Rotation</p>
          <p className="mt-1 text-xl font-semibold">Active</p>
          <p className="text-xs text-zinc-400">Boost 0.30</p>
        </SoftCard>
      </div>

      <SoftCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Portfolio Drawdown</p>
            <p className="mt-1 text-2xl font-semibold">8.4%</p>
          </div>
          <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-right">
            <p className="text-xs text-zinc-400">Circuit limit</p>
            <p className="text-sm font-semibold">35%</p>
          </div>
        </div>
        <ProgressBar value={24} />
      </SoftCard>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-950">Open Positions</h3>
          <p className="text-sm text-zinc-500">View all</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {positions.map((p) => (
            <div key={p.symbol} className="min-w-[150px] rounded-[24px] bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">{p.symbol.replace("USDT", "")}</p>
              <p className={`mt-3 text-xl font-semibold ${p.pnl.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{p.pnl}</p>
              <p className="text-xs text-zinc-400">Score {p.score}</p>
            </div>
          ))}
        </div>
      </div>

      <SoftCard>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-orange-50 p-3 text-[#FF6B35]"><RotateCw size={22} /></div>
          <div className="flex-1">
            <p className="text-sm text-zinc-500">Latest Rotation Check</p>
            <p className="font-semibold">ADAUSDT can replace XRPUSDT</p>
          </div>
          <ChevronRight size={20} className="text-zinc-400" />
        </div>
      </SoftCard>
    </div>
  );
}

function SignalsScreen() {
  return (
    <div className="space-y-4 px-5 pb-28">
      <SoftCard>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-semibold">20</p><p className="text-xs text-zinc-500">Watching</p></div>
          <div><p className="text-2xl font-semibold">8</p><p className="text-xs text-zinc-500">Eligible</p></div>
          <div><p className="text-2xl font-semibold">4</p><p className="text-xs text-zinc-500">Above 0.4</p></div>
        </div>
      </SoftCard>

      <SoftCard className="border border-orange-100 bg-orange-50/70">
        <p className="text-sm text-zinc-500">Strongest Candidate</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold">ADAUSDT</p>
            <p className="text-sm text-zinc-500">LONG · Rank #1</p>
          </div>
          <p className="text-3xl font-semibold text-[#FF6B35]">0.89</p>
        </div>
      </SoftCard>

      {signals.map((s) => (
        <SoftCard key={s.symbol}>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-xl font-semibold">{s.symbol}</p>
              <p className={`text-sm font-medium ${s.side === "LONG" ? "text-emerald-600" : "text-red-500"}`}>{s.side}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-right">
              <p className="text-xs text-zinc-400">Score</p>
              <p className="font-semibold">{s.score}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-zinc-50 p-3"><p className="text-zinc-400">Supertrend</p><p className="font-semibold">{s.st}</p></div>
            <div className="rounded-2xl bg-zinc-50 p-3"><p className="text-zinc-400">Momentum</p><p className="font-semibold">{s.mom}</p></div>
            <div className="rounded-2xl bg-zinc-50 p-3"><p className="text-zinc-400">RSI</p><p className="font-semibold">{s.rsi}</p></div>
          </div>
        </SoftCard>
      ))}
    </div>
  );
}

function TradesScreen() {
  return (
    <div className="space-y-4 px-5 pb-28">
      {positions.map((p) => (
        <SoftCard key={p.symbol}>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-xl font-semibold">{p.symbol}</p>
              <p className={`text-sm font-medium ${p.side === "LONG" ? "text-emerald-600" : "text-red-500"}`}>{p.side}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-semibold ${p.pnl.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{p.pnl}</p>
              <p className="text-sm text-zinc-400">{p.pnlPct}</p>
            </div>
          </div>
          <div className="mb-3 flex justify-between text-sm text-zinc-500">
            <span>TP Progress</span>
            <span>{p.progress}%</span>
          </div>
          <ProgressBar value={p.progress} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-zinc-50 p-3"><p className="text-zinc-400">Held</p><p className="font-semibold">{p.held} bars</p></div>
            <div className="rounded-2xl bg-zinc-50 p-3"><p className="text-zinc-400">Stop</p><p className="font-semibold">{p.stop}</p></div>
            <div className="rounded-2xl bg-zinc-50 p-3"><p className="text-zinc-400">Peak</p><p className="font-semibold">{p.peak}</p></div>
          </div>
        </SoftCard>
      ))}
    </div>
  );
}

function ProfileScreen() {
  return (
    <div className="space-y-4 px-5 pb-28">
      <SoftCard className="bg-gradient-to-br from-white to-orange-50">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6B35] text-xl font-bold text-white">DM</div>
          <div className="flex-1">
            <p className="text-xl font-semibold">David Mochama</p>
            <p className="text-sm text-zinc-500">SENTRY Pro · 2 exchanges connected</p>
          </div>
          <Settings size={22} className="text-zinc-500" />
        </div>
      </SoftCard>

      <SoftCard>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-2xl font-semibold">64%</p><p className="text-sm text-zinc-500">Win Rate</p></div>
          <div><p className="text-2xl font-semibold">2.3</p><p className="text-sm text-zinc-500">Profit Factor</p></div>
          <div><p className="text-2xl font-semibold">142</p><p className="text-sm text-zinc-500">Trades</p></div>
          <div><p className="text-2xl font-semibold text-emerald-600">+$32.40</p><p className="text-sm text-zinc-500">Net PnL</p></div>
        </div>
      </SoftCard>

      <div className="space-y-3">
        {settingsGroups.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-sm">
              <div className="rounded-2xl bg-zinc-50 p-3 text-[#FF6B35]"><Icon size={22} /></div>
              <div className="flex-1">
                <p className="font-semibold text-zinc-950">{item.title}</p>
                <p className="text-sm text-zinc-500">{item.subtitle}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400">{item.status}</p>
                <ChevronRight size={18} className="ml-auto mt-1 text-zinc-400" />
              </div>
            </div>
          );
        })}
      </div>

      <SoftCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Connected Exchanges</p>
            <p className="text-sm text-zinc-500">API trading access</p>
          </div>
          <Button className="rounded-full bg-[#FF6B35] hover:bg-[#f05f2d]">Add</Button>
        </div>
        <div className="space-y-3">
          {["Bybit", "Binance"].map((exchange) => (
            <div key={exchange} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3">
              <div className="flex items-center gap-2"><KeyRound size={16} /><span className="font-medium">{exchange}</span></div>
              <div className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={16} /> Connected</div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl bg-red-50 p-3">
            <div className="flex items-center gap-2"><AlertTriangle size={16} /><span className="font-medium">Withdraw Permission</span></div>
            <span className="text-sm font-medium text-red-500">Disabled</span>
          </div>
        </div>
      </SoftCard>
    </div>
  );
}

function ControlMenu({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            className="fixed bottom-28 left-5 right-5 z-40 rounded-[32px] bg-white p-4 shadow-2xl"
          >
            <div className="mb-3 px-2">
              <p className="text-sm text-zinc-500">Operator Console</p>
              <h3 className="text-xl font-semibold">Rotator Controls</h3>
            </div>
            <div className="grid gap-3">
              <Button className="h-14 justify-start gap-3 rounded-2xl bg-[#FF6B35] text-base hover:bg-[#f05f2d]"><Power size={20} /> Start Rotator</Button>
              <Button variant="secondary" className="h-14 justify-start gap-3 rounded-2xl text-base"><Pause size={20} /> Pause Rotator</Button>
              <Button variant="secondary" className="h-14 justify-start gap-3 rounded-2xl text-base"><RefreshCcw size={20} /> Force Rebalance</Button>
              <Button variant="destructive" className="h-14 justify-start gap-3 rounded-2xl text-base"><ShieldAlert size={20} /> Emergency Exit All</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FloatingNav({ tab, setTab, openControls }) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "signals", icon: Radio, label: "Signals" },
    { id: "trades", icon: BarChart3, label: "Trades" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-5">
      <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/85 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <button onClick={() => setTab("home")} className={`flex h-12 w-12 items-center justify-center rounded-full ${tab === "home" ? "bg-[#FF6B35] text-white" : "text-zinc-500"}`}><Home size={21} /></button>
        <button onClick={() => setTab("signals")} className={`flex h-12 w-12 items-center justify-center rounded-full ${tab === "signals" ? "bg-[#FF6B35] text-white" : "text-zinc-500"}`}><Radio size={21} /></button>
        <button onClick={openControls} className="mx-1 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg"><Plus size={24} /></button>
        <button onClick={() => setTab("trades")} className={`flex h-12 w-12 items-center justify-center rounded-full ${tab === "trades" ? "bg-[#FF6B35] text-white" : "text-zinc-500"}`}><BarChart3 size={21} /></button>
        <button onClick={() => setTab("profile")} className={`flex h-12 w-12 items-center justify-center rounded-full ${tab === "profile" ? "bg-[#FF6B35] text-white" : "text-zinc-500"}`}><User size={21} /></button>
      </div>
    </div>
  );
}

export default function SentryMobileAppPrototype() {
  const [tab, setTab] = useState("home");
  const [controlsOpen, setControlsOpen] = useState(false);

  const screen = useMemo(() => {
    switch (tab) {
      case "signals":
        return <><Header title="Signals" subtitle="Market scanner" /><SignalsScreen /></>;
      case "trades":
        return <><Header title="Trades" subtitle="Active positions" /><TradesScreen /></>;
      case "profile":
        return <><Header title="Profile" subtitle="Account & settings" /><ProfileScreen /></>;
      default:
        return <><Header title="SENTRY" subtitle="Portfolio rotator" /><HomeScreen /></>;
    }
  }, [tab]);

  return (
    <div className={`min-h-screen ${COLORS.bg} font-sans text-zinc-950`}>
      <div className="mx-auto min-h-screen max-w-md overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
      <ControlMenu open={controlsOpen} onClose={() => setControlsOpen(false)} />
      <FloatingNav tab={tab} setTab={setTab} openControls={() => setControlsOpen(true)} />
    </div>
  );
}

