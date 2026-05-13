import { useStore } from "../store";

export function useFps(): number {
  return useStore((s) => s.config?.fps ?? 15);
}
