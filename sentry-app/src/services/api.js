import axios from "axios";

const hostname = window.location.hostname;
const api = axios.create({
  baseURL: `http://${hostname}:8000`,
});

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || "user=%7B%22id%22%3A99999999%2C%22first_name%22%3A%22Mock%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22mock_user%22%7D&auth_date=1716500000&hash=mock_hash";
  config.headers.Authorization = `TelegramInitData ${initData}`;
  return config;
});

export default api;


