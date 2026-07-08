/**
 * cleanupTranscript — the CatyFlow Wispr-grade polish pass
 * (CAT-VOICE-FLOW-20260704-001).
 *
 * Raw ASR text → catyflow-clean edge function (register-aware: fillers,
 * backtracks, punctuation, lists — same language in, same language out).
 * The call is raced against a hard deadline: a late cleanup is discarded
 * and the raw transcript commits instead, so dictation never feels slow.
 */
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

/** Hard latency budget for the cleanup round-trip (Wispr's published bar). */
const CLEANUP_DEADLINE_MS = 2500;

/** A hard lane failure (401/503, not a timeout) is surfaced ONCE per page
 *  load — silent degradation to raw transcripts hid a real outage for days. */
let laneFailureToasted = false;
function toastLaneFailureOnce() {
  if (laneFailureToasted) return;
  laneFailureToasted = true;
  catalystToast.warning(
    'Dictation cleanup is unavailable right now — inserting the raw transcript.',
  );
}

/** Utterances shorter than this many words skip cleanup entirely. */
const MIN_WORDS = 4;

/** Disfluency + self-correction markers (EN + AR — Arabic corrections
 *  usually arrive already translated, but raw-Arabic callers hit this fn
 *  too). If none appear and the text already ends with terminal
 *  punctuation, cleanup is unnecessary. */
const FILLER_RE =
  /\b(um+|uh+|erm+|hmm+|like|you know|i mean|actually|no wait|wait no|scratch that|make (?:that|it)|forget (?:that|it)|correction|rather|sorry,|not that|instead)\b|يعني|ااه|امم|لا انتظر|اقصد|خلاص لا|بدل كذا/i;

/** Immediate word/bigram repetition = a spoken restart ("we need we need
 *  to ship") — cleanup-worthy even with no filler words. */
const RESTART_RE = /\b(\S+(?:\s+\S+)?)\s+\1\b/i;

export interface CleanupOutcome {
  cleaned: string;
  provider: string;
}

export function shouldCleanup(raw: string): boolean {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return false;
  if (FILLER_RE.test(raw)) return true;
  if (RESTART_RE.test(raw)) return true;
  // No fillers: still clean long-form (punctuation/list formatting), skip short.
  return words.length >= 25 || !/[.!?؟։۔]\s*$/.test(raw.trim());
}

/** Resolve the register from the focused element's data-dictation-style
 *  (own or ancestor), falling back to tag heuristics. */
export function resolveRegister(target: Element | null | undefined): string {
  if (target) {
    const tagged = (target as HTMLElement).closest?.('[data-dictation-style]');
    const style = tagged?.getAttribute('data-dictation-style');
    if (style) return style;
    const el = target as HTMLElement;
    const aria = `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('placeholder') ?? ''}`.toLowerCase();
    if (/comment|reply/.test(aria)) return 'comment';
    if (/title|summary|name/.test(aria)) return 'title';
    if (/message|chat/.test(aria)) return 'chat';
    if (el.tagName === 'INPUT') return 'field';
  }
  return 'description';
}

/** Last ~300 chars of existing field content, for capitalization/flow context. */
export function precedingContext(target: Element | null | undefined): string {
  if (!target) return '';
  const el = target as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  const value =
    'value' in el && typeof el.value === 'string' ? el.value : (el.textContent ?? '');
  return value.slice(-300);
}

export async function cleanupTranscript(
  raw: string,
  target: Element | null | undefined,
  opts?: { deadlineMs?: number; dictionary?: string[] },
): Promise<CleanupOutcome | null> {
  if (!shouldCleanup(raw)) return null;

  const deadline = opts?.deadlineMs ?? CLEANUP_DEADLINE_MS;

  const call = (async (): Promise<CleanupOutcome | null> => {
    const { data, error } = await supabase.functions.invoke('catyflow-clean', {
      body: {
        mode: 'clean',
        text: raw,
        register: resolveRegister(target),
        preceding_context: precedingContext(target),
        dictionary: opts?.dictionary ?? [],
      },
    });
    if (error) {
      toastLaneFailureOnce();
      return null;
    }
    const cleaned = (data as { cleaned?: string; provider?: string } | null)?.cleaned;
    if (!cleaned || !cleaned.trim()) return null;
    return { cleaned: cleaned.trim(), provider: (data as { provider?: string })?.provider ?? 'unknown' };
  })();

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), deadline));
  try {
    return await Promise.race([call, timeout]);
  } catch {
    return null;
  }
}
