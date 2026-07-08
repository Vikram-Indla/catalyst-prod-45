/**
 * SpeculativeTranslator — pre-translate Arabic while the user is still
 * speaking (CAT-DICTATION-INTELLIGENCE-20260708-001 S5).
 *
 * The shortcut lane translates the live transcript at stop (~2.5s felt
 * latency). This fires the same translation speculatively DURING dictation
 * (throttled), so by the time the user stops, the answer is usually already
 * here: exact-match → instant insert; miss → the normal call runs and
 * nothing was lost. Extra cost ≈ one translate call per ~5s of Arabic
 * speech — bounded and cheap next to the latency win.
 */
import { supabase } from '@/integrations/supabase/client';

const MIN_INTERVAL_MS = 5_000;
const MIN_GROWTH_CHARS = 24;

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export class SpeculativeTranslator {
  private lastFiredAt = 0;
  private lastSource = '';
  private done: { source: string; translated: string } | null = null;
  private pending: { source: string; promise: Promise<string | null> } | null = null;
  private disposed = false;

  /** Feed the current full transcript; may fire a speculative translation. */
  feed(transcript: string): void {
    if (this.disposed) return;
    const source = normalize(transcript);
    if (!source) return;
    const now = Date.now();
    if (this.pending) return; // one in flight at a time — latest wins later
    if (now - this.lastFiredAt < MIN_INTERVAL_MS) return;
    if (source.length - this.lastSource.length < MIN_GROWTH_CHARS && this.lastSource) return;

    this.lastFiredAt = now;
    this.lastSource = source;
    const promise = supabase.functions
      .invoke('ai-translate-field', { body: { text: source, target: 'en' } })
      .then(({ data, error }) => {
        const translated = (data as { translated?: string } | null)?.translated?.trim();
        if (!error && translated && !this.disposed) {
          this.done = { source, translated };
          return translated;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        if (this.pending?.source === source) this.pending = null;
      });
    this.pending = { source, promise };
  }

  /** Claim the speculative result for the FINAL transcript. Exact-match only
   *  — a stale prefix translation is never passed off as the full result. */
  async take(finalTranscript: string): Promise<string | null> {
    const source = normalize(finalTranscript);
    if (!source) return null;
    if (this.done?.source === source) return this.done.translated;
    if (this.pending?.source === source) {
      return await this.pending.promise;
    }
    return null;
  }

  dispose(): void {
    this.disposed = true;
    this.pending = null;
    this.done = null;
  }
}
