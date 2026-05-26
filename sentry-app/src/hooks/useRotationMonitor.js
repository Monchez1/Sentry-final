import { useEffect, useState } from "react";
import api from "../services/api";

export default function useRotationMonitor() {
  const [data, setData] = useState(null);

  const load = () => {
    api.get("/rotation-monitor/")
      .then((res) => setData(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  return data;
}
