import { useState } from "react";
import { Clock, RefreshCw, Layers } from "lucide-react";
import useActivityLogs from "../hooks/useActivityLogs";

export default function ActivityLogsScreen() {
  const { logs, refresh } = useActivityLogs();
  const [visibleCount, setVisibleCount] = useState(20);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:2 }}>
              System Logs
            </div>
            <h1 style={{ fontSize:22, fontWeight:800 }}>Activity Logs</h1>
          </div>
          <button className="btn btn-icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          </button>
        </div>
      </div>

      <div className="content">
        {/* Empty logs check */}
        {!logs || logs.length === 0 ? (
          <div className="card fade-up" style={{ textAlign:"center", padding:"40px 20px" }}>
            <Layers size={28} color="var(--text-muted)" style={{ margin:"0 auto 12px" }} />
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>No activity logs</div>
            <div style={{ color:"var(--text-secondary)", fontSize:13 }}>Log events will appear as the engine trades</div>
          </div>
        ) : (
          logs.slice(0, visibleCount).map((log, i) => {
            const isError = log.severity === "ERROR" || log.event_type?.toLowerCase().includes("fail") || log.event_type?.toLowerCase().includes("error");
            return (
              <div
                key={log.id || i}
                className="card fade-up"
                style={{
                  background:"var(--bg-elevated)",
                  border:"1px solid var(--border-subtle)",
                  padding:"16px",
                  display:"flex",
                  flexDirection:"column",
                  gap:8,
                }}
              >
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{
                    fontWeight:800, fontSize:11, letterSpacing:"0.04em", textTransform:"uppercase",
                    color: isError ? "var(--red)" : "var(--accent)"
                  }}>
                    {log.event_type?.replace(/_/g, " ")}
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"var(--text-muted)" }}>
                    <Clock size={11} />
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" }) : "—"}
                  </div>
                </div>

                <p style={{ fontSize:13, color:"var(--text-primary)", lineHeight:1.4 }}>
                  {log.message}
                </p>
              </div>
            );
          })
        )}

        {/* Load more button */}
        {logs && logs.length > visibleCount && (
          <button
            className="btn btn-secondary btn-full fade-up"
            onClick={() => setVisibleCount((prev) => prev + 20)}
            style={{ borderRadius:16, marginTop:8 }}
          >
            Load More Logs
          </button>
        )}
      </div>
    </div>
  );
}
