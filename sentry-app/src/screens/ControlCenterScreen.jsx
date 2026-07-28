import { useState } from "react";
import { Play, Pause, RefreshCw, RotateCcw, LogOut, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const ACTIONS = [
  {
    id: "start",
    label: "Start Rotator",
    sub: "Begin the trading engine",
    endpoint: "/rotator/start",
    icon: Play,
    variant: "success",
  },
  {
    id: "pause",
    label: "Pause Rotator",
    sub: "Halt new trade entries",
    endpoint: "/rotator/pause",
    icon: Pause,
    variant: "accent",
  },
  {
    id: "rebalance",
    label: "Force Rebalance",
    sub: "Redistribute allocations now",
    endpoint: "/rotator/rebalance",
    icon: RefreshCw,
    variant: "blue",
  },
  {
    id: "reset",
    label: "Reset Paper Balance",
    sub: "Restore paper trading capital",
    endpoint: "/rotator/reset-balance",
    icon: RotateCcw,
    variant: "secondary",
  },
  {
    id: "exit",
    label: "Exit All Positions",
    sub: "Close every open trade immediately",
    endpoint: "/rotator/exit-all",
    icon: LogOut,
    variant: "danger",
  },
];

const VARIANT_STYLES = {
  success:   { bg:"var(--green-soft)",  color:"var(--green)", border:"rgba(16,185,129,0.2)" },
  accent:    { bg:"var(--accent-soft)", color:"var(--accent)", border:"rgba(217,119,6,0.2)" },
  blue:      { bg:"var(--blue-soft)",   color:"var(--blue)",  border:"rgba(99,102,241,0.2)" },
  secondary: { bg:"var(--bg-elevated)", color:"var(--text-primary)", border:"var(--border)" },
  danger:    { bg:"var(--red-soft)",    color:"var(--red)",   border:"rgba(239,68,68,0.2)" },
};

export default function ControlCenterScreen() {
  const [loading, setLoading] = useState({});

  const call = async (action) => {
    setLoading(l => ({ ...l, [action.id]: true }));
    try {
      await api.post(action.endpoint);
      toast.success(`${action.label} — done`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Action failed");
    } finally {
      setLoading(l => ({ ...l, [action.id]: false }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
          Bot Controls
        </div>
        <h1 style={{ fontSize:22, fontWeight:800 }}>Control Center</h1>
      </div>

      <div className="content">
        <div className="card fade-up" style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.5 }}>
          These commands are sent directly to the live rotator engine. Destructive actions like <strong style={{ color:"var(--red)" }}>Exit All Positions</strong> take effect immediately.
        </div>

        {ACTIONS.map((action) => {
          const s    = VARIANT_STYLES[action.variant];
          const Icon = action.icon;
          const busy = loading[action.id];
          return (
            <button
              key={action.id}
              className="card fade-up"
              onClick={() => call(action)}
              disabled={busy}
              style={{
                width:"100%", textAlign:"left", cursor:"pointer",
                display:"flex", alignItems:"center", gap:16,
                border:`1px solid ${s.border}`,
                background: s.bg,
                opacity: busy ? 0.7 : 1,
                transition:"all 0.18s",
              }}
            >
              <div style={{
                width:44, height:44, borderRadius:14, flexShrink:0,
                background:"rgba(0,0,0,0.15)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {busy
                  ? <Loader2 size={20} color={s.color} className="spin" />
                  : <Icon size={20} color={s.color} />}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15, color: s.color }}>{action.label}</div>
                <div style={{ fontSize:12, color:"var(--text-secondary)", marginTop:2 }}>{action.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
