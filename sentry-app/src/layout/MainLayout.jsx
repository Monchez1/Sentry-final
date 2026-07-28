import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Zap, ArrowLeftRight,
  Activity, Settings, Shield,
} from "lucide-react";

const NAV = [
  { path: "/",          icon: LayoutDashboard, label: "Home"      },
  { path: "/rotation",  icon: Activity,        label: "Rotation"  },
  { path: "/trades",    icon: ArrowLeftRight,  label: "Trades"    },
  { path: "/control",   icon: Zap,             label: "Control"   },
  { path: "/exchanges", icon: Shield,          label: "Keys"      },
];

export default function MainLayout({ children }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();

  return (
    <div className="page">
      {/* Page content */}
      <main style={{ paddingBottom: 88 }}>
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              className={`nav-item ${active ? "active" : ""}`}
              onClick={() => navigate(path)}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
