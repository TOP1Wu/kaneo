import { create } from "zustand";

type InstanceNameStore = {
  instanceName: string;
  setInstanceName: (instanceName: string) => void;
};

/** The instance name from config, for page titles. */
export const useInstanceNameStore = create<InstanceNameStore>((set) => ({
  instanceName: "齐活",
  setInstanceName: (instanceName) => set({ instanceName }),
}));
