import { useEffect, useState } from "react";
import api from "../services/api";

export default function useStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const load = () => {
      api.get("/status")
        .then((res) => setStatus(res.data))
        .catch(console.error);
    };

    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  return status;
}
