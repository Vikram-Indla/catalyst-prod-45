/**
 * catyReleaseSummarizeStore — Zustand bridge between the "Summarize
 * release" CTA on the release detail page and the inline
 * `ReleaseSummaryCard` rendered above the work-items section.
 *
 * Mirrors `catySummarizeStore` (the comment-thread variant). Single
 * in-flight session; calling `start()` while another is active
 * replaces it.
 */
import { create } from 'zustand';

const AUTO_STORAGE_KEY = 'catalyst:release-summarize-auto-enabled';

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
    /* swallow */
  }
}

export interface CatyReleaseSummarizePayload {
  /** ph_releases.id OR ph_jira_sprints.id — matched against the active detail page. */
  releaseId: string;
  /** Release/Sprint display name — prompt context. */
  releaseName: string | null;
  /** 2026-06-26: entity kind for the edge function. Defaults to 'release'
   *  so existing callers stay unchanged. */
  entityKind?: 'release' | 'sprint';
}

export type ReleaseSummarizeStatus =
  | 'idle'
  | 'fetching'
  | 'streaming'
  | 'done'
  | 'error';

interface CatyReleaseSummarizeState {
  payload: CatyReleaseSummarizePayload | null;
  status: ReleaseSummarizeStatus;
  streamingText: string;
  errorMessage: string | null;
  autoEnabled: boolean;

  start: (payload: CatyReleaseSummarizePayload) => void;
  setStreaming: () => void;
  appendDelta: (delta: string) => void;
  complete: (fullText: string) => void;
  error: (message: string) => void;
  dismiss: () => void;
  setAuto: (next: boolean) => void;
}

export const useCatyReleaseSummarize = create<CatyReleaseSummarizeState>((set) => ({
  payload: null,
  status: 'idle',
  streamingText: '',
  errorMessage: null,
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
