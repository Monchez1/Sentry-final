import { useState } from "react";
import { Plus, PlugZap, ShieldCheck, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";


import api from "../services/api";
import useExchanges from "../hooks/useExchanges";

export default function ExchangeApisScreen() {
  const { exchanges, loading, refresh } = useExchanges();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "Bybit",
    api_key: "",
    api_secret: "",
    passphrase: "",
    skip_test: false,
  });

  const saveExchange = async () => {
    try {
      await api.post("/exchanges/", form);
      toast.success("Exchange saved");
      setOpen(false);
      setForm({
        name: "Bybit",
        api_key: "",
        api_secret: "",
        passphrase: "",
        skip_test: false,
      });
      refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to save exchange");
    }
  };

  const testExchange = async () => {
    try {
      const res = await api.post("/exchanges/test", form);
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message || "Connection test failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Connection test failed");
    }
  };

  const deleteExchange = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exchange connection?")) {
      return;
    }
    try {
      await api.delete(`/exchanges/${id}`);
      toast.success("Exchange connection removed");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete exchange connection");
    }
  };


  return (
    <div className="p-5 space-y-4">
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Exchange APIs</h1>
        <p className="mt-2 text-zinc-500">Manage exchange connections</p>
      </div>

      {loading && (
        <div className="rounded-[28px] bg-white p-5 shadow-sm">
          Loading exchanges...
        </div>
      )}

      {!loading && exchanges.length === 0 && (
        <div className="rounded-[28px] bg-white p-5 text-zinc-500 shadow-sm">
          No exchanges connected yet.
        </div>
      )}

      {exchanges.map((exchange) => (
        <div
          key={exchange.id}
          className="rounded-[28px] bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PlugZap className="text-[#FF6B35]" />

              <div>
                <p className="font-semibold">{exchange.name}</p>
                <p className="text-sm text-zinc-500">
                  {exchange.active ? "Connected" : "Inactive"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="text-green-500" />
              <button
                onClick={() => deleteExchange(exchange.id)}
                className="rounded-xl p-2 text-red-500 hover:bg-red-50 active:bg-red-100 transition dark:hover:bg-red-950/20"
              >
                <Trash2 size={18} />
              </button>
            </div>

          </div>
        </div>
      ))}

      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#FF6B35] p-4 text-white"
      >
        <Plus size={20} />
        Add Exchange
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm">
          <div className="absolute bottom-0 w-full rounded-t-[32px] bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Exchange</h2>

              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full rounded-2xl bg-zinc-50 p-4 outline-none"
              >
                <option>Bybit</option>
                <option>Binance</option>
                <option>OKX</option>
                <option>Bitget</option>
                <option>KuCoin</option>
              </select>

              <input
                placeholder="API Key"
                value={form.api_key}
                onChange={(e) =>
                  setForm({ ...form, api_key: e.target.value })
                }
                className="w-full rounded-2xl bg-zinc-50 p-4 outline-none"
              />

              <input
                placeholder="API Secret"
                type="password"
                value={form.api_secret}
                onChange={(e) =>
                  setForm({ ...form, api_secret: e.target.value })
                }
                className="w-full rounded-2xl bg-zinc-50 p-4 outline-none"
              />

              <input
                placeholder="Passphrase (optional)"
                value={form.passphrase}
                onChange={(e) =>
                  setForm({ ...form, passphrase: e.target.value })
                }
                className="w-full rounded-2xl bg-zinc-50 p-4 outline-none"
              />

              <div className="flex items-center gap-2 py-1 px-1">
                <input
                  type="checkbox"
                  id="screen_skip_test"
                  checked={form.skip_test}
                  onChange={(e) =>
                    setForm({ ...form, skip_test: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <label
                  htmlFor="screen_skip_test"
                  className="text-xs font-semibold text-zinc-600 cursor-pointer"
                >
                  Skip connection test (save anyway)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={testExchange}
                  className="rounded-2xl bg-zinc-100 p-4 font-semibold"
                >
                  Test
                </button>

                <button
                  onClick={saveExchange}
                  className="rounded-2xl bg-[#FF6B35] p-4 font-semibold text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
