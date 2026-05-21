/**
 * catySummarizeStore — Zustand bridge between the right-rail Improve
 * dropdown ("Summarize comments" menu item) and the inline
 * `CommentsSummaryCard` rendered above the comments in
 * `CatalystActivitySection`. Mirrors the role of `catyImproveStore`.
 *
 * Single-active-summary: at most one in-flight session — calling
 * `start()` while another is active replaces it.
 *
 * `autoEnabled` mirrors Jira's "Make summaries automatic" toggle. The
 * actual auto-fire effect (re-summarize on new comments) lives in the
 * consumer; the store only holds the preference. The card persists this
 * to localStorage.
 */
import { create } from 'zustand';

// localStorage key for the "Make summaries automatic" preference.
// Persisted globally per user agent (not per-user-in-app) — same
// approximation Jira uses for this surface.
const AUTO_STORAGE_KEY = 'catalyst:summarize-auto-enabled';

// Default is ON (Jira parity). When the value has never been written,
// fall back to the default.
function readAutoFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(AUTO_STORAGE_KEY);
    if (raw === null) return true;
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

function writeAutoToStorage(next: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTO_STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* swallow — quota / disabled storage isn't worth crashing for */
  }
}

export interface CatySummarizePayload {
  /** Issue key — used to match against the active detail view. */
  issueKey: string;
  /** Resolved `ph_comments.work_item_id` UUID — required for the query. */
  workItemId: string;
  /** Issue type — drives per-type tone in the AI prompt. */
  issueType: string | null;
  /** Issue summary / title — prompt context. */
  issueSummary: string | null;
}

export type SummarizeStatus =
  | 'idle'
  | 'fetching'
  | 'streaming'
  | 'done'
  | 'error';

interface CatySummarizeState {
  payload: CatySummarizePayload | null;
  status: SummarizeStatus;
  streamingText: string;
  errorMessage: string | null;
  /** "Make summaries automatic" toggle. Persisted by the card. */
  autoEnabled: boolean;

  start: (payload: CatySummarizePayload) => void;
  setStreaming: () => void;
  appendDelta: (delta: string) => void;
  complete: (fullText: string) => void;
  error: (message: string) => void;
  dismiss: () => void;
  setAuto: (next: boolean) => void;
}

export const useCatySummarize = create<CatySummarizeState>((set) => ({
  payload: null,
  status: 'idle',
  streamingText: '',
  errorMessage: null,
  // Hydrated from localStorage; defaults to ON (Jira parity).
  autoEnabled: readAutoFromStorage(),

  start: (payload) =>
    set({
      payload,
      status: 'fetching',
      streamingText: '',
      errorMessage: null,
    }),

  setStreaming: () => set({ status: 'streaming' }),

  appendDelta: (delta) =>
    set((s) => ({ streamingText: s.streamingText + delta })),

  complete: (fullText) =>
    set({ status: 'done', streamingText: fullText, errorMessage: null }),

  error: (message) => set({ status: 'error', errorMessage: message }),

  dismiss: () =>
    set({
      payload: null,
      status: 'idle',
      streamingText: '',
      errorMessage: null,
    }),

  setAuto: (next) => {
    writeAutoToStorage(next);
    set({ autoEnabled: next });
  },
}));
