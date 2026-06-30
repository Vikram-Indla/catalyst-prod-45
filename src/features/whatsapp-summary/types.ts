/**
 * WhatsApp AI Summary — type model (Feature 4, filter vertical).
 *
 * The AI is the author of the prose. The context builder is the security
 * boundary: it permission-gates, sanitizes, classifies, and caps the item
 * set BEFORE the AI ever sees any data.
 */

// ── Options ───────────────────────────────────────────────────────────────────

export type SummaryType = 'progress' | 'blockers' | 'eta' | 'full';

/**
 * Recipient role — mirrors the app_role enum from the access management module.
 * Used by the edge function to tailor tone, detail level, and framing.
 */
export type RecipientRole =
  | 'admin'
  | 'product_owner'
  | 'product_manager'
  | 'business_owner'
  | 'project_manager'
  | 'project_coordinator'
  | 'release_manager'
  | 'architect'
  | 'developer'
  | 'qa_tester'
  | 'operations_engineer'
  | 'technical_support'
  | 'support'
  | 'governance'
  | 'pmo'
  | 'guest';

export interface WhatsAppSummaryOptions {
  summaryType: SummaryType;
  recipientRole: RecipientRole;
  maxItems: number; // enforced by context builder (cap: 30)
}

// ── Item shape sent to the AI ─────────────────────────────────────────────────

export type BusinessStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'in_review'
  | 'done'
  | 'unknown';

export type EtaSource = 'due_date' | 'sprint' | 'missing';

/**
 * The ONLY item shape the AI ever sees.
 * No internal IDs, no raw HTML, no private comments, no restricted fields.
 */
export interface SanitizedItem {
  key: string;            // e.g. "BAU-123" — display key, not UUID
  summary: string;        // plain text only, max 200 chars
  issueType: string;      // e.g. "Story"
  assignee: string;       // display name or "Unassigned"
  businessStatus: BusinessStatus;
  rawStatus: string;      // original Jira status string, for AI prose
  isBlocked: boolean;
  blockerReason: string | null;  // null when not blocked or reason unknown
  etaDate: string | null;        // ISO date string or null
  etaSource: EtaSource;
  sprintName: string | null;
  isInReview: boolean;
  isDecisionNeeded: boolean;
  daysStale: number | null;      // days since last update; null if no updated date
  priority: string | null;
}

// ── Context payload sent to the edge function ─────────────────────────────────

export interface FilterSummaryContext {
  filterName: string;
  filterJql: string;
  projectKey: string | null;
  totalItemCount: number;       // full result set size (may exceed cappedItems)
  cappedItemCount: number;      // actual items in payload (≤ maxItems)
  isTruncated: boolean;         // totalItemCount > cappedItemCount
  generatedAt: string;          // ISO timestamp (UTC)
  options: WhatsAppSummaryOptions;
  counts: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    inReview: number;
    notStarted: number;
    decisionNeeded: number;
    missingEta: number;
    overdue: number;
  };
  cappedItems: SanitizedItem[];
}

// ── Edge-function result ──────────────────────────────────────────────────────

export interface GenerateSummaryResult {
  generatedText: string;
  warnings: string[];
  itemCountUsed: number;
  generatedAt: string;
}

// ── Component state ───────────────────────────────────────────────────────────

export type WhatsAppSummaryPhase =
  | 'idle'
  | 'building_context'
  | 'generating'
  | 'ready'
  | 'error'
  | 'fallback'; // AI failed; showing deterministic fallback

export interface WhatsAppSummaryState {
  phase: WhatsAppSummaryPhase;
  options: WhatsAppSummaryOptions;
  editableText: string;
  warnings: string[];
  errorMessage: string | null;
  itemCountUsed: number;
  isTruncated: boolean;
}
