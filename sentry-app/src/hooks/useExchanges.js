import { useEffect, useState } from "react";
import api from "../services/api";

export default function useExchanges() {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExchanges = () => {
    api.get("/exchanges/")
      .then((res) => setExchanges(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExchanges();
  }, []);

  return {
    exchanges,
    loading,
    refresh: loadExchanges,
  };
}
