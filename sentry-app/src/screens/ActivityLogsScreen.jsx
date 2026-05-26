import useActivityLogs from "../hooks/useActivityLogs";

export default function ActivityLogsScreen() {
  const { logs } = useActivityLogs();

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">
          Activity Logs
        </h1>
      </div>

      {logs.map((log) => (
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
    </div>
  );
}
