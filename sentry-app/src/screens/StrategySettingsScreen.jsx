import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, ChevronDown, ChevronUp } from "lucide-react";

import api from "../services/api";
import useStrategySettings from "../hooks/useStrategySettings";

function Field({ label, value, type = "number", step, onChange, sub }) {
  return (
    <label className="block" style={{ marginBottom: 14 }}>
      <span style={{ display:"block", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", color:"var(--text-secondary)", marginBottom:6 }}>
        {label}
      </span>
      <input
        type={type}
        step={step}
        value={value ?? ""}
        onChange={onChange}
        className="input"
      />
      {sub && <span style={{ display:"block", fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{sub}</span>}
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block" style={{ marginBottom: 14 }}>
      <span style={{ display:"block", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", color:"var(--text-secondary)", marginBottom:6 }}>
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={onChange}
        className="input"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const PRESETS = {
  conservative: {
    profile: "conservative",
    timeframe: "15m",
    leverage: 3,
    alloc_ratio: 0.10,
    atr_sl_mult: 8.0,
    use_ema_filter: true,
    use_telescoping_leverage: false,
    max_positions: 2,
    risk_per_trade: 0.01,
    rotation_threshold: 0.25,
    stop_loss_pct: 0.02,
    take_profit_rr: 4.0,
    cooldown_scans: 5,
    min_hold: 12,
    score_set: "balanced_mom",
    auto_rotation: true,
    entry_thr: 0.5,
    use_perf_multipliers: false,
    use_ml_filter: false,
    ml_prob_thr: 0.55,
    custom_w_rsi: 0.10,
    custom_w_st: 0.60,
    custom_w_mom: 0.30,
    st_period: 10,
    st_mult: 3.0,
    ema_trend_period: 100,
  },
  balanced: {
    profile: "balanced",
    timeframe: "15m",
    leverage: 5,
    alloc_ratio: 0.20,
    atr_sl_mult: 8.0,
    use_ema_filter: true,
    use_telescoping_leverage: false,
    max_positions: 4,
    risk_per_trade: 0.02,
    rotation_threshold: 0.25,
    stop_loss_pct: 0.015,
    take_profit_rr: 4.0,
    cooldown_scans: 5,
    min_hold: 12,
    score_set: "balanced_mom",
    auto_rotation: true,
    entry_thr: 0.4,
    use_perf_multipliers: false,
    use_ml_filter: false,
    ml_prob_thr: 0.55,
    custom_w_rsi: 0.10,
    custom_w_st: 0.60,
    custom_w_mom: 0.30,
    st_period: 10,
    st_mult: 3.0,
    ema_trend_period: 100,
  },
  hyper: {
    profile: "hyper",
    timeframe: "15m",
    leverage: 10,
    alloc_ratio: 0.33,
    atr_sl_mult: 8.0,
    use_ema_filter: true,
    use_telescoping_leverage: true,
    max_positions: 4,
    risk_per_trade: 0.02,
    rotation_threshold: 0.25,
    stop_loss_pct: 0.015,
    take_profit_rr: 4.0,
    cooldown_scans: 1,
    min_hold: 12,
    score_set: "balanced_mom",
    auto_rotation: true,
    entry_thr: 0.4,
    use_perf_multipliers: false,
    use_ml_filter: false,
    ml_prob_thr: 0.55,
    custom_w_rsi: 0.10,
    custom_w_st: 0.60,
    custom_w_mom: 0.30,
    st_period: 10,
    st_mult: 3.0,
    ema_trend_period: 100,
  },
  scalper: {
    profile: "scalper",
    timeframe: "5m",
    leverage: 10,
    alloc_ratio: 0.33,
    atr_sl_mult: 2.0,
    use_ema_filter: true,
    use_telescoping_leverage: true,
    max_positions: 4,
    risk_per_trade: 0.02,
    rotation_threshold: 0.25,
    stop_loss_pct: 0.015,
    take_profit_rr: 1.5,
    cooldown_scans: 1,
    min_hold: 4,
    score_set: "balanced_mom",
    auto_rotation: true,
    entry_thr: 0.35,
    use_perf_multipliers: false,
    use_ml_filter: false,
    ml_prob_thr: 0.55,
    custom_w_rsi: 0.10,
    custom_w_st: 0.60,
    custom_w_mom: 0.30,
    st_period: 10,
    st_mult: 3.0,
    ema_trend_period: 100,
  }
};

export default function StrategySettingsScreen() {
  const { settings, refresh } = useStrategySettings();
  const [form, setForm] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      // Ensure defaults for database rows that might have NULL values
      setForm({
        ...settings,
        custom_w_rsi: settings.custom_w_rsi ?? 0.10,
        custom_w_st: settings.custom_w_st ?? 0.60,
        custom_w_mom: settings.custom_w_mom ?? 0.30,
        st_period: settings.st_period ?? 10,
        st_mult: settings.st_mult ?? 3.0,
        ema_trend_period: settings.ema_trend_period ?? 100,
      });
    }
  }, [settings]);

  if (!form) {
    return (
      <div>
        <div className="page-header">
          <div className="stat-label">Strategy Configuration</div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>Strategy Settings</h1>
        </div>
        <div className="content">
          <div className="card fade-up">
            <div className="skeleton" style={{ height:60, width:"100%" }} />
          </div>
        </div>
      </div>
    );
  }

  const applyPreset = (presetKey) => {
    const presetValues = PRESETS[presetKey];
    setForm({
      ...form,
      ...presetValues,
      paper_trading: form.paper_trading !== undefined ? form.paper_trading : true,
      paper_start_balance: form.paper_start_balance !== undefined ? form.paper_start_balance : 10.0
    });
    toast.success(`Applied ${presetKey} preset`);
  };

  const handleFieldChange = (field, value) => {
    setForm({
      ...form,
      [field]: value,
      profile: "custom"
    });
  };

  const save = async () => {
    if (form.score_set === "custom") {
      const sum = Number(form.custom_w_rsi) + Number(form.custom_w_st) + Number(form.custom_w_mom);
      if (Math.abs(sum - 1.0) > 0.01) {
        toast.error(`Composite weights must sum to exactly 1.0 (Current: ${sum.toFixed(2)})`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.post("/strategy-settings/", {
        max_positions: Number(form.max_positions),
        risk_per_trade: Number(form.risk_per_trade),
        leverage: Number(form.leverage),
        rotation_threshold: Number(form.rotation_threshold),
        stop_loss_pct: Number(form.stop_loss_pct),
        take_profit_rr: Number(form.take_profit_rr),
        auto_rotation: Boolean(form.auto_rotation),
        cooldown_scans: Number(form.cooldown_scans),
        timeframe: form.timeframe || "15m",
        atr_sl_mult: Number(form.atr_sl_mult || 8.0),
        entry_thr: Number(form.entry_thr || 0.4),
        min_hold: Number(form.min_hold || 12),
        score_set: form.score_set || "balanced_mom",
        use_ema_filter: Boolean(form.use_ema_filter),
        alloc_ratio: Number(form.alloc_ratio || 0.25),
        use_telescoping_leverage: Boolean(form.use_telescoping_leverage),
        profile: form.profile || "balanced",
        use_perf_multipliers: Boolean(form.use_perf_multipliers),
        paper_trading: form.paper_trading !== undefined ? Boolean(form.paper_trading) : true,
        paper_start_balance: Number(form.paper_start_balance !== undefined ? form.paper_start_balance : 10.0),
        use_ml_filter: Boolean(form.use_ml_filter),
        ml_prob_thr: Number(form.ml_prob_thr !== undefined ? form.ml_prob_thr : 0.55),
        custom_w_rsi: Number(form.custom_w_rsi),
        custom_w_st: Number(form.custom_w_st),
        custom_w_mom: Number(form.custom_w_mom),
        st_period: Number(form.st_period),
        st_mult: Number(form.st_mult),
        ema_trend_period: Number(form.ema_trend_period),
      });

      toast.success("Strategy settings saved");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
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
              Sentry Engine
            </div>
            <h1 style={{ fontSize:22, fontWeight:800 }}>Strategy</h1>
          </div>
          <button className="btn btn-primary" style={{ padding:"10px 16px", borderRadius:12, fontSize:13 }} onClick={save} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="content">
        {/* Presets Card */}
        <div className="card fade-up">
          <div className="section-title">Risk Profiles</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { key: "conservative", title: "🛡️ Conservative", desc: "Safe, slow growth. Tighter stops, 3x leverage, and lower trade sizing (10% allocation) to preserve capital." },
              { key: "balanced",     title: "⚖️ Balanced",     desc: "Steady growth. Optimized settings with 5x leverage and 20% trade sizing. Balanced momentum tracking." },
              { key: "hyper",        title: "🚀 Hyper-Compounding", desc: "Aggressive model. High velocity using 15m candles, 33% trade sizing, and telescoping leverage." },
              { key: "scalper",      title: "⚡ Scalper",      desc: "High-frequency setups. Trades on 5m charts with tight 2.0 ATR stops and fast 1.5 TP targets." }
            ].map(preset => {
              const active = form.profile === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset.key)}
                  style={{
                    textAlign:"left", padding:"12px 14px", borderRadius:14,
                    background: active ? "var(--accent-soft)" : "var(--bg-elevated)",
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    cursor:"pointer", transition:"all 0.15s",
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:700, fontSize:14, color: active ? "var(--accent)" : "var(--text-primary)" }}>{preset.title}</span>
                    {active && <span className="badge badge-accent" style={{ fontSize:9 }}>Active</span>}
                  </div>
                  <p style={{ fontSize:11, color:"var(--text-secondary)", marginTop:4, lineHeight:1.3 }}>{preset.desc}</p>
                </button>
              );
            })}

            {form.profile === "custom" && (
              <div style={{ padding:"12px 14px", borderRadius:14, background:"var(--bg-elevated)", border:"1.5px solid var(--border)", display:"flex", flexDirection:"column", gap:4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>🔧 Custom Settings</span>
                  <span className="badge badge-muted" style={{ fontSize:9 }}>Active</span>
                </div>
                <p style={{ fontSize:11, color:"var(--text-secondary)", lineHeight:1.3 }}>You have customized settings using the fields below.</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Advanced */}
        <button
          className="btn btn-secondary btn-full fade-up"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ padding:"14px", borderRadius:16, fontSize:13 }}
        >
          {showAdvanced ? "Hide Advanced Settings" : "Configure Custom Parameters"}
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="fade-up" style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {/* Group 1: Rotator Sizing & Execution */}
            <div className="card">
              <div className="section-title">Rotator Sizing & Execution</div>
              <Field
                label="Max Positions"
                value={form.max_positions}
                onChange={(e) => handleFieldChange("max_positions", e.target.value)}
              />
              <Field
                label="Risk Per Trade"
                step="0.01"
                value={form.risk_per_trade}
                onChange={(e) => handleFieldChange("risk_per_trade", e.target.value)}
              />
              <Field
                label="Rotation Threshold"
                step="0.01"
                value={form.rotation_threshold}
                onChange={(e) => handleFieldChange("rotation_threshold", e.target.value)}
              />
              <Field
                label="Stop Loss %"
                step="0.001"
                value={form.stop_loss_pct}
                onChange={(e) => handleFieldChange("stop_loss_pct", e.target.value)}
              />
              <Field
                label="Take Profit Risk-Reward (RR)"
                step="0.1"
                value={form.take_profit_rr}
                onChange={(e) => handleFieldChange("take_profit_rr", e.target.value)}
              />
              <Field
                label="Stop-Loss Cooldown (Scans)"
                value={form.cooldown_scans}
                onChange={(e) => handleFieldChange("cooldown_scans", e.target.value)}
              />

              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 0" }}>
                <div
                  onClick={() => handleFieldChange("auto_rotation", !form.auto_rotation)}
                  style={{
                    width:40, height:22, borderRadius:11,
                    background: form.auto_rotation ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${form.auto_rotation ? "var(--accent)" : "var(--border)"}`,
                    position:"relative", transition:"all 0.2s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:2, left: form.auto_rotation ? 20 : 2,
                    transition:"left 0.2s",
                  }} />
                </div>
                <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600 }}>Auto Rotation</span>
              </label>
            </div>

            {/* Group 2: Strategy Settings */}
            <div className="card">
              <div className="section-title">Strategy & Signals</div>
              <SelectField
                label="Timeframe"
                value={form.timeframe || "15m"}
                options={[
                  { label: "1m", value: "1m" },
                  { label: "5m", value: "5m" },
                  { label: "15m", value: "15m" },
                  { label: "1h", value: "1h" },
                  { label: "4h", value: "4h" },
                ]}
                onChange={(e) => handleFieldChange("timeframe", e.target.value)}
              />
              <SelectField
                label="Strategy Weight Set"
                value={form.score_set || "balanced_mom"}
                options={[
                  { label: "Balanced Momentum", value: "balanced_mom" },
                  { label: "Standard Trend", value: "standard_trend" },
                  { label: "🔧 Custom Weights Set (Specify below)", value: "custom" },
                ]}
                onChange={(e) => handleFieldChange("score_set", e.target.value)}
              />

              {form.score_set === "custom" && (
                <div style={{ padding:"12px 14px", borderRadius:12, background:"var(--bg-elevated)", border:"1px solid var(--border)", marginBottom:14, display:"flex", flexDirection:"column", gap:6 }}>
                  <div className="stat-label">Composite Strategy Weights</div>
                  <Field
                    label="RSI Weight"
                    step="0.05"
                    value={form.custom_w_rsi}
                    onChange={(e) => handleFieldChange("custom_w_rsi", e.target.value)}
                    sub="Weight of the Mean Reversion component"
                  />
                  <Field
                    label="Supertrend Weight"
                    step="0.05"
                    value={form.custom_w_st}
                    onChange={(e) => handleFieldChange("custom_w_st", e.target.value)}
                    sub="Weight of the Trend Following component"
                  />
                  <Field
                    label="Momentum Weight"
                    step="0.05"
                    value={form.custom_w_mom}
                    onChange={(e) => handleFieldChange("custom_w_mom", e.target.value)}
                    sub="Weight of the Momentum filter component"
                  />
                </div>
              )}

              <Field
                label="ATR Stop Multiplier"
                step="0.1"
                value={form.atr_sl_mult}
                onChange={(e) => handleFieldChange("atr_sl_mult", e.target.value)}
              />
              <Field
                label="Entry Score Threshold"
                step="0.05"
                value={form.entry_thr}
                onChange={(e) => handleFieldChange("entry_thr", e.target.value)}
              />
              <Field
                label="Minimum Hold Bars"
                value={form.min_hold}
                onChange={(e) => handleFieldChange("min_hold", e.target.value)}
              />

              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 0" }}>
                <div
                  onClick={() => handleFieldChange("use_ema_filter", !form.use_ema_filter)}
                  style={{
                    width:40, height:22, borderRadius:11,
                    background: form.use_ema_filter ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${form.use_ema_filter ? "var(--accent)" : "var(--border)"}`,
                    position:"relative", transition:"all 0.2s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:2, left: form.use_ema_filter ? 20 : 2,
                    transition:"left 0.2s",
                  }} />
                </div>
                <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600 }}>Use EMA Trend Filter</span>
              </label>

              {form.use_ema_filter && (
                <div style={{ marginTop:10 }}>
                  <Field
                    label="EMA Trend Filter Period"
                    value={form.ema_trend_period}
                    onChange={(e) => handleFieldChange("ema_trend_period", e.target.value)}
                  />
                </div>
              )}

              {/* Custom Supertrend Config */}
              <div style={{ padding:"12px 14px", borderRadius:12, background:"var(--bg-elevated)", border:"1px solid var(--border)", marginTop:12 }}>
                <div className="stat-label">Supertrend Parameters</div>
                <Field
                  label="Supertrend Period"
                  value={form.st_period}
                  onChange={(e) => handleFieldChange("st_period", e.target.value)}
                />
                <Field
                  label="Supertrend Multiplier"
                  step="0.1"
                  value={form.st_mult}
                  onChange={(e) => handleFieldChange("st_mult", e.target.value)}
                />
              </div>

              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 0", marginTop:12 }}>
                <div
                  onClick={() => handleFieldChange("use_perf_multipliers", !form.use_perf_multipliers)}
                  style={{
                    width:40, height:22, borderRadius:11,
                    background: form.use_perf_multipliers ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${form.use_perf_multipliers ? "var(--accent)" : "var(--border)"}`,
                    position:"relative", transition:"all 0.2s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:2, left: form.use_perf_multipliers ? 20 : 2,
                    transition:"left 0.2s",
                  }} />
                </div>
                <div>
                  <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600, display:"block" }}>Enable Performance Multipliers</span>
                  <span style={{ fontSize:11, color:"var(--text-muted)", display:"block", marginTop:2 }}>Scales asset scores dynamically based on recent winning or losing streaks.</span>
                </div>
              </label>
            </div>

            {/* Group 3: Leverage & Allocations */}
            <div className="card">
              <div className="section-title">Leverage & Compounding</div>
              <Field
                label="Base Leverage"
                value={form.leverage}
                onChange={(e) => handleFieldChange("leverage", e.target.value)}
              />
              <Field
                label="Starting Balance (USDT)"
                value={form.paper_start_balance}
                onChange={(e) => handleFieldChange("paper_start_balance", e.target.value)}
              />
              <Field
                label="Compounding Allocation Ratio"
                step="0.01"
                value={form.alloc_ratio}
                onChange={(e) => handleFieldChange("alloc_ratio", e.target.value)}
              />

              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 0" }}>
                <div
                  onClick={() => handleFieldChange("use_telescoping_leverage", !form.use_telescoping_leverage)}
                  style={{
                    width:40, height:22, borderRadius:11,
                    background: form.use_telescoping_leverage ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${form.use_telescoping_leverage ? "var(--accent)" : "var(--border)"}`,
                    position:"relative", transition:"all 0.2s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:2, left: form.use_telescoping_leverage ? 20 : 2,
                    transition:"left 0.2s",
                  }} />
                </div>
                <div>
                  <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600, display:"block" }}>Use Telescoping Leverage</span>
                  <span style={{ fontSize:11, color:"var(--text-muted)", display:"block", marginTop:2 }}>Auto scales: 20x (&lt;$50) &rarr; 10x (&lt;$500) &rarr; 3x (&ge;$500).</span>
                </div>
              </label>
            </div>

            {/* Group 4: Machine Learning Filter */}
            <div className="card">
              <div className="section-title">Machine Learning Filter</div>
              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 0" }}>
                <div
                  onClick={() => handleFieldChange("use_ml_filter", !form.use_ml_filter)}
                  style={{
                    width:40, height:22, borderRadius:11,
                    background: form.use_ml_filter ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${form.use_ml_filter ? "var(--accent)" : "var(--border)"}`,
                    position:"relative", transition:"all 0.2s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:2, left: form.use_ml_filter ? 20 : 2,
                    transition:"left 0.2s",
                  }} />
                </div>
                <div>
                  <span style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600, display:"block" }}>Enable ML Signal Filter</span>
                  <span style={{ fontSize:11, color:"var(--text-muted)", display:"block", marginTop:2 }}>Filters out false breakout trade candidates using a trained Random Forest model.</span>
                </div>
              </label>

              {form.use_ml_filter && (
                <div style={{ marginTop:12 }}>
                  <Field
                    label="ML Success Probability Threshold"
                    step="0.01"
                    value={form.ml_prob_thr}
                    onChange={(e) => handleFieldChange("ml_prob_thr", e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-full fade-up"
          onClick={save}
          disabled={saving}
          style={{ padding:"16px", borderRadius:16 }}
        >
          {saving ? "Saving Changes..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
