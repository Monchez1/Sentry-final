import { useEffect, useState } from "react";
import api from "../services/api";

export default function usePortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPortfolio = () => {
      api.get("/portfolio")
        .then((res) => {
          setPortfolio(res.data);
        })
        .catch(console.error)
        .finally(() => {
          setLoading(false);
        });
    };

    loadPortfolio();

    const interval = setInterval(loadPortfolio, 5000);

    return () => clearInterval(interval);
  }, []);

  return { portfolio, loading };
}
