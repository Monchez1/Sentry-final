import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import HomeScreen            from "./screens/HomeScreen";
import ExchangeApisScreen    from "./screens/ExchangeApisScreen";
import TradesScreen          from "./screens/TradesScreen";
import ControlCenterScreen   from "./screens/ControlCenterScreen";
import RotationMonitorScreen from "./screens/RotationMonitorScreen";
import SignalsScreen         from "./screens/SignalsScreen";
import RiskSettingsScreen    from "./screens/RiskSettingsScreen";
import StrategySettingsScreen from "./screens/StrategySettingsScreen";
import ActivityLogsScreen    from "./screens/ActivityLogsScreen";
import ProfileScreen         from "./screens/ProfileScreen";
import "./App.css";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/"                index element={<HomeScreen />} />
        <Route path="/exchanges"       element={<ExchangeApisScreen />} />
        <Route path="/trades"          element={<TradesScreen />} />
        <Route path="/control"         element={<ControlCenterScreen />} />
        <Route path="/rotation"        element={<RotationMonitorScreen />} />
        <Route path="/signals"         element={<SignalsScreen />} />
        <Route path="/risk"            element={<RiskSettingsScreen />} />
        <Route path="/strategy"        element={<StrategySettingsScreen />} />
        <Route path="/logs"            element={<ActivityLogsScreen />} />
        <Route path="/profile"         element={<ProfileScreen />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
