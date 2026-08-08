import { useEffect, useState } from "react";
import api from "../services/api";

export default function useRotationMonitor() {
  const [data, setData] = useState(null);

  const load = () => {
    Promise.all([
      api.get("/rotation-monitor/"),
      api.get("/signals")
    ])
      .then(([rotRes, sigRes]) => {
        setData({ ...rotRes.data, signals: sigRes.data || [] });
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return data;
}
