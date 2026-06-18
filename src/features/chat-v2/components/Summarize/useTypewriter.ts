/**
 * useTypewriter — incrementally reveals a string over time. Returns the
 * substring shown so far and a boolean telling the caller when the full
 * string has been streamed.
 *
 * Used by the AI Summary panel to give the writer-style "typing" feel
 * Slack AI uses when a summary streams in.
 */
import { useEffect, useState } from 'react';

interface TypewriterOptions {
  charsPerTick?: number;
  intervalMs?: number;
  /** When false, output the string immediately without animation. */
  enabled?: boolean;
}

export function useTypewriter(
  fullText: string,
  { charsPerTick = 6, intervalMs = 24, enabled = true }: TypewriterOptions = {},
): { visible: string; done: boolean } {
  const [shown, setShown] = useState(enabled ? 0 : fullText.length);

  useEffect(() => {
    if (!enabled) {
      setShown(fullText.length);
      return;
    }
    setShown(0);
    if (!fullText) return;
    const id = window.setInterval(() => {
      setShown(prev => {
        const next = Math.min(prev + charsPerTick, fullText.length);
        if (next >= fullText.length) window.clearInterval(id);
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [fullText, charsPerTick, intervalMs, enabled]);

  return { visible: fullText.slice(0, shown), done: shown >= fullText.length };
}
