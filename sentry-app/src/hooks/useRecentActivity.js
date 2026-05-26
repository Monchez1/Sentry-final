import { useEffect, useState } from "react";
import api from "../services/api";

export default function useRecentActivity() {
  const [logs, setLogs] = useState([]);

  const load = () => {
    api.get("/activity-logs/")
      .then((res) => {
        setLogs(res.data.slice(0, 5));
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  return logs;
}
