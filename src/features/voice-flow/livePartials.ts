/**
 * livePartials — stable-prefix splitter for live dictation
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S3a).
 *
 * Streaming ASR rewrites its tail: the last few words of a hypothesis can
 * change as more audio arrives. Rendering every rewrite as solid text makes
 * the composer flicker (the documented failure mode of naive streaming UIs).
 * This module splits each successive full transcript into:
 *
 *   stable      — monotonic, append-only; safe to insert into the real field.
 *                 NEVER shrinks and never rewrites (LocalAgreement-style).
 *   provisional — the still-moving tail; render as ghost text only.
 *
 * Stability rule: a character span is stable once two consecutive updates
 * agree on it (longest common prefix), trimmed back to a word boundary so a
 * half-word never solidifies.
 */

export interface LivePartial {
  stable: string;
  provisional: string;
}

/** Longest common prefix length of two strings. */
function lcpLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/** Trim a prefix length back to a word boundary so words solidify whole,
 *  then absorb trailing whitespace into the stable span. */
function toWordBoundary(text: string, len: number): number {
  let i = len;
  if (i < text.length && !/\s/.test(text[i])) {
    // Agreement ends mid-word — retreat to the previous whitespace.
    while (i > 0 && !/\s/.test(text[i - 1])) i--;
  }
  // Whitespace after a completed word is safe — include it.
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

export class LivePartialsController {
  private prev: string | null = null;
  private stableLen = 0;
  private stableText = '';

  /** Feed the latest FULL transcript; returns the current split. */
  update(full: string): LivePartial {
    if (this.prev !== null) {
      const agreed = toWordBoundary(full, lcpLength(this.prev, full));
      if (agreed > this.stableLen && full.startsWith(this.stableText)) {
        this.stableLen = agreed;
        this.stableText = full.slice(0, agreed);
      }
    }
    this.prev = full;

    if (!full.startsWith(this.stableText)) {
      // The engine rewrote inside what we already deemed stable. Committed
      // text never rewrites — hold the stable span and treat nothing else as
      // renderable until the hypothesis re-converges past it.
      return { stable: this.stableText, provisional: '' };
    }
    return { stable: this.stableText, provisional: full.slice(this.stableLen) };
  }

  /** Everything, stabilised — call when the session ends (stop/commit). */
  finalize(full: string | null): LivePartial {
    const text = full ?? this.prev ?? '';
    this.prev = text;
    this.stableLen = text.length;
    this.stableText = text;
    return { stable: text, provisional: '' };
  }

  get current(): LivePartial {
    const full = this.prev ?? '';
    return full.startsWith(this.stableText)
      ? { stable: this.stableText, provisional: full.slice(this.stableLen) }
      : { stable: this.stableText, provisional: '' };
  }

  reset(): void {
    this.prev = null;
    this.stableLen = 0;
    this.stableText = '';
  }
}

/** Live-lane health as surfaced to the UI. */
export type LiveLaneStatus = 'connecting' | 'live' | 'unavailable';
