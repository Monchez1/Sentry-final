import { useEffect, useState } from "react";
import api from "../services/api";

export default function useActivityLogs() {
  const [logs, setLogs] = useState([]);

  const loadLogs = () => {
    api.get("/activity-logs/")
      .then((res) => setLogs(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return {
    logs,
    refresh: loadLogs,
  };
}
