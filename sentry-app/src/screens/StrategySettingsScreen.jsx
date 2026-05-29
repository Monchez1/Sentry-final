import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import api from "../services/api";
import useStrategySettings from "../hooks/useStrategySettings";

function Field({ label, value, type = "number", step, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-600">
        {label}
      </span>

      <input
        type={type}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl bg-zinc-50 p-4 outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-600">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl bg-zinc-50 p-4 outline-none focus:ring-2 focus:ring-[#FF6B35]/30 font-semibold text-zinc-800"
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
  }
};

export default function StrategySettingsScreen() {
  const { settings, refresh } = useStrategySettings();
  const [form, setForm] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) {
    return <div className="p-5">Loading...</div>;
  }

  const applyPreset = (presetKey) => {
    const presetValues = PRESETS[presetKey];
    setForm({
      ...form,
      ...presetValues,
      paper_trading: form.paper_trading !== undefined ? form.paper_trading : true,
      paper_start_balance: form.paper_start_balance !== undefined ? form.paper_start_balance : 10.0
    });
  };

  const handleFieldChange = (field, value) => {
    setForm({
      ...form,
      [field]: value,
      profile: "custom"
    });
  };

  const save = async () => {
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
      });

      toast.success("Strategy settings saved");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="p-5 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-800">Strategy Settings</h1>
        <p className="mt-2 text-zinc-500 text-sm">Configure SENTRY's rotation, execution, and risk compounding behavior.</p>
      </div>

      {/* Risk Presets Section */}
      <div className="space-y-4 rounded-[28px] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-800">Select Risk Profile</h2>
        <p className="text-zinc-500 text-xs">Choose a pre-configured risk template suitable for your knowledge level.</p>

        <div className="grid grid-cols-1 gap-3 mt-3">
          {/* Conservative Card */}
          <button
            onClick={() => applyPreset("conservative")}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              form.profile === "conservative"
                ? "border-[#FF6B35] bg-[#FF6B35]/5"
                : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/50"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                🛡️ Conservative
              </span>
              {form.profile === "conservative" && (
                <span className="text-xs bg-[#FF6B35] text-white px-2 py-0.5 rounded-full font-semibold">Active</span>
              )}
            </div>
            <p className="text-zinc-500 text-xs mt-1">Safe, slow growth. Tighter stops, 3x leverage, and lower trade sizing (10% allocation) to preserve capital.</p>
          </button>

          {/* Balanced Card */}
          <button
            onClick={() => applyPreset("balanced")}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              form.profile === "balanced"
                ? "border-[#FF6B35] bg-[#FF6B35]/5"
                : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/50"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                ⚖️ Balanced
              </span>
              {form.profile === "balanced" && (
                <span className="text-xs bg-[#FF6B35] text-white px-2 py-0.5 rounded-full font-semibold">Active</span>
              )}
            </div>
            <p className="text-zinc-500 text-xs mt-1">Steady growth. Optimized settings with 5x leverage and 20% trade sizing. Balanced momentum tracking.</p>
          </button>

          {/* Hyper Compounding Card */}
          <button
            onClick={() => applyPreset("hyper")}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              form.profile === "hyper"
                ? "border-[#FF6B35] bg-[#FF6B35]/5"
                : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/50"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-zinc-800 flex items-center gap-2">
                🔥 Hyper-Compounding
              </span>
              {form.profile === "hyper" && (
                <span className="text-xs bg-[#FF6B35] text-white px-2 py-0.5 rounded-full font-semibold">Active</span>
              )}
            </div>
            <p className="text-zinc-500 text-xs mt-1">Aggressive 300x model. High velocity using 15m candles, 33% trade sizing, tighter stops, and telescoping leverage (up to 20x).</p>
          </button>

          {/* Custom Card */}
          {form.profile === "custom" && (
            <div className="p-4 rounded-2xl border-2 border-zinc-200 bg-zinc-50 text-left">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-800 flex items-center gap-2">
                  ⚙️ Custom Configuration
                </span>
                <span className="text-xs bg-zinc-600 text-white px-2 py-0.5 rounded-full font-semibold">Active</span>
              </div>
              <p className="text-zinc-500 text-xs mt-1">You have modified specific parameters below. Custom settings are active.</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Advanced */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-semibold text-[#FF6B35] hover:text-[#e05626] transition-colors flex items-center gap-1.5 p-2 rounded-xl bg-white shadow-sm border border-zinc-100 w-full justify-center"
        >
          {showAdvanced ? "Hide Advanced Settings ▲" : "Show Advanced Settings (Custom Controls) ▼"}
        </button>
      </div>

      {showAdvanced && (
        <>
          {/* Group 1: Rotator Sizing & Execution */}
          <div className="space-y-4 rounded-[28px] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#FF6B35] mb-2 border-b pb-2">Rotator Sizing & Execution</h2>
            
            <Field
              label="Max Positions"
              value={form.max_positions}
              onChange={(e) => handleFieldChange("max_positions", e.target.value)}
            />

            <Field
              label="Risk Per Trade (Non-compounding)"
              step="0.01"
              value={form.risk_per_trade}
              onChange={(e) => handleFieldChange("risk_per_trade", e.target.value)}
            />

            <Field
              label="Rotation Threshold (Score diff to rotate)"
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
              label="Stop-Loss Cooldown (Scans/Minutes)"
              value={form.cooldown_scans}
              onChange={(e) => handleFieldChange("cooldown_scans", e.target.value)}
            />

            <label className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={form.auto_rotation}
                onChange={(e) => handleFieldChange("auto_rotation", e.target.checked)}
                className="w-5 h-5 rounded accent-[#FF6B35]"
              />
              <span className="font-semibold text-zinc-700">Auto Rotation</span>
            </label>
          </div>

          {/* Group 2: Strategy & Signals */}
          <div className="space-y-4 rounded-[28px] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#FF6B35] mb-2 border-b pb-2">Strategy & Signals</h2>
            
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
                { label: "Balanced Momentum (10% RSI, 60% ST, 30% MOM)", value: "balanced_mom" },
                { label: "Standard Trend (0% RSI, 85% ST, 15% MOM)", value: "standard_trend" },
              ]}
              onChange={(e) => handleFieldChange("score_set", e.target.value)}
            />

            <Field
              label="ATR Stop Multiplier (Risk Width)"
              step="0.1"
              value={form.atr_sl_mult || 8.0}
              onChange={(e) => handleFieldChange("atr_sl_mult", e.target.value)}
            />

            <Field
              label="Entry Score Threshold"
              step="0.05"
              value={form.entry_thr || 0.4}
              onChange={(e) => handleFieldChange("entry_thr", e.target.value)}
            />

            <Field
              label="Minimum Hold Bars"
              value={form.min_hold || 12}
              onChange={(e) => handleFieldChange("min_hold", e.target.value)}
            />

            <label className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={form.use_ema_filter || false}
                onChange={(e) => handleFieldChange("use_ema_filter", e.target.checked)}
                className="w-5 h-5 rounded accent-[#FF6B35]"
              />
              <span className="font-semibold text-zinc-700">Use EMA Trend Filter (100 EMA)</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={form.use_perf_multipliers || false}
                onChange={(e) => handleFieldChange("use_perf_multipliers", e.target.checked)}
                className="w-5 h-5 rounded accent-[#FF6B35]"
              />
              <div>
                <span className="font-semibold text-zinc-700 block">Enable Performance Multipliers</span>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  Scales asset scores dynamically based on recent winning or losing streaks (requires historical trades). Enable to suppress entry on coins with recent losses.
                </span>
              </div>
            </label>
          </div>

          {/* Group 3: Hyper-Growth & Compounding */}
          <div className="space-y-4 rounded-[28px] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#FF6B35] mb-2 border-b pb-2">Hyper-Growth & Compounding</h2>
            
            <Field
              label="Base Leverage"
              value={form.leverage}
              onChange={(e) => handleFieldChange("leverage", e.target.value)}
            />

            <Field
              label="Starting Paper Balance (USDT)"
              value={form.paper_start_balance !== undefined ? form.paper_start_balance : 10.0}
              onChange={(e) => handleFieldChange("paper_start_balance", e.target.value)}
            />

            <Field
              label="Compounding Allocation Ratio (Fraction of equity)"
              step="0.01"
              value={form.alloc_ratio || 0.25}
              onChange={(e) => handleFieldChange("alloc_ratio", e.target.value)}
            />

            <label className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={form.use_telescoping_leverage || false}
                onChange={(e) => handleFieldChange("use_telescoping_leverage", e.target.checked)}
                className="w-5 h-5 rounded accent-[#FF6B35]"
              />
              <div>
                <span className="font-semibold text-zinc-700 block">Use Telescoping Leverage</span>
                <span className="text-xs text-zinc-500 block mt-0.5">Adjusts: 20x (&lt;$50) &rarr; 10x (&lt;$500) &rarr; 3x (&ge;$500)</span>
              </div>
            </label>
          </div>
        </>
      )}

      {/* Save Button */}
      <button
        onClick={save}
        className="w-full rounded-2xl bg-[#FF6B35] hover:bg-[#e05626] transition-colors p-4 font-semibold text-white shadow-md active:scale-[0.98] transform duration-100"
      >
        Save Settings
      </button>
    </div>
  );
}
