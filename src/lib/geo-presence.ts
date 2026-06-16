import type { PresenceState } from '@/lib/presence';

export const GEO_ACTIVE_STATE_KEY = 'catalyst_geo_active_state';

const COUNTRY_TO_ACTIVE_STATE: Record<string, Extract<PresenceState, 'onsite' | 'remote'>> = {
  SA: 'onsite',  // Saudi Arabia → onsite
  IN: 'remote',  // India → remote
};

/**
 * Detect the user's country via IP and cache the corresponding active-state
 * preference in localStorage. Called once on SIGNED_IN.
 *
 * The heartbeat reads the cached value so every 45-second tick uses the
 * correct active state (remote vs on_set) without fighting manual overrides.
 *
 * Failure is silently swallowed — unknown country leaves the cache unchanged
 * and the heartbeat falls back to 'onsite' (the Catalyst default).
 */
export async function detectAndCacheGeoPresence(): Promise<void> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return;
    const json = await res.json();
    const countryCode: string | undefined = json?.country_code;
    if (!countryCode) return;
    const activeState = COUNTRY_TO_ACTIVE_STATE[countryCode];
    if (activeState) {
      localStorage.setItem(GEO_ACTIVE_STATE_KEY, activeState);
    }
  } catch {
    // geo detection failure is non-fatal
  }
}

/**
 * Returns the geo-detected active state, or 'onsite' if not yet detected.
 * Called by usePresenceHeartbeat on every heartbeat tick.
 */
export function getGeoActiveState(): Extract<PresenceState, 'onsite' | 'remote'> {
  const cached = localStorage.getItem(GEO_ACTIVE_STATE_KEY);
  if (cached === 'onsite' || cached === 'remote') return cached;
  return 'onsite';
}

/**
 * Clear the geo cache on sign-out so the next login re-detects.
 */
export function clearGeoPresenceCache(): void {
  localStorage.removeItem(GEO_ACTIVE_STATE_KEY);
  localStorage.removeItem(MANUAL_AWAY_UNTIL_KEY);
}

// ─── Manual Away guard ──────────────────────────────────────────────────────
// When the user explicitly picks "Away" via the panel, stamp a TTL so the
// heartbeat doesn't override it back to remote/on_set within 45 s.

const MANUAL_AWAY_UNTIL_KEY = 'catalyst_manual_away_until';

/**
 * Call when the user manually selects "Away". Defaults to 4 h.
 * The heartbeat will not overwrite the Away state until the TTL expires.
 */
export function setManualAwayOverride(durationMs = 4 * 60 * 60 * 1000): void {
  localStorage.setItem(MANUAL_AWAY_UNTIL_KEY, String(Date.now() + durationMs));
}

/** Call when the user manually selects any non-Away state. */
export function clearManualAway(): void {
  localStorage.removeItem(MANUAL_AWAY_UNTIL_KEY);
}

/** Returns true while a manual Away override is still within its TTL. */
export function isManualAwayActive(): boolean {
  const until = Number(localStorage.getItem(MANUAL_AWAY_UNTIL_KEY) ?? 0);
  return Date.now() < until;
}
