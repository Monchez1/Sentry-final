import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlugZap,
  ShieldCheck,
  Play,
  ArrowRight,
  ChevronRight,
  Info,
  Lock,
  Settings,
  AlertTriangle,
  Flame,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Exchange API Form
  const [exchangeForm, setExchangeForm] = useState({
    name: "Bybit",
    api_key: "",
    api_secret: "",
    passphrase: "",
    skip_test: false,
  });

  // Settings Form (Combined Strategy + Risk defaults)
  const [settingsForm, setSettingsForm] = useState({
    max_positions: 4,
    risk_per_trade: 0.02,
    leverage: 10,
    rotation_threshold: 0.25,
    stop_loss_pct: 0.01,
    take_profit_rr: 3.0,
    auto_rotation: true,
    max_daily_drawdown: 0.10,
    max_open_risk: 0.06,
    max_consecutive_losses: 3,
    emergency_stop_pct: 0.20,
    circuit_breaker_enabled: true,
    cooldown_scans: 5,
    circuit_breaker_cooldown_scans: 15,
  });


  const handleTestConnection = async () => {
    if (!exchangeForm.api_key || !exchangeForm.api_secret) {
      toast.error("API Key and Secret are required");
      return;
    }
    setTesting(true);
    try {
      const res = await api.post("/exchanges/test", exchangeForm);
      if (res.data.success || res.data.message.includes("verified")) {
        toast.success(res.data.message || "Connection test successful!");
      } else {
        toast.error(res.data.message || "Connection failed. Please check credentials.");
      }
    } catch (err) {
      console.error(err);
      toast.error("API Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!exchangeForm.api_key || !exchangeForm.api_secret) {
      toast.error("Please fill in API Key and API Secret");
      return;
    }
    setSaving(true);
    try {
      // 1. Save Exchange
      await api.post("/exchanges/", exchangeForm);
      toast.success(`${exchangeForm.name} API saved successfully`);
      
      // Move to next step
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to save exchange configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // 2. Save Strategy Settings
      await api.post("/strategy-settings/", {
        max_positions: Number(settingsForm.max_positions),
        risk_per_trade: Number(settingsForm.risk_per_trade),
        leverage: Number(settingsForm.leverage),
        rotation_threshold: Number(settingsForm.rotation_threshold),
        stop_loss_pct: Number(settingsForm.stop_loss_pct),
        take_profit_rr: Number(settingsForm.take_profit_rr),
        auto_rotation: Boolean(settingsForm.auto_rotation),
        cooldown_scans: Number(settingsForm.cooldown_scans),
        paper_trading: true,
      });

      // 3. Save Risk Settings
      await api.post("/risk-settings/", {
        max_daily_drawdown: Number(settingsForm.max_daily_drawdown),
        max_open_risk: Number(settingsForm.max_open_risk),
        max_consecutive_losses: Number(settingsForm.max_consecutive_losses),
        emergency_stop_pct: Number(settingsForm.emergency_stop_pct),
        circuit_breaker_enabled: Boolean(settingsForm.circuit_breaker_enabled),
        circuit_breaker_cooldown_scans: Number(settingsForm.circuit_breaker_cooldown_scans),
      });


      toast.success("Trading parameters initialized");
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save trading configurations");
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchRotator = async () => {
    setSaving(true);
    try {
      await api.post("/rotator/start");
      toast.success("SENTRY Rotator Activated!");
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Failed to start rotator process");
    } finally {
      setSaving(false);
    }
  };

  // Step Indicators
  const steps = [
    { num: 1, label: "Welcome" },
    { num: 2, label: "Exchange API" },
    { num: 3, label: "Parameters" },
    { num: 4, label: "Go Live" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col justify-between p-5 pb-24">
      {/* Header and Step Progress */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Setup SENTRY</h1>
            <p className="text-xs text-zinc-500">Quick start wizard</p>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="h-5 w-5 animate-pulse text-[#FF6B35]" />
            <span className="text-sm font-extrabold tracking-wider text-[#FF6B35]">V1.0</span>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="flex items-center justify-between px-2">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    step >= s.num
                      ? "bg-[#FF6B35] text-white ring-4 ring-[#FF6B35]/20"
                      : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-wide ${
                    step >= s.num ? "text-zinc-800" : "text-zinc-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`mx-2 h-[2px] flex-1 rounded transition-all duration-500 ${
                    step > s.num ? "bg-[#FF6B35]" : "bg-zinc-100"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Animated Card Container */}
      <div className="my-auto py-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 rounded-[28px] bg-white p-6 shadow-sm border border-zinc-100/50"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B35]/10 text-[#FF6B35]">
                <Flame className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight">Autonomous Futures Rotator</h2>
                <p className="text-sm leading-relaxed text-zinc-500">
                  Welcome to SENTRY. This system automatically scans the perpetual futures market, scoring and rotating capital into the strongest trending tokens while keeping risk strictly controlled.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl bg-zinc-50/50 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-green-500" />
                  <div className="text-xs">
                    <p className="font-semibold">Tight Risk Boundaries</p>
                    <p className="text-zinc-500 mt-0.5">Automated stop-losses, daily drawdown protection, and circuit breakers.</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <PlugZap className="h-5 w-5 shrink-0 text-[#FF6B35]" />
                  <div className="text-xs">
                    <p className="font-semibold">Direct API Connection</p>
                    <p className="text-zinc-500 mt-0.5">Securely connects to your Bybit, Binance, or OKX perpetual contracts.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] py-4 font-semibold text-white shadow-lg shadow-[#FF6B35]/25 hover:bg-[#e05621] min-h-[48px]"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 rounded-[28px] bg-white p-6 shadow-sm border border-zinc-100/50"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight">Connect Exchange API</h2>
                <p className="text-xs text-zinc-500 mt-1">Provide API credentials to allow market scans and position checks.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Exchange</label>
                  <select
                    value={exchangeForm.name}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, name: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 p-3.5 text-sm outline-none border border-transparent focus:border-zinc-200 min-h-[48px]"
                  >
                    <option>Bybit</option>
                    <option>Binance</option>
                    <option>OKX</option>
                    <option>Bitget</option>
                    <option>KuCoin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">API Key</label>
                  <input
                    placeholder="Enter your API Key"
                    value={exchangeForm.api_key}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, api_key: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 p-3.5 text-sm outline-none border border-transparent focus:border-zinc-200 min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">API Secret</label>
                  <input
                    placeholder="Enter your API Secret"
                    type="password"
                    value={exchangeForm.api_secret}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, api_secret: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 p-3.5 text-sm outline-none border border-transparent focus:border-zinc-200 min-h-[48px]"
                  />
                </div>

                {exchangeForm.name === "OKX" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Passphrase</label>
                    <input
                      placeholder="Passphrase"
                      value={exchangeForm.passphrase}
                      onChange={(e) => setExchangeForm({ ...exchangeForm, passphrase: e.target.value })}
                      className="w-full rounded-xl bg-zinc-50 p-3.5 text-sm outline-none border border-transparent focus:border-zinc-200 min-h-[48px]"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="skip_test"
                    checked={exchangeForm.skip_test}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, skip_test: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  />
                  <label htmlFor="skip_test" className="text-xs font-semibold text-zinc-600 cursor-pointer">
                    Skip connection test (save anyway)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex-1 rounded-xl bg-zinc-100 py-3.5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-200 min-h-[48px]"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndContinue}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#FF6B35] py-3.5 text-sm font-bold text-white transition hover:bg-[#e05621] min-h-[48px]"
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-400 justify-center">
                <Lock size={12} />
                <span>API keys are stored encrypted and sandboxed to your account.</span>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 rounded-[28px] bg-white p-6 shadow-sm border border-zinc-100/50"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight">Configure Settings</h2>
                <p className="text-xs text-zinc-500 mt-1">Review initial risk and strategy metrics. Adjust as needed.</p>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {/* Leverage Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-600">Leverage</span>
                    <span className="text-[#FF6B35]">{settingsForm.leverage}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={settingsForm.leverage}
                    onChange={(e) => setSettingsForm({ ...settingsForm, leverage: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <p className="text-[10px] text-zinc-400">Determines the leverage multiplier for opening positions.</p>
                </div>

                {/* Risk per trade */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-600">Risk Per Trade</span>
                    <span className="text-[#FF6B35]">{(settingsForm.risk_per_trade * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.05"
                    step="0.01"
                    value={settingsForm.risk_per_trade}
                    onChange={(e) => setSettingsForm({ ...settingsForm, risk_per_trade: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <p className="text-[10px] text-zinc-400">Amount of balance to risk per asset based on ATR stop.</p>
                </div>

                {/* Max Daily Drawdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-600">Max Daily Drawdown</span>
                    <span className="text-[#FF6B35]">{(settingsForm.max_daily_drawdown * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.20"
                    step="0.01"
                    value={settingsForm.max_daily_drawdown}
                    onChange={(e) => setSettingsForm({ ...settingsForm, max_daily_drawdown: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <p className="text-[10px] text-zinc-400">Trading stops automatically if drawdown hits this percentage today.</p>
                </div>

                {/* Stop Loss Pct */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-600">Emergency Stop Limit</span>
                    <span className="text-[#FF6B35]">{(settingsForm.emergency_stop_pct * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.35"
                    step="0.01"
                    value={settingsForm.emergency_stop_pct}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emergency_stop_pct: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <p className="text-[10px] text-zinc-400">Forces complete liquidation if portfolio drawdown exceeds this boundary.</p>
                </div>

                {/* Stop Loss Cooldown Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-600">Asset Stop Cooldown</span>
                    <span className="text-[#FF6B35]">{settingsForm.cooldown_scans} mins</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={settingsForm.cooldown_scans}
                    onChange={(e) => setSettingsForm({ ...settingsForm, cooldown_scans: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <p className="text-[10px] text-zinc-400">Minutes to lock out a single asset after hitting a stop-loss.</p>
                </div>

                {/* Circuit Breaker Cooldown Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-600">Circuit Breaker Pause</span>
                    <span className="text-[#FF6B35]">{settingsForm.circuit_breaker_cooldown_scans} mins</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={settingsForm.circuit_breaker_cooldown_scans}
                    onChange={(e) => setSettingsForm({ ...settingsForm, circuit_breaker_cooldown_scans: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <p className="text-[10px] text-zinc-400">Minutes to halt all trading operations when a circuit breaker triggers.</p>
                </div>
              </div>


              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3.5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-200 min-h-[48px]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#FF6B35] py-3.5 text-sm font-bold text-white transition hover:bg-[#e05621] min-h-[48px]"
                >
                  {saving ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 rounded-[28px] bg-white p-6 shadow-sm border border-zinc-100/50 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
                <ShieldCheck className="h-10 w-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-zinc-800">SENTRY is Ready!</h2>
                <p className="text-sm leading-relaxed text-zinc-500">
                  Your credentials and parameters are loaded. SENTRY is configured to start monitoring the market and automatically execute trend-following asset rotations.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-left">
                <h4 className="text-xs font-semibold text-zinc-700">Initial Setup:</h4>
                <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
                  <li>• Connected: <span className="font-semibold text-zinc-800">{exchangeForm.name} API</span></li>
                  <li>• Leverage: <span className="font-semibold text-zinc-800">{settingsForm.leverage}x</span></li>
                  <li>• Max daily loss boundary: <span className="font-semibold text-zinc-800">{settingsForm.max_daily_drawdown * 100}%</span></li>
                  <li>• Emergency stop: <span className="font-semibold text-zinc-800">{settingsForm.emergency_stop_pct * 100}%</span></li>
                </ul>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleLaunchRotator}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-green-500 py-4 font-bold text-white shadow-lg shadow-green-500/25 hover:bg-green-600 min-h-[48px]"
                >
                  <Play size={18} fill="white" />
                  Activate Rotator Bot
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full text-xs font-semibold text-zinc-400 hover:text-zinc-600"
                >
                  Adjust Parameters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
        <Info size={12} />
        <span>You can modify these configurations later in your profile screen.</span>
      </div>
    </div>
  );
}
