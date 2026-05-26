import { useEffect, useState } from "react";
import api from "../services/api";

export default function usePositions() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const loadPositions = () => {
      api.get("/positions")
        .then((res) => {
          setPositions(res.data);
        })
        .catch(console.error);
    };

    loadPositions();

    const interval = setInterval(loadPositions, 5000);

    return () => clearInterval(interval);
  }, []);

  return positions;
}
