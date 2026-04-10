export function useGovernanceScore() {
  return { ragStatus: 'green' as const, staleCount: 0, breachStreak: 0 };
}
