import { useEffect, useState } from "react";
import api from "../services/api";

export default function useRotations() {
  const [rotation, setRotation] = useState(null);

  useEffect(() => {
    const load = () => {
      api.get("/rotations")
        .then((res) => setRotation(res.data))
        .catch(console.error);
    };

    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  return rotation;
}
