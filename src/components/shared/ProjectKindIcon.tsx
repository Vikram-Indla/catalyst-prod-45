/**
 * ProjectKindIcon — 20 unique Jira-style project-kind glyphs.
 *
 * Purpose
 * ───────
 * Renders the small colored "project avatar" that sits next to a project name
 * in surfaces like Recommended Projects, Worked-on rows, and Assigned rows.
 * It matches Jira's For You pattern where every project card carries a
 * distinct, brandable, non-status icon (not a lozenge, not a status color).
 *
 * Why inline SVG, not @atlaskit/icon-object
 * ─────────────────────────────────────────
 * CLAUDE.md §10 — "Never introduce new npm dependencies" (the @atlaskit/icon-
 * object package isn't currently installed, and adding it demands a vite
 * optimizeDeps bump per §1 adoption protocol). Inline SVG keeps:
 *   • zero bundle cost
 *   • a single consolidation point for visual drift review
 *   • consistency with the frozen WorkItemIcon pattern (src/components/shared)
 *
 * Sizing
 * ──────
 * Default tile is 24×24 (matches Jira Recommended-projects card). Use 32 for
 * row left-icons, 48 for spotlight tiles. The component always produces a
 * square, rounded tile with a solid color fill and a white/tinted glyph —
 * never a raster image, never an emoji.
 *
 * Theming
 * ───────
 * Icons are on-color; they do NOT swap in dark mode. That matches the
 * WorkItemIcon contract (see §11 of CLAUDE.md) and prevents contrast drift
 * when a project's brand color is the recognition signal.
 *
 * Picking a kind
 * ──────────────
 * Use `pickProjectKind(projectKey, issueType?)` below to deterministically
 * assign a kind when the backing row doesn't carry one. The hash keeps the
 * same project always on the same icon, so Recommended Projects never
 * shuffles between refreshes.
 */

export type ProjectKind =
  // Core work types
  | 'software'        // classic Jira Software — purple bolt
  | 'business'        // Jira Business — green checkbox
  | 'service'         // Service Management — teal headphones
  // Board variants
  | 'kanban'          // kanban columns
  | 'scrum'           // sprint ring
  | 'board'           // generic task board
  // Management flavors
  | 'company_managed' // company-managed project
  | 'team_managed'    // team-managed project
  // Product / strategy
  | 'discovery'       // Jira Product Discovery — pink lightbulb
  | 'roadmap'         // timeline roadmap
  | 'plan'            // planning calendar
  | 'portfolio'       // portfolio briefcase
  // Customer & ops
  | 'customer'        // customer service desk
  | 'opsgenie'        // incident / oncall
  | 'analytics'       // dashboards & reports
  // Knowledge & content
  | 'wiki'            // confluence-style doc
  | 'design'          // figma-style grid
  | 'data'            // database / datasource
  // Specialty
  | 'integration'     // puzzle piece
  | 'mobile';         // phone surface

interface ProjectKindIconProps {
  kind: ProjectKind;
  size?: number;
  className?: string;
  /** Accessible label, defaults to the kind. */
  label?: string;
}

/**
 * Deterministic kind picker — used when a project row doesn't already carry
 * a kind column. Hashes projectKey (e.g. "MOIM", "STRAT", "TSK") so the same
 * project always lands on the same icon. Issue-type can bias the result
 * (planner → board, incident → opsgenie) but projectKey wins.
 */
export function pickProjectKind(projectKey: string | undefined | null, issueType?: string): ProjectKind {
  const key = (projectKey || '').toUpperCase();
  const type = (issueType || '').toLowerCase();

  // Strong biases: if the project is clearly one kind, return that directly.
  if (key === 'TSK' || type === 'planner_task') return 'board';
  if (type.includes('incident') || type.includes('production')) return 'opsgenie';
  if (type === 'epic') return 'roadmap';
  if (type === 'feature' || type === 'initiative') return 'discovery';
  if (type === 'story') return 'software';
  if (type === 'bug' || type === 'defect') return 'service';
  if (type === 'test' || type === 'test case' || type === 'test execution') return 'analytics';

  // Otherwise, stable hash over the project key → pick from the full list.
  const all: ProjectKind[] = [
    'software', 'business', 'service', 'kanban', 'scrum', 'board',
    'company_managed', 'team_managed', 'discovery', 'roadmap', 'plan',
    'portfolio', 'customer', 'opsgenie', 'analytics', 'wiki', 'design',
    'data', 'integration', 'mobile',
  ];
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return all[Math.abs(h) % all.length];
}

