import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useTelegram from "../hooks/useTelegram";
import useStrategySettings from "../hooks/useStrategySettings";
import api from "../services/api";
import toast from "react-hot-toast";

import {
  PlugZap,
  ShieldAlert,
  Bell,
  Settings,
  FileText,
  ChevronRight,
  Activity,
  User,
  X,
} from "lucide-react";

function Item({
  icon: Icon,
  title,
  subtitle,
  to,
  onClick,
}) {
  const content = (
    <>
      <div className="rounded-2xl bg-zinc-50 p-3">
        <Icon
          size={22}
          className="text-[#FF6B35]"
        />
      </div>

      <div className="flex-1">
        <p className="font-semibold">
          {title}
        </p>

        <p className="text-sm text-zinc-500">
          {subtitle}
        </p>
      </div>

      <ChevronRight />
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="
          flex
          w-full
          items-center
          gap-4
          rounded-[24px]
          bg-white
          p-4
          shadow-sm
          text-left
        "
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className="
        flex
        items-center
        gap-4
        rounded-[24px]
        bg-white
        p-4
        shadow-sm
      "
    >
      {content}
    </Link>
  );
}

export default function ProfileScreen() {
  const { user, tg, theme } = useTelegram();
  const { settings: stratSettings, refresh: refreshStrat } = useStrategySettings();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifForm, setNotifForm] = useState({
    trade_executions: true,
    daily_reports: true,
    system_outages: true,
    cooldown_locks: true,
  });

  useEffect(() => {
    api.get("/notification-settings/")
      .then((res) => {
        setNotifForm({
          trade_executions: res.data.trade_executions,
          daily_reports: res.data.daily_reports,
          system_outages: res.data.system_outages,
          cooldown_locks: res.data.cooldown_locks,
        });
      })
      .catch((err) => {
        console.error("Error loading notification settings", err);
      });
  }, []);

  const handleToggle = async (key) => {
    const updatedForm = { ...notifForm, [key]: !notifForm[key] };
    setNotifForm(updatedForm);
    try {
      await api.post("/notification-settings/", updatedForm);
      toast.success("Settings updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
      // Revert state
      setNotifForm(notifForm);
    }
  };

  return (
    <div className="p-5 space-y-4">

      {/* User Identity Card (Clickable) */}
      <button
        onClick={() => setShowProfileModal(true)}
        className="
          flex
          w-full
          items-center
          justify-between
          rounded-[28px]
          bg-white
          p-5
          shadow-sm
          text-left
        "
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B35]/10">
            <User size={28} className="text-[#FF6B35]" />
          </div>
          <div>
            <p className="font-bold text-lg">
              {user
                ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
                : "Loading..."}
            </p>
            <p className="text-sm text-zinc-500">
              {user?.username ? `@${user.username}` : `ID: ${user?.id ?? "—"}`}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Telegram ID: {user?.id ?? "—"}
            </p>
          </div>
        </div>
        <ChevronRight />
      </button>

      {/* Paper Trading Mode Toggle Card */}
      {stratSettings && (
        <div className="rounded-[28px] bg-white p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="rounded-2xl bg-orange-50 p-3 text-[#FF6B35] dark:bg-zinc-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
            </div>
            <div>
              <p className="font-bold text-base text-zinc-800">Paper Trading Mode</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {stratSettings.paper_trading 
                  ? "Simulates trades without risking capital." 
                  : "Executes real orders on connected exchange."}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const newVal = !stratSettings.paper_trading;
                await api.post("/strategy-settings/", {
                  ...stratSettings,
                  paper_trading: newVal,
                });
                toast.success(newVal ? "Switched to Paper Trading" : "Switched to Live Execution");
                refreshStrat();
              } catch (err) {
                console.error(err);
                toast.error("Failed to toggle trading mode");
              }
            }}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              stratSettings.paper_trading ? "bg-[#FF6B35]" : "bg-zinc-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                stratSettings.paper_trading ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}

      <Item
        icon={PlugZap}
        title="Exchange APIs"
        subtitle="Manage exchange connections"
        to="/exchange-apis"
      />

      <Item
        icon={Settings}
        title="Strategy Settings"
        subtitle="Leverage and rotation"
        to="/strategy-settings"
      />

      <Item
        icon={ShieldAlert}
        title="Risk Management"
        subtitle="Circuit breaker settings"
        to="/risk-settings"
      />

      <Item
        icon={FileText}
        title="Activity Logs"
        subtitle="Audit trail and system history"
        to="/activity-logs"
      />

      <Item
        icon={Activity}
        title="Rotation Monitor"
        subtitle="Portfolio rotation intelligence"
        to="/rotation-monitor"
      />

      <Item
        icon={Bell}
        title="Notifications"
        subtitle="Telegram and push alerts"
        onClick={() => setShowNotifModal(true)}
      />

      {/* User Profile Info Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h2 className="text-xl font-bold">Telegram Profile Info</h2>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="rounded-full p-1.5 hover:bg-zinc-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6B35]/10 text-[#FF6B35]">
                  <User size={32} />
                </div>
                <div>
                  <p className="font-extrabold text-lg">
                    {user
                      ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
                      : "Loading..."}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {user?.username ? `@${user.username}` : `ID: ${user?.id ?? "—"}`}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-zinc-500">Telegram User ID</span>
                  <span className="font-semibold text-zinc-800">{user?.id ?? "—"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-zinc-500">Language Code</span>
                  <span className="font-semibold uppercase text-zinc-800">{user?.language_code || "en"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-zinc-500">Premium Account</span>
                  <span className="font-semibold text-zinc-800">{user?.is_premium ? "Yes (Premium)" : "No"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-zinc-500">WebApp Version</span>
                  <span className="font-semibold text-zinc-800">{tg?.version || "Local Mock"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-zinc-500">Client Platform</span>
                  <span className="font-semibold capitalize text-zinc-800">{tg?.platform || "Browser"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-zinc-500">Active Theme</span>
                  <span className="font-semibold capitalize text-zinc-800">{theme || "dark"}</span>
                </div>
              </div>

              {tg?.themeParams && Object.keys(tg.themeParams).length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs font-semibold text-zinc-500">Theme Parameters</p>
                  <div className="max-h-[120px] overflow-y-auto rounded-xl bg-zinc-50 p-3 text-[10px] space-y-1.5 font-mono">
                    {Object.entries(tg.themeParams).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-zinc-400">{k}:</span>
                        <span className="font-semibold text-zinc-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="mt-6 w-full rounded-2xl bg-[#FF6B35] py-3.5 font-semibold text-white transition hover:bg-[#e05621]"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h2 className="text-xl font-bold">Notifications</h2>
              <button 
                onClick={() => setShowNotifModal(false)}
                className="rounded-full p-1.5 hover:bg-zinc-150 transition"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
              Enable alerts to be notified instantly in Telegram when critical rotator events occur.
            </p>

            <div className="mt-5 space-y-3">
              {/* Toggle 1: Trade Executions */}
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 w-full cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">Trade Executions</p>
                  <p className="text-[11px] text-zinc-500">Alerts when a position is opened/closed</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifForm.trade_executions}
                  onChange={() => handleToggle("trade_executions")}
                  className="h-5 w-5 accent-[#FF6B35]"
                />
              </label>

              {/* Toggle 2: Daily Reports */}
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 w-full cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">Daily PnL Reports</p>
                  <p className="text-[11px] text-zinc-500">Send summary report of daily trades</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifForm.daily_reports}
                  onChange={() => handleToggle("daily_reports")}
                  className="h-5 w-5 accent-[#FF6B35]"
                />
              </label>

              {/* Toggle 3: System Outages */}
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 w-full cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">System Outages</p>
                  <p className="text-[11px] text-zinc-500">Critical failures or connectivity alerts</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifForm.system_outages}
                  onChange={() => handleToggle("system_outages")}
                  className="h-5 w-5 accent-[#FF6B35]"
                />
              </label>

              {/* Toggle 4: Cooldown Locks */}
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 w-full cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">Cooldown Locks</p>
                  <p className="text-[11px] text-zinc-500">Alerts when rotator enters cooldown states</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifForm.cooldown_locks}
                  onChange={() => handleToggle("cooldown_locks")}
                  className="h-5 w-5 accent-[#FF6B35]"
                />
              </label>
            </div>

            <button
              onClick={() => setShowNotifModal(false)}
              className="mt-6 w-full rounded-2xl bg-[#FF6B35] py-3.5 font-semibold text-white transition hover:bg-[#e05621]"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
