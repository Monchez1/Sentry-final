import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import MainLayout from "./layout/MainLayout";

import HomeScreen from "./screens/HomeScreen";
import SignalsScreen from "./screens/SignalsScreen";
import TradesScreen from "./screens/TradesScreen";
import ProfileScreen from "./screens/ProfileScreen";

import ExchangeApisScreen from "./screens/ExchangeApisScreen";
import StrategySettingsScreen from "./screens/StrategySettingsScreen";
import RiskSettingsScreen from "./screens/RiskSettingsScreen";
import ActivityLogsScreen from "./screens/ActivityLogsScreen";
import RotationMonitorScreen from "./screens/RotationMonitorScreen";
import ControlCenterScreen from "./screens/ControlCenterScreen";

import FloatingPill from "./components/navigation/FloatingPill";

import { useEffect } from "react";
import useTelegram from "./hooks/useTelegram";

function App() {
  const { tg, theme } = useTelegram();

  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;
    if (tgApp) {
      tgApp.ready();
      tgApp.expand();


    }
  }, [tg, theme]);


  return (
    <BrowserRouter>
      <Toaster position="top-center" />

      <MainLayout>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/signals" element={<SignalsScreen />} />
          <Route path="/trades" element={<TradesScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />

          <Route
            path="/exchange-apis"
            element={<ExchangeApisScreen />}
          />

          <Route
            path="/strategy-settings"
            element={<StrategySettingsScreen />}
          />

          <Route
            path="/risk-settings"
            element={<RiskSettingsScreen />}
          />

          <Route
            path="/activity-logs"
            element={<ActivityLogsScreen />}
          />

          <Route
            path="/rotation-monitor"
            element={<RotationMonitorScreen />}
          />

          <Route
            path="/control-center"
            element={<ControlCenterScreen />}
          />
        </Routes>

        <FloatingPill />
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