export default function ProjectKindIcon({ kind, size = 24, className, label }: ProjectKindIconProps) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    role: 'img' as const,
    'aria-label': label || kind,
    className,
  };

  switch (kind) {
    // ── Jira Software — purple bolt on violet tile ─────────────────────────
    case 'software':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#7F56D9"/>
          <path d="M13 5L7 13h4l-2 6 6-8h-4l2-6z" fill="#FFFFFF"/>
        </svg>
      );

    // ── Jira Business — green tile + checkbox ──────────────────────────────
    case 'business':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#1F845A"/>
          <rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.6"/>
          <path d="M8.5 12l2.5 2.5L16 9.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    // ── Service Management — teal tile + headphones ────────────────────────
    case 'service':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#0B7075"/>
          <path d="M7 13a5 5 0 0 1 10 0" stroke="#FFFFFF" strokeWidth="1.6" fill="none"/>
          <rect x="5.5" y="12.5" width="3" height="5" rx="1" fill="#FFFFFF"/>
          <rect x="15.5" y="12.5" width="3" height="5" rx="1" fill="#FFFFFF"/>
        </svg>
      );

    // ── Kanban — 3 columns ─────────────────────────────────────────────────
    case 'kanban':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#2563EB"/>
          <rect x="5"  y="6" width="3" height="12" rx="1" fill="#FFFFFF"/>
          <rect x="10.5" y="6" width="3" height="9"  rx="1" fill="#FFFFFF"/>
          <rect x="16" y="6" width="3" height="6"  rx="1" fill="#FFFFFF"/>
        </svg>
      );

    // ── Scrum — circular arrow ring ────────────────────────────────────────
    case 'scrum':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#3B82F6"/>
          <path d="M17 11a5 5 0 1 1-1.5-3.5" stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <path d="M17 6.5V9h-2.5" stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    // ── Board — task board with ticks ──────────────────────────────────────
    case 'board':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#0052CC"/>
          <rect x="5" y="6" width="14" height="3" rx="1" fill="#FFFFFF" opacity=".95"/>
          <rect x="5" y="10.5" width="10" height="3" rx="1" fill="#FFFFFF" opacity=".85"/>
          <rect x="5" y="15" width="7" height="3" rx="1" fill="#FFFFFF" opacity=".75"/>
        </svg>
      );

    // ── Company-managed — 2 stacked tiles + gear ───────────────────────────
    case 'company_managed':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#4C6EF5"/>
          <rect x="5" y="5" width="10" height="5" rx="1" fill="#FFFFFF"/>
          <rect x="5" y="11.5" width="10" height="5" rx="1" fill="#FFFFFF" opacity=".75"/>
          <circle cx="18" cy="18" r="3" fill="#FFFFFF"/>
          <circle cx="18" cy="18" r="1" fill="#4C6EF5"/>
        </svg>
      );

    // ── Team-managed — cluster of people ───────────────────────────────────
    case 'team_managed':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#F79009"/>
          <circle cx="9" cy="10" r="2.2" fill="#FFFFFF"/>
          <circle cx="15" cy="10" r="2.2" fill="#FFFFFF"/>
          <path d="M5.5 17c.5-2 2-3 3.5-3s3 1 3.5 3" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
          <path d="M11.5 17c.5-2 2-3 3.5-3s3 1 3.5 3" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        </svg>
      );

    // ── Jira Product Discovery — pink tile + lightbulb ─────────────────────
    case 'discovery':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#D6336C"/>
          <path d="M12 5a4.5 4.5 0 0 0-3 7.8V15h6v-2.2A4.5 4.5 0 0 0 12 5z" fill="#FFFFFF"/>
          <rect x="10" y="16" width="4" height="1.5" rx=".5" fill="#FFFFFF"/>
          <rect x="10.5" y="18.5" width="3" height="1" rx=".5" fill="#FFFFFF"/>
        </svg>
      );

    // ── Roadmap — timeline lanes ───────────────────────────────────────────
    case 'roadmap':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#8B5CF6"/>
          <rect x="5"  y="7"  width="10" height="2.5" rx="1" fill="#FFFFFF"/>
          <rect x="9"  y="11" width="10" height="2.5" rx="1" fill="#FFFFFF" opacity=".9"/>
          <rect x="5"  y="15" width="8"  height="2.5" rx="1" fill="#FFFFFF" opacity=".75"/>
        </svg>
      );

    // ── Plan — calendar page ───────────────────────────────────────────────
    case 'plan':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#06B6D4"/>
          <rect x="5.5" y="6" width="13" height="13" rx="1.5" fill="none" stroke="#FFFFFF" strokeWidth="1.6"/>
          <path d="M5.5 10h13" stroke="#FFFFFF" strokeWidth="1.4"/>
          <rect x="8" y="4" width="1.6" height="3.5" rx=".6" fill="#FFFFFF"/>
          <rect x="14.4" y="4" width="1.6" height="3.5" rx=".6" fill="#FFFFFF"/>
        </svg>
      );

    // ── Portfolio — briefcase ──────────────────────────────────────────────
    case 'portfolio':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#0F172A"/>
          <rect x="5" y="9" width="14" height="9" rx="1.5" fill="#FFFFFF"/>
          <rect x="9" y="6.5" width="6" height="3" rx="1" fill="none" stroke="#FFFFFF" strokeWidth="1.4"/>
          <rect x="5" y="12" width="14" height="1.2" fill="#0F172A"/>
        </svg>
      );

    // ── Customer service — chat bubble + heart ─────────────────────────────
    case 'customer':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#14B8A6"/>
          <path d="M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5l-3 3v-3H7a2 2 0 0 1-2-2V9z" fill="#FFFFFF"/>
          <path d="M10.3 10.5a1.4 1.4 0 0 1 1.9 0L12 10.8l-.2-.3a1.4 1.4 0 0 1 1.9 0 1.4 1.4 0 0 1 0 1.9l-1.7 1.7-1.7-1.7a1.4 1.4 0 0 1 0-1.9z" fill="#14B8A6"/>
        </svg>
      );

    // ── Opsgenie — siren / pager ──────────────────────────────────────────
    case 'opsgenie':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#DC2626"/>
          <path d="M12 5l6 5v6H6v-6l6-5z" fill="#FFFFFF"/>
          <rect x="11" y="11" width="2" height="3.5" rx=".5" fill="#DC2626"/>
          <circle cx="12" cy="15.5" r="1" fill="#DC2626"/>
        </svg>
      );

    // ── Analytics — bar chart ──────────────────────────────────────────────
    case 'analytics':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#0EA5E9"/>
          <rect x="6"  y="13" width="2.5" height="5" rx=".6" fill="#FFFFFF"/>
          <rect x="10.25" y="9" width="2.5" height="9" rx=".6" fill="#FFFFFF"/>
          <rect x="14.5" y="6" width="2.5" height="12" rx=".6" fill="#FFFFFF"/>
        </svg>
      );

    // ── Wiki — document with lines ────────────────────────────────────────
    case 'wiki':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#475569"/>
          <path d="M7 5h7l4 4v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="#FFFFFF"/>
          <path d="M14 5v4h4" fill="none" stroke="#475569" strokeWidth="1.2"/>
          <path d="M8.5 12h7M8.5 15h7M8.5 17.5h4" stroke="#475569" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );

    // ── Design — 4-cell grid ──────────────────────────────────────────────
    case 'design':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#1F2937"/>
          <line x1="12" y1="4" x2="12" y2="20" stroke="#FFFFFF" strokeWidth="1.2" opacity=".6"/>
          <line x1="4" y1="12" x2="20" y2="12" stroke="#FFFFFF" strokeWidth="1.2" opacity=".6"/>
          <circle cx="8"  cy="8"  r="2.2" fill="#FFFFFF" opacity=".95"/>
          <circle cx="16" cy="8"  r="2.2" fill="#FFFFFF" opacity=".75"/>
          <circle cx="8"  cy="16" r="2.2" fill="#FFFFFF" opacity=".75"/>
          <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" opacity=".55"/>
        </svg>
      );

    // ── Data — stacked database disks ─────────────────────────────────────
    case 'data':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#9333EA"/>
          <ellipse cx="12" cy="7.5" rx="5.5" ry="2" fill="#FFFFFF"/>
          <path d="M6.5 7.5v4c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-4" stroke="#FFFFFF" strokeWidth="1.4" fill="none"/>
          <path d="M6.5 11.5v4c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-4" stroke="#FFFFFF" strokeWidth="1.4" fill="none"/>
        </svg>
      );

    // ── Integration — puzzle piece ────────────────────────────────────────
    case 'integration':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#2563EB"/>
          <path
            d="M7 8h3.5a1.5 1.5 0 1 1 3 0H17v3.5a1.5 1.5 0 1 0 0 3V18H13.5a1.5 1.5 0 1 1-3 0H7v-3.5a1.5 1.5 0 1 0 0-3V8z"
            fill="#FFFFFF"
          />
        </svg>
      );

    // ── Mobile — phone frame ──────────────────────────────────────────────
    case 'mobile':
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#F43F5E"/>
          <rect x="8" y="4.5" width="8" height="15" rx="1.6" fill="#FFFFFF"/>
          <rect x="9.25" y="6" width="5.5" height="10" rx=".5" fill="#F43F5E"/>
          <circle cx="12" cy="18" r=".9" fill="#F43F5E"/>
        </svg>
      );

    default:
      // Treated as a dev-error surface — visible gray tile, never blank.
      return (
        <svg {...props}>
          <rect width="24" height="24" rx="4" fill="#94A3B8"/>
          <text x="12" y="16" textAnchor="middle" fontSize="11" fontFamily="Inter" fontWeight="700" fill="#FFFFFF">?</text>
        </svg>
      );
  }
}
