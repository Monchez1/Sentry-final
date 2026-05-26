import { create } from "zustand";

const useSentryStore = create((set) => ({
  portfolio: null,
  signals: [],
  positions: [],

  setPortfolio: (portfolio) =>
    set({ portfolio }),

  setSignals: (signals) =>
    set({ signals }),

  setPositions: (positions) =>
    set({ positions }),
}));

export default useSentryStore;
