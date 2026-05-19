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
}

interface CatyImproveState {
  payload: CatyImprovePayload | null;
  start: (payload: CatyImprovePayload) => void;
  stop: () => void;
}

export const useCatyImprove = create<CatyImproveState>((set) => ({
  payload: null,
  start: (payload) => set({ payload }),
  stop: () => set({ payload: null }),
}));
