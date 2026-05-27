import { useEffect, useRef, useState } from "react";

function getWsUrl() {
  let rawUrl = import.meta.env.VITE_API_URL || "";
  if (!rawUrl || rawUrl.includes("sentry-backend-p2i1")) {
    rawUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? `http://${window.location.hostname}:8000`
      : `https://sentry-final.onrender.com`;
  }
  const baseUrl = rawUrl.replace(/\/$/, "");
  return baseUrl.replace(/^http/, "ws") + "/ws";
}

export default function useSentrySocket() {
  const [connected, setConnected] = useState(false);
  // snapshot is the LIVE snapshot; we keep last valid one so screen never blanks
  const [snapshot, setSnapshot] = useState(null);
  const lastSnapshotRef = useRef(null);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempt = 0;
    let unmounted = false;
    let pingTimer;

    const connect = () => {
      if (unmounted) return;

      const url = getWsUrl();

      try {
        socket = new WebSocket(url);
      } catch (err) {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);

        // Keep the connection alive with periodic pings
        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try { socket.send("ping"); } catch (_) {}
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "snapshot") {
            lastSnapshotRef.current = data;
            setSnapshot(data);
          }
        } catch (_) {}
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        clearInterval(pingTimer);
        setConnected(false);
        // Keep displaying the last known snapshot while reconnecting
        if (lastSnapshotRef.current && !unmounted) {
          setSnapshot(lastSnapshotRef.current);
        }
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (unmounted) return;
      // Capped exponential back-off: 1s, 2s, 4s … max 15s
      const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      if (socket) socket.close();
    };
  }, []);

  return { connected, snapshot };
}
