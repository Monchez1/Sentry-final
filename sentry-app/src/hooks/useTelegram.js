import { useEffect, useState } from "react";

export default function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [initData, setInitData] = useState("");
  const [theme, setTheme] = useState("dark");

  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      
      setUser(tg.initDataUnsafe?.user || {
        id: 99999999,
        first_name: "Mock",
        last_name: "User",
        username: "mock_user",
      });
      
      setInitData(tg.initData || "user=%7B%22id%22%3A99999999%2C%22first_name%22%3A%22Mock%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22mock_user%22%7D&auth_date=1716500000&hash=mock_hash");
      setTheme(tg.colorScheme || "dark");
      setIsReady(true);
    } else {
      // Fallback for local browser testing outside of Telegram
      setUser({
        id: 99999999,
        first_name: "Local Browser",
        last_name: "Test",
        username: "local_test",
      });
      setInitData("user=%7B%22id%22%3A99999999%2C%22first_name%22%3A%22Mock%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22mock_user%22%7D&auth_date=1716500000&hash=mock_hash");
      setIsReady(true);
    }
  }, [tg]);

  return {
    tg,
    user,
    initData,
    theme,
    isReady,
  };
}
