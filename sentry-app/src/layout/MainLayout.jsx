import LiveStatusBar from "../components/system/LiveStatusBar";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-32 text-zinc-950">
      <LiveStatusBar />
      {children}
    </div>
  );
}
