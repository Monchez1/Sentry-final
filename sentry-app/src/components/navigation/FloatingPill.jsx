import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Radio,
  Plus,
  BarChart3,
  UserCircle,
} from "lucide-react";

import ControlModal from "../modals/ControlModal";

export default function FloatingPill() {
  const location = useLocation();
  const [openControls, setOpenControls] = useState(false);

  const active = (path) =>
    location.pathname === path
      ? "text-[#FF6B35]"
      : "text-zinc-500";

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full bg-white/90 px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <Link to="/" className={`rounded-full p-3 ${active("/")}`}>
            <LayoutDashboard size={22} />
          </Link>

          <Link to="/signals" className={`rounded-full p-3 ${active("/signals")}`}>
            <Radio size={22} />
          </Link>

          <button
            onClick={() => setOpenControls(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B35] text-white shadow-lg"
          >
            <Plus size={24} />
          </button>

          <Link to="/trades" className={`rounded-full p-3 ${active("/trades")}`}>
            <BarChart3 size={22} />
          </Link>

          <Link to="/profile" className={`rounded-full p-3 ${active("/profile")}`}>
            <UserCircle size={22} />
          </Link>
        </div>
      </div>

      <ControlModal
        open={openControls}
        onClose={() => setOpenControls(false)}
      />
    </>
  );
}
