import { useEffect, useState } from "react";

function getWsUrl() {
  // Use the same backend URL as the REST API
  const rawUrl =
    import.meta.env.VITE_API_URL ||
    `http://${window.location.hostname}:8000`;

  // Remove trailing slash if present
  const baseUrl = rawUrl.replace(/\/$/, "");

  // Convert http(s) to ws(s)
  return baseUrl.replace(/^http/, "ws") + "/ws";
}

export default function useSentrySocket() {
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempt = 0;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const url = getWsUrl();
      console.log(`[WS] connecting to ${url} (attempt ${attempt + 1})`);

      try {
        socket = new WebSocket(url);
      } catch (err) {
        console.warn("[WS] failed to create socket:", err);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        console.log("[WS] connected");
        attempt = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "snapshot") {
            setSnapshot(data);
          }
        } catch (err) {
          console.warn("[WS] bad message:", err);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (unmounted) return;
      // Exponential backoff: 2s, 4s, 8s, 16s … capped at 30s
      const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
      attempt += 1;
      console.log(`[WS] reconnecting in ${delay / 1000}s`);
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []);

  return {
    connected,
    snapshot,
  };
}
