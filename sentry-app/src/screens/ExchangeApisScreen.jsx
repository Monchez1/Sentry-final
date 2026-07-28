import { useState } from "react";
import { Plus, X, Shield, Trash2, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import useExchanges from "../hooks/useExchanges";
import api from "../services/api";

const EXCHANGES = ["Bybit", "Binance", "OKX", "Bitget", "KuCoin"];

const EXCHANGE_COLORS = {
  Bybit:   { bg: "rgba(255,169,0,0.1)",  color: "#ffa900" },
  Binance: { bg: "rgba(243,186,47,0.1)", color: "#f3ba2f" },
  OKX:     { bg: "rgba(99,102,241,0.1)", color: "#6366f1" },
  Bitget:  { bg: "rgba(0,200,140,0.1)",  color: "#00c88c" },
  KuCoin:  { bg: "rgba(9,185,119,0.1)",  color: "#09b977" },
};

function ExchangeAvatar({ name }) {
  const style = EXCHANGE_COLORS[name] || { bg: "var(--bg-elevated)", color: "var(--accent)" };
  return (
    <div style={{ width:44, height:44, borderRadius:14, background:style.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1.5px solid ${style.color}22` }}>
      <span style={{ fontSize:16, fontWeight:800, color:style.color }}>
        {name?.[0] ?? "?"}
      </span>
    </div>
  );
}

export default function ExchangeApisScreen() {
  const { exchanges, loading, refresh } = useExchanges();
  const [open,      setOpen]      = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [form, setForm] = useState({
    name: "Bybit", api_key: "", api_secret: "", passphrase: "", skip_test: false,
  });

  const resetForm = () => {
    setForm({ name:"Bybit", api_key:"", api_secret:"", passphrase:"", skip_test:false });
    setTestResult(null);
    setShowSecret(false);
  };

  const handleClose = () => { setOpen(false); resetForm(); };

  const patch = (k, v) => { setForm(f => ({ ...f, [k]: v })); setTestResult(null); };

  const testConnection = async () => {
    if (!form.api_key.trim() || !form.api_secret.trim()) {
      toast.error("API Key and Secret are required");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/exchanges/test", form);
      setTestResult(data);
      if (data.success) toast.success("Connection verified!");
      else              toast.error(data.message || "Test failed");
    } catch (e) {
      setTestResult({ success: false, message: e?.response?.data?.detail || "Connection test failed" });
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  const saveExchange = async () => {
    if (!form.api_key.trim() || !form.api_secret.trim()) {
      toast.error("API Key and Secret are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/exchanges/", form);
      toast.success(`${form.name} connected!`);
      refresh();
      handleClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save exchange");
    } finally {
      setSaving(false);
    }
  };

  const activateExchange = async (id) => {
    try {
      await api.post(`/exchanges/${id}/activate`);
      toast.success("Exchange activated");
      refresh();
    } catch { toast.error("Failed to activate"); }
  };

  const deleteExchange = async (id, name) => {
    setDeleting(id);
    try {
      await api.delete(`/exchanges/${id}`);
      toast.success(`${name} removed`);
      refresh();
    } catch { toast.error("Failed to remove"); }
    finally { setDeleting(null); }
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
              Exchange Keys
            </div>
            <h1 style={{ fontSize:22, fontWeight:800 }}>Connections</h1>
          </div>
          <button className="btn btn-primary" style={{ borderRadius:14, padding:"10px 16px", fontSize:13 }} onClick={() => setOpen(true)}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="content">
        {/* ── Loading skeletons ─────────────────────────────────── */}
        {loading && [1,2].map(i => (
          <div key={i} className="card fade-up" style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div className="skeleton" style={{ width:44, height:44, borderRadius:14, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div className="skeleton" style={{ height:14, width:"40%", marginBottom:8 }} />
              <div className="skeleton" style={{ height:11, width:"60%" }} />
            </div>
          </div>
        ))}

        {/* ── Empty state ───────────────────────────────────────── */}
        {!loading && exchanges.length === 0 && (
          <div className="card fade-up" style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ width:56, height:56, borderRadius:18, background:"var(--bg-elevated)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Shield size={24} color="var(--text-muted)" />
            </div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>No exchanges connected</div>
            <div style={{ color:"var(--text-secondary)", fontSize:13, marginBottom:20 }}>
              Add your exchange API keys to start trading
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setOpen(true)}>
              <Plus size={16} /> Connect Exchange
            </button>
          </div>
        )}

        {/* ── Exchange cards ────────────────────────────────────── */}
        {exchanges.map((ex) => (
          <div key={ex.id} className="card fade-up">
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <ExchangeAvatar name={ex.name} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{ex.name}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:3, fontFamily:"monospace" }}>
                  {ex.api_key ? `${ex.api_key.slice(0,6)}••••${ex.api_key.slice(-4)}` : "—"}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {ex.active ? (
                  <span className="badge badge-green">
                    <span className="dot dot-green pulse-dot" style={{ width:6, height:6 }} />
                    Active
                  </span>
                ) : (
                  <button className="btn btn-secondary" style={{ fontSize:12, padding:"8px 14px", borderRadius:10 }} onClick={() => activateExchange(ex.id)}>
                    Activate
                  </button>
                )}
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => deleteExchange(ex.id, ex.name)}
                  disabled={deleting === ex.id}
                >
                  {deleting === ex.id
                    ? <Loader2 size={15} className="spin" />
                    : <Trash2 size={15} />}
                </button>
              </div>
            </div>

            {/* Key details row */}
            <div style={{ marginTop:14, padding:"12px 14px", background:"var(--bg-elevated)", borderRadius:12, border:"1px solid var(--border-subtle)" }}>
              <div className="row" style={{ paddingTop:0, paddingBottom:8 }}>
                <span className="row-label">Status</span>
                <span className={`row-value ${ex.active ? "text-green" : "text-secondary"}`}>
                  {ex.active ? "Connected" : "Inactive"}
                </span>
              </div>
              <div className="row" style={{ paddingBottom:0 }}>
                <span className="row-label">Exchange</span>
                <span className="row-value">{ex.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add Exchange Sheet ───────────────────────────────── */}
      {open && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="sheet">
            <div className="sheet-handle" />

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
                  New Connection
                </div>
                <h2 style={{ fontSize:20, fontWeight:800 }}>Add Exchange</h2>
              </div>
              <button className="btn btn-icon" onClick={handleClose}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* Exchange selector */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:8 }}>Exchange</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {EXCHANGES.map(name => {
                    const s = EXCHANGE_COLORS[name] || {};
                    const active = form.name === name;
                    return (
                      <button
                        key={name}
                        onClick={() => patch("name", name)}
                        style={{
                          padding:"8px 16px", borderRadius:12, fontSize:13, fontWeight:600,
                          background: active ? (s.bg || "var(--accent-soft)") : "var(--bg-elevated)",
                          color:      active ? (s.color || "var(--accent)") : "var(--text-secondary)",
                          border:     active ? `1.5px solid ${s.color || "var(--accent)"}44` : "1px solid var(--border)",
                          cursor:"pointer", transition:"all 0.15s",
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:8 }}>API Key</div>
                <input
                  className="input"
                  placeholder="Paste your API key"
                  value={form.api_key}
                  onChange={e => patch("api_key", e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* API Secret */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:8 }}>API Secret</div>
                <div style={{ position:"relative" }}>
                  <input
                    className="input"
                    placeholder="Paste your API secret"
                    type={showSecret ? "text" : "password"}
                    value={form.api_secret}
                    onChange={e => patch("api_secret", e.target.value)}
                    style={{ paddingRight:48 }}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setShowSecret(s => !s)}
                    style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:4 }}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Passphrase (OKX / KuCoin) */}
              {(form.name === "OKX" || form.name === "KuCoin") && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:8 }}>Passphrase</div>
                  <input
                    className="input"
                    placeholder="Passphrase (required for this exchange)"
                    value={form.passphrase}
                    onChange={e => patch("passphrase", e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Skip test toggle */}
              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"2px 0" }}>
                <div
                  onClick={() => patch("skip_test", !form.skip_test)}
                  style={{
                    width:40, height:22, borderRadius:11,
                    background: form.skip_test ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${form.skip_test ? "var(--accent)" : "var(--border)"}`,
                    position:"relative", transition:"all 0.2s", flexShrink:0,
                  }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:"50%", background:"#fff",
                    position:"absolute", top:2, left: form.skip_test ? 20 : 2,
                    transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
                  }} />
                </div>
                <span style={{ fontSize:13, color:"var(--text-secondary)" }}>Skip connection test</span>
              </label>

              {/* Test result */}
              {testResult && (
                <div style={{
                  padding:"12px 14px", borderRadius:12,
                  background: testResult.success ? "var(--green-soft)" : "var(--red-soft)",
                  border:`1px solid ${testResult.success ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                  display:"flex", alignItems:"flex-start", gap:10,
                }}>
                  {testResult.success
                    ? <CheckCircle2 size={16} color="var(--green)" style={{ flexShrink:0, marginTop:1 }} />
                    : <AlertCircle  size={16} color="var(--red)"   style={{ flexShrink:0, marginTop:1 }} />}
                  <span style={{ fontSize:13, color: testResult.success ? "var(--green)" : "var(--red)", lineHeight:1.4 }}>
                    {testResult.message}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:4 }}>
                <button
                  className="btn btn-secondary btn-full"
                  onClick={testConnection}
                  disabled={testing}
                  style={{ borderRadius:16 }}
                >
                  {testing ? <><Loader2 size={15} className="spin" /> Testing…</> : "Test Connection"}
                </button>
                <button
                  className="btn btn-primary btn-full"
                  onClick={saveExchange}
                  disabled={saving}
                  style={{ borderRadius:16 }}
                >
                  {saving ? <><Loader2 size={15} className="spin" /> Saving…</> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
