export const cycleListKeys = {
  all: ['test-cycle-list'] as const,
  list: (filters?: any) => [...cycleListKeys.all, filters] as const,
};

export function useTestCycleList(_?: any) {
  return { data: [], isLoading: false };
}
