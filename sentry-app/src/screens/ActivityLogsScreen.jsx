import { useState } from "react";
import useActivityLogs from "../hooks/useActivityLogs";

export default function ActivityLogsScreen() {
  const { logs } = useActivityLogs();
  const [visibleCount, setVisibleCount] = useState(20);

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">
          Activity Logs
        </h1>
      </div>

      {logs.slice(0, visibleCount).map((log) => (
        <div
          key={log.id}
          className="rounded-[24px] bg-white p-4 shadow-sm"
        >
          <p className="font-semibold">
            {log.event_type}
          </p>

          <p className="text-zinc-600">
            {log.message}
          </p>

          <p className="mt-2 text-xs text-zinc-400">
            {log.timestamp}
          </p>
        </div>
      ))}

      {logs.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 20)}
          className="w-full rounded-2xl border-2 border-zinc-100 hover:border-zinc-200 bg-white p-4 font-semibold text-[#FF6B35] text-sm shadow-sm transition active:scale-[0.98] transform duration-100"
        >
          Load More Logs
        </button>
      )}
    </div>
  );
}
