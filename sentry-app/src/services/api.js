import axios from "axios";

// In production, VITE_API_URL is set to the Render backend URL.
// In local dev, it falls back to the same host on port 8000.
let rawUrl = import.meta.env.VITE_API_URL || "";
if (!rawUrl || rawUrl.includes("sentry-backend-p2i1")) {
  rawUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? `http://${window.location.hostname}:8000`
    : `https://sentry-final.onrender.com`;
}

const BASE_URL = rawUrl.replace(/\/$/, "");

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || "user=%7B%22id%22%3A99999999%2C%22first_name%22%3A%22Mock%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22mock_user%22%7D&auth_date=1716500000&hash=mock_hash";
  config.headers.Authorization = `TelegramInitData ${initData}`;
  return config;
});

export default api;


