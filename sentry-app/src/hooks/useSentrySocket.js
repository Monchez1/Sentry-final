import { useEffect, useState } from "react";

export default function useSentrySocket() {
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connect = () => {
      const candidates = [
        `ws://${window.location.hostname}:8000/ws`,
        "ws://localhost:8000/ws",
        "ws://127.0.0.1:8000/ws",
      ];

      let index = 0;

      const tryConnect = () => {
        const url = candidates[index];

        console.log("Trying WebSocket:", url);

        socket = new WebSocket(url);

        socket.onopen = () => {
          console.log("WebSocket connected:", url);
          setConnected(true);
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === "snapshot") {
            setSnapshot(data);
          }
        };

        socket.onerror = () => {
          socket.close();
        };

        socket.onclose = () => {
          setConnected(false);

          index += 1;

          if (index < candidates.length) {
            tryConnect();
          } else {
            reconnectTimer = setTimeout(connect, 2000);
          }
        };
      };

      tryConnect();
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []);

  return {
    connected,
    snapshot,
  };
}
