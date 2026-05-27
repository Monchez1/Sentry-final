import { useEffect, useState } from "react";
import api from "../services/api";

export default function useExchanges() {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadExchanges = () => {
    setError(null);
    api.get("/exchanges/")
      .then((res) => setExchanges(res.data))
      .catch((err) => {
        console.error(err);
        setError(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExchanges();
  }, []);

  return {
    exchanges,
    loading,
    error,
    refresh: loadExchanges,
  };
}
