import {
  Play,
  Pause,
  RefreshCcw,
  Square,
  X,
} from "lucide-react";

import toast from "react-hot-toast";
import api from "../../services/api";

export default function ControlModal({ open, onClose }) {
  if (!open) return null;

  const runAction = async (endpoint) => {
    try {
      const res = await api.post(endpoint);
      toast.success(res.data.message);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm">
      <div className="absolute bottom-0 w-full rounded-t-[32px] bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Rotator Controls</h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => runAction("/rotator/start")}
            className="flex w-full items-center gap-3 rounded-2xl bg-green-50 p-4"
          >
            <Play />
            Start Rotator
          </button>

          <button
            onClick={() => runAction("/rotator/pause")}
            className="flex w-full items-center gap-3 rounded-2xl bg-yellow-50 p-4"
          >
            <Pause />
            Pause Rotator
          </button>

          <button
            onClick={() => runAction("/rotator/rebalance")}
            className="flex w-full items-center gap-3 rounded-2xl bg-blue-50 p-4"
          >
            <RefreshCcw />
            Force Rebalance
          </button>

          <button
            onClick={() => runAction("/rotator/exit-all")}
            className="flex w-full items-center gap-3 rounded-2xl bg-red-50 p-4"
          >
            <Square />
            Emergency Exit All
          </button>
        </div>
      </div>
    </div>
  );
}
