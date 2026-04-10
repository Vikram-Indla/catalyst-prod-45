export function useWatching(issueId: string) {
  return { isWatching: false, toggleWatch: async () => {}, watcherCount: 0 };
}
