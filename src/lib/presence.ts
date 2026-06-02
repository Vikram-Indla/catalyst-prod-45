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

// Ring colors — ADS tokens with canonical fallbacks (2026-06-02 PO spec)
export const PRESENCE_RING: Record<PresenceState, string> = {
  available: 'var(--ds-link, #1868DB)',
  away:      'var(--ds-link, #1868DB)',     // hollow/dashed via CSS, same blue family
  busy:      'var(--ds-text-subtlest, #6B6E76)',
  offline:   'var(--ds-icon-warning, #E2B203)',
  on_leave:  'var(--ds-icon-danger, #C9372C)',
};

// Whether the ring should render as dashed (away = hollow dashed)
export const PRESENCE_DASHED: Record<PresenceState, boolean> = {
  available: false,
  away:      true,
  busy:      false,
  offline:   false,
  on_leave:  false,
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
