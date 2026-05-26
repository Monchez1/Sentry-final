import { useEffect, useState } from "react";
import api from "../services/api";

export default function useRiskSettings() {
  const [settings, setSettings] = useState(null);

  const loadSettings = () => {
    api.get("/risk-settings/")
      .then((res) => setSettings(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    refresh: loadSettings,
  };
}
