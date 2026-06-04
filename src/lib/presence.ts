export type PresenceState = 'available' | 'away' | 'busy' | 'offline' | 'on_leave';
export type AvailabilityKind = 'vacation' | 'public_holiday' | 'sick' | 'ooo';

export interface UserStatus {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_seen_at: string;
  effective_state: PresenceState;
  leave_kind: AvailabilityKind | null;
  leave_ends_at: string | null;
  back_on: string | null;
  backup_user_id: string | null;
}

// Ring colors — evidence-based mental model (2026-06-03 design-critique)
// Matches Slack, Microsoft Teams, Google Chat, Jira: green=available, amber=away, red=busy, grey=offline
// on_leave uses dashed blue: blue = informational/planned (calendar), dashed = secondary redundant cue (WCAG-safe)
export const PRESENCE_RING: Record<PresenceState, string> = {
  available: 'var(--ds-icon-success, #22A06B)',   // GREEN  — universal "online/available"
  away:      'var(--ds-icon-warning, #E2B203)',    // AMBER  — universal "away/idle"
  busy:      'var(--ds-icon-information, #1D7AFC)', // BLUE   — "remote/offsite" (renamed from busy)
  offline:   'var(--ds-text-subtlest, #6B6E76)',   // GREY   — universal "offline/inactive"
  on_leave:  'var(--ds-link, #1868DB)',            // BLUE   — "planned/scheduled absence"
};

// away: solid ring (distinct amber color; no longer needs dashed treatment)
// on_leave: dashed blue — secondary cue on top of blue color (safe for colorblind users)
export const PRESENCE_DASHED: Record<PresenceState, boolean> = {
  available: false,
  away:      false,
  busy:      false,
  offline:   false,
  on_leave:  true,
};

export const PRESENCE_LABEL: Record<PresenceState, string> = {
  available: 'Available',
  away:      'Away',
  busy:      'Busy',
  offline:   'Offline',
  on_leave:  'On leave',
};

export const AVAILABILITY_KIND_LABEL: Record<AvailabilityKind, string> = {
  vacation:       'Vacation',
  public_holiday: 'Public holiday',
  sick:           'Sick leave',
  ooo:            'Out of office',
};

export const IDLE_MS    = 10 * 60 * 1000;  // 10 minutes → away
export const STALE_MS   =  5 * 60 * 1000;  // 5 minutes → offline (server sweep)
export const HEARTBEAT_MS = 45_000;         // upsert every 45 s
