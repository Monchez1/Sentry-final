import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, ShieldCheck, Save, Loader2 } from "lucide-react";

import api from "../services/api";
import useRiskSettings from "../hooks/useRiskSettings";

function Field({ label, description, value, type = "number", step, onChange }) {
  return (
    <label className="block" style={{ marginBottom: 14 }}>
      <span style={{ display:"block", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", color:"var(--text-secondary)", marginBottom:4 }}>
        {label}
      </span>
      {description && (
        <span style={{ display:"block", fontSize:11, color:"var(--text-muted)", marginBottom:6 }}>
          {description}
        </span>
      )}
      <input
        type={type}
        step={step}
        value={value ?? ""}
        onChange={onChange}
        className="input"
      />
    </label>
  );
}

export default function RiskSettingsScreen() {
  const { settings, refresh } = useRiskSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) {
    return (
      <div>
        <div className="page-header">
          <div className="stat-label">Safety Rules</div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Risk Management</h1>
        </div>
        <div className="content">
          <div className="card fade-up">
            <div className="skeleton" style={{ height:60, width:"100%" }} />
          </div>
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/risk-settings/", {
        max_daily_drawdown: Number(form.max_daily_drawdown),
        max_open_risk: Number(form.max_open_risk),
        max_consecutive_losses: Number(form.max_consecutive_losses),
        emergency_stop_pct: Number(form.emergency_stop_pct),
        circuit_breaker_enabled: Boolean(form.circuit_breaker_enabled),
        circuit_breaker_cooldown_scans: Number(form.circuit_breaker_cooldown_scans),
      });

      toast.success("Risk settings saved");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save risk settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
              Account Protection
            </div>
            <h1 style={{ fontSize:22, fontWeight:800 }}>Risk Settings</h1>
          </div>
          <button className="btn btn-primary" style={{ padding:"10px 16px", borderRadius:12, fontSize:13 }} onClick={save} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="content">
        <div className="card fade-up" style={{ display:"flex", alignItems:"center", gap:14, background: form.circuit_breaker_enabled ? "var(--green-soft)" : "var(--accent-soft)", border:`1.5px solid ${form.circuit_breaker_enabled ? "var(--green)" : "var(--accent)"}33` }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {form.circuit_breaker_enabled ? <ShieldCheck size={20} color="var(--green)" /> : <ShieldAlert size={20} color="var(--accent)" />}
          </div>
          <div>
            <div className="stat-label" style={{ color: form.circuit_breaker_enabled ? "var(--green)" : "var(--accent)" }}>Protection Status</div>
            <div style={{ fontSize:16, fontWeight:800 }}>
              {form.circuit_breaker_enabled ? "Circuit Breakers Active" : "Breakers Disabled"}
            </div>
          </div>
        </div>

        <div className="card fade-up" style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div className="section-title">Drawdown & Loss Limits</div>

          <Field
            label="Max Daily Drawdown"
            description="Maximum daily account loss before stopping trading"
            step="0.01"
            value={form.max_daily_drawdown}
            onChange={(e) =>
              setForm({ ...form, max_daily_drawdown: e.target.value })
            }
          />

          <Field
            label="Max Open Risk"
            description="Maximum combined risk across all open positions"
            step="0.01"
            value={form.max_open_risk}
            onChange={(e) =>
              setForm({ ...form, max_open_risk: e.target.value })
            }
          />

          <Field
            label="Max Consecutive Losses"
            description="Number of losses allowed before pausing the bot"
            value={form.max_consecutive_losses}
            onChange={(e) =>
              setForm({ ...form, max_consecutive_losses: e.target.value })
            }
          />

          <Field
            label="Emergency Stop %"
            description="Portfolio drawdown level that forces emergency shutdown"
            step="0.01"
            value={form.emergency_stop_pct}
            onChange={(e) =>
              setForm({ ...form, emergency_stop_pct: e.target.value })
            }
          />

          <Field
            label="Circuit Breaker Cooldown (Minutes)"
            description="Number of minutes to stop trading after circuit breaker triggers"
            value={form.circuit_breaker_cooldown_scans}
            onChange={(e) =>
              setForm({ ...form, circuit_breaker_cooldown_scans: e.target.value })
            }
          />

          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 0", marginTop:6 }}>
            <div
              onClick={() => setForm({ ...form, circuit_breaker_enabled: !form.circuit_breaker_enabled })}
              style={{
                width:40, height:22, borderRadius:11,
                background: form.circuit_breaker_enabled ? "var(--accent)" : "var(--bg-elevated)",
                border: `1px solid ${form.circuit_breaker_enabled ? "var(--accent)" : "var(--border)"}`,
                position:"relative", transition:"all 0.2s", flexShrink:0,
              }}
            >
              <div style={{
                width:16, height:16, borderRadius:"50%", background:"#fff",
                position:"absolute", top:2, left: form.circuit_breaker_enabled ? 20 : 2,
                transition:"left 0.2s",
              }} />
            </div>
            <div>
              <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600, display:"block" }}>Circuit Breakers</span>
              <span style={{ fontSize:11, color:"var(--text-muted)", display:"block", marginTop:2 }}>Halt all setups when daily triggers or loss targets are met.</span>
            </div>
          </label>
        </div>

        <button
          className="btn btn-primary btn-full fade-up"
          onClick={save}
          disabled={saving}
          style={{ padding:"16px", borderRadius:16 }}
        >
          {saving ? "Saving settings..." : "Save Risk Settings"}
        </button>
      </div>
    </div>
  );
}
