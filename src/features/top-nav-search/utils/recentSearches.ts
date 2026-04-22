const KEY = 'tnav_recent_searches';
const MAX = 5;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter((q) => q !== trimmed);
  existing.unshift(trimmed);
  try {
    localStorage.setItem(KEY, JSON.stringify(existing.slice(0, MAX)));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
