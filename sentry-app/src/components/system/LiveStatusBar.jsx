import useSentrySocket from "../../hooks/useSentrySocket";

export default function LiveStatusBar() {
  const { connected, snapshot } = useSentrySocket();

  return (
    <div className="sticky top-0 z-40 bg-[#F8F9FB]/90 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between rounded-full bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div
            className={
              connected
                ? "h-2.5 w-2.5 rounded-full bg-green-500"
                : "h-2.5 w-2.5 rounded-full bg-red-500"
            }
          />

          <span className="text-sm font-semibold">
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        <div className="text-xs font-semibold flex items-center gap-1.5">
          <span className={snapshot?.paper_trading ? "text-amber-600" : "text-emerald-600"}>
            {snapshot?.paper_trading ? "Paper Mode" : "Real"}
          </span>
          <span className="text-zinc-300">·</span>
          <span className="text-zinc-500">
            {snapshot?.status?.positions ?? "-"} Positions
          </span>
        </div>
      </div>
    </div>
  );
}
