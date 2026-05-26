import useSignals from "../hooks/useSignals";
import SignalCard from "../components/cards/SignalCard";

export default function SignalsScreen() {
  const signals = useSignals();

  const longSignals = signals.filter((s) => s.side === "LONG");
  const shortSignals = signals.filter((s) => s.side === "SHORT");
  const eligible = signals.filter((s) => s.score >= 0.5);

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">
          Market Scanner
        </h1>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-xs text-zinc-500">
              Signals
            </p>

            <p className="text-xl font-bold">
              {signals.length}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">
              Eligible
            </p>

            <p className="text-xl font-bold">
              {eligible.length}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">
              Long / Short
            </p>

            <p className="text-xl font-bold">
              {longSignals.length}/{shortSignals.length}
            </p>
          </div>
        </div>
      </div>

      {signals.length === 0 && (
        <div className="rounded-[28px] bg-white p-5 text-zinc-500 shadow-sm">
          No active signals — scanner may be idle.
        </div>
      )}

      {signals.map((signal) => (
        <SignalCard
          key={signal.symbol}
          signal={signal}
        />
      ))}
    </div>
  );
}

