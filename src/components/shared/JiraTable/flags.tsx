// @ts-nocheck
/**
 * JiraTable -- @atlaskit/flag toast host.
 *
 * Replaces sonner toasts on Catalyst surfaces that use the canonical
 * JiraTable kit. Two pieces:
 *
 *   1. `<FlagsHost />`  -- mount once at the page root. It owns the queue
 *                          of currently-displayed flags and renders an
 *                          @atlaskit/flag <FlagGroup>.
 *   2. `showFlag(...)`  -- module-level function call sites use instead of
 *                          `toast.success(...)`. Pushes a flag onto the
 *                          host's queue. Safe to call before mount; the
 *                          queue buffers until a host registers.
 *
 * Uses ONLY @atlaskit/flag + @atlaskit/icon primitives — no custom toast UI.
 *
 * Why a singleton instead of a React provider:
 *   - Most call sites that show a flag (mutation onSuccess / onError) live
 *     in non-component code (react-query callbacks, service helpers).
 *     Threading a context through to those is noise; a tiny module-level
 *     API keeps the migration drop-in for `toast.success(...)` users.
 */
import React, { useCallback, useEffect, useState } from 'react';
import FlagGroup, { AutoDismissFlag, type FlagProps } from '@atlaskit/flag';
import { token } from '@atlaskit/tokens';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import InfoIcon from '@atlaskit/icon/glyph/info';
import WarningIcon from '@atlaskit/icon/glyph/warning';

export type FlagAppearance = 'success' | 'error' | 'info' | 'warning';

export interface ShowFlagInput {
  title: string;
  description?: string;
  appearance?: FlagAppearance;
  /** Auto-dismiss delay in ms. Default 4000 for success/info, 6000 for error. */
  delay?: number;
}

interface QueuedFlag extends ShowFlagInput {
  id: number;
}

// ── Singleton state (module-level) ────────────────────────────────────────
let nextId = 1;
let queue: QueuedFlag[] = [];
const listeners = new Set<(q: QueuedFlag[]) => void>();

function notify() {
  for (const l of listeners) l(queue);
}

/**
 * Push a flag onto the host queue. Safe to call from anywhere — including
 * react-query callbacks, async service helpers, etc. No-op (drops on the
 * floor) if no <FlagsHost /> is mounted, but you generally want the host
 * mounted at every page that uses the kit so flags never get lost.
 */
export function showFlag(input: ShowFlagInput) {
  const id = nextId++;
  const flag: QueuedFlag = { ...input, id };
  queue = [flag, ...queue];
  notify();
}

/** Convenience helpers — drop-in for sonner's `toast.success / error / info`. */
export const flag = {
  success: (title: string, description?: string) => showFlag({ title, description, appearance: 'success' }),
  error: (title: string, description?: string) => showFlag({ title, description, appearance: 'error' }),
  info: (title: string, description?: string) => showFlag({ title, description, appearance: 'info' }),
  warning: (title: string, description?: string) => showFlag({ title, description, appearance: 'warning' }),
};

// ── Atlaskit appearance mapping ───────────────────────────────────────────
function iconFor(appearance: FlagAppearance) {
  // @atlaskit/flag expects an icon node (not a glyph name). All four glyphs
  // ship with @atlaskit/icon so this is purely an Atlaskit-native composition.
  const props = { label: '', size: 'medium' as const };
  switch (appearance) {
    case 'success': return <SuccessIcon {...props} primaryColor={token('color.icon.success', '#36B37E')} />;
    case 'error':   return <ErrorIcon   {...props} primaryColor={token('color.icon.danger',  '#FF5630')} />;
    case 'warning': return <WarningIcon {...props} primaryColor={token('color.icon.warning', '#FFAB00')} />;
    case 'info':
    default:        return <InfoIcon    {...props} primaryColor={token('color.icon.information', '#0065FF')} />;
  }
}

function appearanceForFlag(a: FlagAppearance): FlagProps['appearance'] {
  // @atlaskit/flag's appearance vocabulary: 'normal' | 'info' | 'warning' |
  // 'error' | 'success'. Map our shorthand to it.
  switch (a) {
    case 'success': return 'success';
    case 'error':   return 'error';
    case 'warning': return 'warning';
    case 'info':
    default:        return 'info';
  }
}

/**
 * Mount this once at the root of any page that uses showFlag(). Safe to
 * mount multiple times (each instance subscribes independently — flags
 * appear in every host). In practice you want exactly one per route.
 */
export function FlagsHost() {
  const [items, setItems] = useState<QueuedFlag[]>(queue);

  useEffect(() => {
    const cb = (q: QueuedFlag[]) => setItems([...q]);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const dismiss = useCallback((id: string | number) => {
    queue = queue.filter((f) => f.id !== id);
    notify();
  }, []);

  return (
    <FlagGroup onDismissed={dismiss}>
      {items.map((f) => {
        const appearance = f.appearance ?? 'info';
        return (
          <AutoDismissFlag
            key={f.id}
            id={f.id}
            icon={iconFor(appearance)}
            title={f.title}
            description={f.description}
            appearance={appearanceForFlag(appearance)}
          />
        );
      })}
    </FlagGroup>
  );
}