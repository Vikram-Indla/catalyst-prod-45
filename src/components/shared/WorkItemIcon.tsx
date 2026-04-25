/**
 * WorkItemIcon — Canonical Catalyst / Jira work-item type icons.
 *
 * ⛔ IMMUTABLE GUARDRAIL (see CLAUDE.md §11)
 * These SVGs are approved by MoIM and may NOT be modified by any AI pass,
 * Claude Code task, or Lovable prompt without explicit written approval from
 * Vikram (owner). Colors, shapes, and sizes are frozen.
 *
 * If an icon "looks wrong" → check the iconType mapping first.
 * If a new icon type is needed → add a new case; never change existing ones.
 */

export type WorkItemIconType =
  | 'api_requirement'
  | 'backend'
  | 'business_gap'
  | 'change_request'
  | 'epic'
  | 'feature'
  | 'figma'
  | 'frontend'
  | 'integration'
  | 'production_incident'
  | 'bug'
  | 'story'
  | 'subtask'
  | 'task';

interface WorkItemIconProps {
  type: WorkItemIconType | string;
  size?: number;
  className?: string;
}

export default function WorkItemIcon({ type, size = 16, className }: WorkItemIconProps) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: '0 0 16 16',
    'aria-hidden': true as const,
    className,
  };

  switch (type) {
    // ── API Requirement — cyan monitor + gear ─────────────────────────────────
    case 'api_requirement':
      return (
        <svg {...props}>
          {/* Monitor outline */}
          <rect x="1.5" y="2" width="13" height="9" rx="1.5" fill="none" stroke="#06B6D4" strokeWidth="1.4"/>
          {/* Screen stand */}
          <path d="M6 11v2M10 11v2M5 13h6" stroke="#06B6D4" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Gear badge (bottom-right of screen) */}
          <circle cx="11.5" cy="8.5" r="2.5" fill="#06B6D4"/>
          <circle cx="11.5" cy="8.5" r="1" fill="white"/>
          <path
            d="M11.5 6.5v.5M11.5 10v.5M9.5 8.5h.5M13 8.5h.5M10.1 7.1l.36.36M12.64 9.64l.36.36M10.1 9.9l.36-.36M12.64 7.36l.36-.36"
            stroke="white"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        </svg>
      );

    // ── Backend — blue server/DB stack ────────────────────────────────────────
    case 'backend':
      return (
        <svg {...props}>
          {/* 3 server bars */}
          <rect x="2" y="2.5" width="12" height="3" rx="1" fill="#3B82F6"/>
          <rect x="2" y="6.5" width="12" height="3" rx="1" fill="#3B82F6"/>
          <rect x="2" y="10.5" width="12" height="3" rx="1" fill="#3B82F6"/>
          {/* Status dots on each bar */}
          <circle cx="12.5" cy="4" r=".8" fill="white"/>
          <circle cx="12.5" cy="8" r=".8" fill="white"/>
          <circle cx="12.5" cy="12" r=".8" fill="white"/>
        </svg>
      );

    // ── Business Gap — orange outlined box + lightning ─────────────────────────
    case 'business_gap':
      return (
        <svg {...props}>
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="#F97316" strokeWidth="1.4"/>
          <path d="M9 2.5L6 7.5h3.5L7 13.5l6-7.5H9.5L9 2.5z" fill="#F97316"/>
        </svg>
      );

    // ── Change Request — blue checkbox + check ────────────────────────────────
    case 'change_request':
      return (
        <svg {...props}>
          <rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="#2563EB" strokeWidth="1.5"/>
          <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#2563EB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    // ── Epic — purple lightning bolt (no background box) ──────────────────────
    case 'epic':
      return (
        <svg {...props}>
          <path d="M9.5 2L5 8.5h4.5L6.5 14l6.5-8H9L9.5 2z" fill="#8B5CF6"/>
        </svg>
      );

    // ── Feature — blue checkbox + check (thicker border) ─────────────────────
    case 'feature':
      return (
        <svg {...props}>
          <rect x="2" y="2" width="12" height="12" rx="2" fill="#2563EB"/>
          <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    // ── Figma — dark grey 4-cell grid ────────────────────────────────────────
    case 'figma':
      return (
        <svg {...props}>
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#374151"/>
          {/* 2×2 grid lines */}
          <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="white" strokeWidth="1" opacity=".6"/>
          <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="white" strokeWidth="1" opacity=".6"/>
          {/* Small figma-style circles in quadrants */}
          <circle cx="4.75" cy="4.75" r="1.5" fill="white" opacity=".85"/>
          <circle cx="11.25" cy="4.75" r="1.5" fill="white" opacity=".65"/>
          <circle cx="4.75" cy="11.25" r="1.5" fill="white" opacity=".65"/>
          <circle cx="11.25" cy="11.25" r="1.5" fill="white" opacity=".45"/>
        </svg>
      );

    // ── Frontend — blue monitor/screen ────────────────────────────────────────
    case 'frontend':
      return (
        <svg {...props}>
          {/* Screen */}
          <rect x="1.5" y="2" width="13" height="9" rx="1.5" fill="#3B82F6"/>
          {/* Stand */}
          <path d="M6 11v2M10 11v2M5 13h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Code symbol inside screen */}
          <path d="M5 7l-2 1.5L5 10M11 7l2 1.5L11 10M8 5.5l-1 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    // ── Integration — blue gear/cog ───────────────────────────────────────────
    case 'integration':
      return (
        <svg {...props}>
          {/* Outer gear ring */}
          <path
            d="M8 2.5l1 1.5h1.5l.8-1 1.7 1-.5 1.5.8 1.3 1.5.2v2l-1.5.2L12.5 10l.5 1.5-1.7 1-.8-1H9L8 13 7 11.5H5.5l-.8 1-1.7-1 .5-1.5L2.7 8.7l-1.5-.2v-2l1.5-.2.8-1.3-.5-1.5 1.7-1 .8 1H7L8 2.5z"
            fill="#2563EB"
          />
          {/* Inner hole */}
          <circle cx="8" cy="8" r="2.5" fill="white"/>
          <circle cx="8" cy="8" r="1.2" fill="#2563EB"/>
        </svg>
      );

    // ── Production Incident — orange circle + question mark ───────────────────
    case 'production_incident':
    case 'incident':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="#F97316" strokeWidth="1.5"/>
          <path d="M8 5v4" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="8" cy="11" r=".9" fill="#F97316"/>
        </svg>
      );

    // ── QA Bug — red/orange 6-arm asterisk ───────────────────────────────────
    case 'bug':
      return (
        <svg {...props}>
          <rect width="16" height="16" rx="2" fill="#E5493A"/>
          {/* 6-arm asterisk: horizontal + vertical + 2 diagonals */}
          <path d="M4 8h8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M8 4v8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M5.17 5.17l5.66 5.66" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M10.83 5.17L5.17 10.83" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );

    // ── Story — green bookmark ribbon ─────────────────────────────────────────
    case 'story':
      return (
        <svg {...props}>
          <rect width="16" height="16" rx="2" fill="#22C55E"/>
          {/* Bookmark with inverted-V notch at bottom */}
          <path d="M4.5 3h7v10l-3.5-2L4.5 13V3z" fill="white"/>
        </svg>
      );

    // ── Sub-task — blue chain-link / two overlapping squares ─────────────────
    case 'subtask':
      return (
        <svg {...props}>
          {/* Left square */}
          <rect x="1.5" y="5" width="7" height="7" rx="1.5" fill="none" stroke="#2563EB" strokeWidth="1.5"/>
          {/* Right square offset */}
          <rect x="7.5" y="4" width="7" height="7" rx="1.5" fill="#2563EB"/>
          {/* Checkmark on right square */}
          <path d="M9 7.5l1.5 1.5 2.5-2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    // ── Task — blue filled square + white check (default) ────────────────────
    case 'task':
    default:
      return (
        <svg {...props}>
          <rect width="16" height="16" rx="2" fill="#4BADE8"/>
          <path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}

/**
 * Normalize a raw DB/API icon type string to the canonical WorkItemIconType.
 *
 * The normalizer is the single chokepoint between whatever string a caller
 * happens to have (Jira display name, internal snake_case enum, legacy alias)
 * and the 14 canonical icons frozen in CLAUDE.md §11.
 *
 * Accepts (all forms collapse to the same canonical key):
 *   - snake_case internal enums: "business_gap", "production_incident"
 *   - Jira display names:        "Business Gap", "Production Incident"
 *   - Jira hyphenated names:     "Sub-task"
 *   - Mixed case / stray spaces: "  QA Bug "
 *
 * Strategy: lowercase + strip, then replace any hyphens/spaces with
 * underscores, then match. A miss logs a warning (so drift is visible) and
 * falls back to 'task' — same behaviour as before, but now with telemetry.
 *
 * Use this when mapping notification.entity_icon_type or
 * ph_issues.issue_type before passing to <WorkItemIcon>.
 */
export function normalizeIconType(raw: string | undefined | null): WorkItemIconType {
  if (!raw) return 'task';
  const key = String(raw).trim().toLowerCase().replace(/[-\s]+/g, '_');
  switch (key) {
    // ── canonical (internal snake_case) ─────────────────────────────────────
    case 'api_requirement':    return 'api_requirement';
    case 'backend':            return 'backend';
    case 'business_gap':       return 'business_gap';
    case 'change_request':     return 'change_request';
    case 'epic':               return 'epic';
    case 'feature':
    case 'new_feature':        return 'feature';
    case 'figma':              return 'figma';
    case 'frontend':           return 'frontend';
    case 'integration':        return 'integration';
    case 'production_incident':
    case 'incident':
    case 'question':           return 'production_incident';
    case 'bug':
    case 'qa_bug':
    case 'defect':             return 'bug';
    case 'story':
    case 'user_story':         return 'story';
    case 'subtask':
    case 'sub_task':
    case 'sub-task':           return 'subtask';
    case 'task':
    case 'improvement':
    case 'technical_task':     return 'task';

    // ── Jira product / category display names not covered above ────────────
    // Jira's "Service Request" / "Incident" categories also surface under
    // various custom names in the MoIM tenant — they all resolve to the
    // production_incident icon per CLAUDE.md §11.
    case 'service_request':
    case 'problem':
    case 'prod_issue':
    case 'production_issue':   return 'production_incident';

    // ── Business Request alias ─────────────────────────────────────────────
    // Catalyst's "Business Request" issue type has no dedicated entry in the
    // canonical 14-icon work-item set (CLAUDE.md §11 — frozen). The closest
    // semantic + visual match is `business_gap` (orange #F97316, lightning
    // bolt in outlined box) — a "request"-class artifact in the same color
    // family the wider Catalyst codebase uses for Business Request elsewhere
    // (amber #FFAB00 in jira-issue-type-icons.tsx). Aliasing here avoids
    // adding a new icon to the frozen set while still rendering BR rows
    // with a recognizable, non-default mark.
    case 'business_request':
    case 'brd_task':           return 'business_gap';

    default:
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[WorkItemIcon] Unknown icon type "${raw}" (normalized → "${key}") — falling back to 'task'`);
      }
      return 'task';
  }
}
