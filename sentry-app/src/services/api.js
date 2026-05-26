import axios from "axios";

// In production, VITE_API_URL is set to the Render backend URL.
// In local dev, it falls back to the same host on port 8000.
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:8000`;

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || "user=%7B%22id%22%3A99999999%2C%22first_name%22%3A%22Mock%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22mock_user%22%7D&auth_date=1716500000&hash=mock_hash";
  config.headers.Authorization = `TelegramInitData ${initData}`;
  return config;
});

export default api;


