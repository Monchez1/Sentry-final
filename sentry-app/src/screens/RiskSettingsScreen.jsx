import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import api from "../services/api";
import useRiskSettings from "../hooks/useRiskSettings";

function Field({ label, description, value, type = "number", step, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-zinc-800">
        {label}
      </span>

      <span className="mb-2 block text-xs text-zinc-500">
        {description}
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

export default function RiskSettingsScreen() {
  const { settings, refresh } = useRiskSettings();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) {
    return <div className="p-5">Loading...</div>;
  }

  const save = async () => {
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
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Risk Management</h1>
        <p className="mt-2 text-zinc-500">
          Account protection and circuit breaker rules
        </p>
      </div>

      <div className="space-y-4 rounded-[28px] bg-white p-5 shadow-sm">
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
          label="Circuit Breaker Cooldown (Scans/Minutes)"
          description="Number of minutes to stop trading after circuit breaker triggers"
          value={form.circuit_breaker_cooldown_scans}
          onChange={(e) =>
            setForm({ ...form, circuit_breaker_cooldown_scans: e.target.value })
          }
        />

        <label className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4">
          <input
            type="checkbox"
            checked={form.circuit_breaker_enabled}
            onChange={(e) =>
              setForm({
                ...form,
                circuit_breaker_enabled: e.target.checked,
              })
            }
          />

          <span className="font-medium">Circuit Breaker Enabled</span>
        </label>


        <button
          onClick={save}
          className="w-full rounded-2xl bg-[#FF6B35] p-4 font-semibold text-white"
        >
          Save Risk Settings
        </button>
      </div>
    </div>
  );
}
