export default function SignalCard({ signal }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">
            {signal.symbol}
          </h2>

          <p className={
            signal.side === "LONG"
              ? "text-green-600"
              : "text-red-500"
          }>
            {signal.side}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-500">
            Score
          </p>

          <p className="text-2xl font-bold text-[#FF6B35]">
            {signal.score}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-zinc-50 rounded-2xl p-3">
          <p className="text-xs text-zinc-500">
            Rank
          </p>

          <p className="font-semibold">
            #{signal.rank}
          </p>
        </div>

        <div className="bg-zinc-50 rounded-2xl p-3">
          <p className="text-xs text-zinc-500">
            ST
          </p>

          <p className="font-semibold">
            {signal.st ?? "-"}
          </p>
        </div>

        <div className="bg-zinc-50 rounded-2xl p-3">
          <p className="text-xs text-zinc-500">
            MOM
          </p>

          <p className="font-semibold">
            {signal.mom ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
