export type PresenceState = 'onsite' | 'remote' | 'away' | 'on_leave';
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

// Ring colors — presence model on_set/remote/away/on_leave (2026-06-11).
// on_set=green (in office), remote=blue (offsite), away=amber, on_leave=dashed blue (planned).
export const PRESENCE_RING: Record<PresenceState, string> = {
  on_set:   'var(--ds-icon-success, #22A06B)',     // GREEN — in office / working
  remote:   'var(--ds-icon-information, #1D7AFC)',  // BLUE  — remote / offsite
  away:     'var(--ds-icon-warning, #E2B203)',      // AMBER — away / idle
  on_leave: 'var(--ds-link, #1868DB)',             // BLUE  — planned / scheduled absence
};

// on_leave: dashed blue — secondary cue on top of blue color (safe for colorblind users)
export const PRESENCE_DASHED: Record<PresenceState, boolean> = {
  on_set:   false,
  remote:   false,
  away:     false,
  on_leave: true,
};

export const PRESENCE_LABEL: Record<PresenceState, string> = {
  on_set:   'In office',
  remote:   'Remote',
  away:     'Away',
  on_leave: 'On leave',
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
