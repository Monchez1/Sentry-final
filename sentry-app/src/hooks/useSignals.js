import { useEffect, useState } from "react";
import api from "../services/api";

export default function useSignals() {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    const loadSignals = () => {
      api.get("/signals")
        .then((res) => {
          setSignals(res.data);
        })
        .catch(console.error);
    };

    loadSignals();

    const interval = setInterval(loadSignals, 5000);

    return () => clearInterval(interval);
  }, []);

  return signals;
}
