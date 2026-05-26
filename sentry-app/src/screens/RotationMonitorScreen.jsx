import useRotationMonitor from "../hooks/useRotationMonitor";

export default function RotationMonitorScreen() {
  const data = useRotationMonitor();

  if (!data) {
    return <div className="p-5">Loading...</div>;
  }

  return (
    <div className="p-5 space-y-4">

      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">
          Rotation Monitor
        </h1>

        <p className="mt-2 text-zinc-500">
          Portfolio rotation intelligence
        </p>
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">
          Current Weakest Holding
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          {data.current}
        </h2>

        <p className="mt-2">
          Score: {data.current_score}
        </p>

        <p>
          Rank: #{data.current_rank}
        </p>
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">
          Incoming Candidate
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          {data.candidate}
        </h2>

        <p className="mt-2">
          Score: {data.candidate_score}
        </p>

        <p>
          Rank: #{data.candidate_rank}
        </p>
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">
          Score Difference
        </p>

        <h2 className="mt-2 text-4xl font-bold text-green-600">
          +{data.score_difference}
        </h2>

        <p className="mt-2">
          Expected Improvement:
          {" "}
          {data.expected_improvement}%
        </p>
      </div>

      <div className="
        rounded-[28px]
        bg-green-50
        p-5
        shadow-sm
      ">
        <p className="text-sm text-green-700">
          Decision
        </p>

        <h2 className="
          mt-2
          text-3xl
          font-bold
          text-green-700
        ">
          {data.decision}
        </h2>
      </div>

    </div>
  );
}
