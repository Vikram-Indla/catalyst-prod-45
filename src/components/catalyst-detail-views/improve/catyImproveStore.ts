/**
 * catyImproveStore — tiny Zustand store that bridges
 * `<ImproveIssueDropdown>` (where the user clicks "Improve description")
 * and `<CatalystDescriptionSection>` (where the streaming overlay must
 * mount). Both components live under different parents in each
 * `CatalystView*` (Epic / Story / Defect / …) so a callback prop would
 * have to be threaded through 8+ files. The store decouples them: the
 * dropdown calls `start({...})`, the section subscribes and mounts the
 * overlay when `payload` becomes truthy.
 *
 * Single-active-improve: the store holds at most one in-flight session.
 * Calling `start()` while another is active replaces it — the consumer
 * is expected to render at most one overlay at a time (which is the
 * shape of the data: one description per detail view).
 */
import { create } from 'zustand';

export interface CatyImprovePayload {
  /** Issue key the AI is improving (used for keying / cancel routing). */
  issueKey: string;
  /** Issue type — drives PER_TYPE_FOCUS in the prompt. */
  issueType: string | null;
  /** Issue summary / title — prompt context. */
  issueSummary: string | null;
  /** Current description (plain text). Shown as the muted snapshot. */
  currentDescription: string | null;
  /** Current acceptance criteria. Becomes part of the prompt + the
   *  muted snapshot. */
  currentAcceptanceCriteria: string | null;
  /** Public attachment URLs — passed to the multimodal AI prompt so
   *  Caty can "see" mockups / screenshots. Empty array is fine. */
  attachmentUrls: string[];
  /** Sub-instruction for the AI. Defaults to `improve_clarify` to match
   *  Jira's "Improve description" default. */
  improveSubType?: string;
  /**
   * Which AI endpoint to call.
   *   - 'improve_description_v2' (default) → routes to ai-improve-story,
   *     full multimodal description editing.
   *   - 'improve_comment_v1' → routes to ai-improve-comment, polishes
   *     comment text only (no AC, no attachments).
   * Lets the same hook power both Description's toolbar/right-rail and
   * the comment editor's "Improve writing" button.
   */
  improveType?: 'improve_description_v2' | 'improve_comment_v1';
  /** Parent work item summary — hierarchical context for the AI. */
  parentSummary?: string | null;
  /** Parent work item description (truncated). */
  parentDescription?: string | null;
  /** Comma-separated linked issue summaries. */
  linkedIssues?: string | null;
  /** Comma-separated existing subtask summaries. */
  existingSubtasks?: string | null;
  /** Comma-separated labels. */
  labels?: string | null;
  /** Priority name. */
  priority?: string | null;
  /** Comma-separated component names. */
  components?: string | null;
}

/** Minimum character count (after trim) to allow AI improvement. */
export const MIN_CONTENT_LENGTH = 30;

/**
 * FNV-1a 32-bit — fast deterministic fingerprint for dedup.
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

export function contentHash(text: string): string {
  return fnv1aHash(text.replace(/\s+/g, ' ').trim().toLowerCase());
}

interface CatyImproveState {
  payload: CatyImprovePayload | null;
  improvedHashes: Record<string, Set<string>>;
  start: (payload: CatyImprovePayload) => void;
  stop: () => void;
  markImproved: (issueKey: string, hash: string) => void;
  isAlreadyImproved: (issueKey: string, text: string) => boolean;
}

export const useCatyImprove = create<CatyImproveState>((set, get) => ({
  payload: null,
  improvedHashes: {},
  start: (payload) => set({ payload }),
  stop: () => set({ payload: null }),
  markImproved: (issueKey, hash) =>
    set((state) => {
      const existing = state.improvedHashes[issueKey] ?? new Set<string>();
      const next = new Set(existing);
      next.add(hash);
      return { improvedHashes: { ...state.improvedHashes, [issueKey]: next } };
    }),
  isAlreadyImproved: (issueKey, text) => {
    const hashes = get().improvedHashes[issueKey];
    if (!hashes) return false;
    return hashes.has(contentHash(text));
  },
}));
