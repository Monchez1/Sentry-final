function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        className="h-full rounded-full bg-[#FF6B35]"
        style={{ width: `${value || 0}%` }}
      />
    </div>
  );
}

export default function PositionCard({ position }) {
  const positive = position.pnl >= 0;

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {position.symbol}
          </h2>

          <p className={position.side === "LONG" ? "text-green-600" : "text-red-500"}>
            {position.side}
          </p>
        </div>

        <div className="text-right">
          <p className={positive ? "text-2xl font-bold text-green-600" : "text-2xl font-bold text-red-500"}>
            {positive ? "+" : ""}${position.pnl}
          </p>

          <p className={positive ? "text-sm text-green-600" : "text-sm text-red-500"}>
            {positive ? "+" : ""}{position.pnl_pct}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm text-zinc-500">
          <span>TP Progress</span>
          <span>{position.progress || 0}%</span>
        </div>

        <ProgressBar value={position.progress || 0} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Held</p>
          <p className="font-semibold">{position.held_bars || 0} bars</p>
        </div>

        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Stop</p>
          <p className="font-semibold">{position.stop || "-"}</p>
        </div>

        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Peak</p>
          <p className="font-semibold">{position.peak || "-"}</p>
        </div>
      </div>
    </div>
  );
}
