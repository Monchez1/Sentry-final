import toast from "react-hot-toast";
import api from "../services/api";

export default function ControlCenterScreen() {

  const call = async (endpoint, success) => {
    try {
      await api.post(endpoint);
      toast.success(success);
    } catch (err) {
      toast.error("Action failed");
      console.error(err);
    }
  };

  return (
    <div className="p-5 space-y-4">

      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">
          Control Center
        </h1>

        <p className="mt-2 text-zinc-500">
          Live rotator controls
        </p>
      </div>

      <button
        onClick={() =>
          call("/rotator/start", "Rotator Started")
        }
        className="
          w-full
          rounded-[24px]
          bg-green-600
          p-4
          text-white
          font-semibold
        "
      >
        Start Rotator
      </button>

      <button
        onClick={() =>
          call("/rotator/pause", "Rotator Paused")
        }
        className="
          w-full
          rounded-[24px]
          bg-yellow-500
          p-4
          text-white
          font-semibold
        "
      >
        Pause Rotator
      </button>

      <button
        onClick={() =>
          call("/rotator/rebalance", "Rebalance Triggered")
        }
        className="
          w-full
          rounded-[24px]
          bg-blue-600
          p-4
          text-white
          font-semibold
        "
      >
        Force Rebalance
      </button>

      <button
        onClick={() =>
          call("/rotator/exit-all", "Positions Closed")
        }
        className="
          w-full
          rounded-[24px]
          bg-red-600
          p-4
          text-white
          font-semibold
        "
      >
        Exit All Positions
      </button>

    </div>
  );
}
