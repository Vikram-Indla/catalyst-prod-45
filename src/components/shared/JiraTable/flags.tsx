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
// @atlaskit/flag: default export = Flag (base); named: AutoDismissFlag, FlagGroup
import Flag, { AutoDismissFlag, FlagGroup, type FlagProps } from '@atlaskit/flag';
import { token } from '@atlaskit/tokens';
import SuccessIcon from '@atlaskit/icon/core/check-circle';
import ErrorIcon from '@atlaskit/icon/core/error';
import InfoIcon from '@atlaskit/icon/core/information';
import WarningIcon from '@atlaskit/icon/core/warning';

export type FlagAppearance = 'success' | 'error' | 'info' | 'warning';

/** ADS action link/button shown inside the flag card */
export interface FlagAction {
  content: React.ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
}

export interface ShowFlagInput {
  title: string;
  description?: string;
  appearance?: FlagAppearance;
  /**
   * Auto-dismiss delay in ms.
   * Applies to success/info only — error/warning NEVER auto-dismiss (a11y rule).
   * Default: 8000ms (Jira parity). Minimum enforced: 8000ms.
   */
  delay?: number;
  /** ADS action links rendered inside the flag card (e.g. "Open" after clone). */
  actions?: FlagAction[];
}

interface QueuedFlag extends ShowFlagInput {
  id: number;
  /** true = persistent (error/warning); false = auto-dismiss (success/info) */
  persistent: boolean;
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
  // error/warning are persistent (user must dismiss); success/info auto-dismiss
  const persistent = input.appearance === 'error' || input.appearance === 'warning';
  const flag: QueuedFlag = { ...input, id, persistent };
  queue = [flag, ...queue];
  notify();
}

/** Convenience helpers — drop-in for sonner's `toast.success / error / info`. */
export const flag = {
  // DEPRECATED 2026-06-16 (Vikram): success + info confirmation badges are
  // suppressed platform-wide. No-op — call sites left intact for reversibility.
  success: (_title: string, _description?: string, _actions?: FlagAction[]) => { /* suppressed */ },
  error: (title: string, description?: string, actions?: FlagAction[]) =>
    showFlag({ title, description, appearance: 'error', actions }),
  // DEPRECATED 2026-06-16 (Vikram): info confirmation badges suppressed.
  info: (_title: string, _description?: string, _actions?: FlagAction[]) => { /* suppressed */ },
  warning: (title: string, description?: string, actions?: FlagAction[]) =>
    showFlag({ title, description, appearance: 'warning', actions }),
};

// ── Atlaskit appearance mapping ───────────────────────────────────────────
function iconFor(appearance: FlagAppearance) {
  // @atlaskit/icon/core — modern ADS icon primitives (not legacy glyph/).
  // primaryColor is passed via SPAN color (core icon reads currentColor).
  const props = { label: '', LEGACY_size: 'medium' as const, color: 'currentColor' };
  switch (appearance) {
    case 'success': return <SuccessIcon {...props} color={token('color.icon.inverse', '#FFFFFF')} />;
    case 'error':   return <ErrorIcon   {...props} color={token('color.icon.inverse', '#FFFFFF')} />;
    case 'warning': return <WarningIcon {...props} color={token('color.icon.warning.inverse', '#292A2E')} />;
    case 'info':
    default:        return <InfoIcon    {...props} color={token('color.icon.inverse', '#FFFFFF')} />;
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

  // ADS FlagGroup positions at inset-inline-start: var(--ds-space-1000, 5rem) = 80px
  // from the viewport left edge — which puts it BEHIND Catalyst's 240px sidebar nav.
  // Override --ds-space-1000 on the Atlaskit portal elements (class="atlaskit-portal")
  // so the FlagGroup shifts to the content-area edge. Scoped to the portal class so
  // the override doesn't affect any non-portal ADS spacing.
  useEffect(() => {
    if (document.getElementById('cp-flag-left-offset')) return;
    const s = document.createElement('style');
    s.id = 'cp-flag-left-offset';
    // Override inset-inline-start directly on the compiled class that positions
    // the FlagGroup. The CSS variable approach (overriding --ds-space-1000 on
    // .atlaskit-portal) doesn't cascade down to the fixed element because ADS
    // spacing theme re-declares --ds-space-1000 on html[data-theme~="spacing:spacing"]
    // with higher effective specificity. Directly overriding the compiled property
    // avoids that race entirely.
    s.textContent = `._1e021epz { inset-inline-start: calc(var(--cp-layout-sidebar, 240px) + 16px) !important; }`;
    document.head.appendChild(s);
  }, []);

  const dismiss = useCallback((id: string | number) => {
    queue = queue.filter((f) => f.id !== id);
    notify();
  }, []);

  return (
    <FlagGroup onDismissed={dismiss}>
      {items.map((f) => {
        const appearance = f.appearance ?? 'info';
        const adsAppearance = appearanceForFlag(appearance);
        // a11y rule: error/warning MUST NOT auto-dismiss — user must explicitly dismiss.
        // success/info auto-dismiss after 8s (ADS/Jira parity minimum).
        const autoDismissSeconds = Math.max(8, Math.round((f.delay ?? 8000) / 1000));
        const sharedProps = {
          id: f.id,
          icon: iconFor(appearance),
          title: f.title,
          description: f.description,
          appearance: adsAppearance,
          onDismissed: dismiss,
          actions: f.actions,
        };
        return f.persistent ? (
          <Flag key={f.id} {...sharedProps} />
        ) : (
          <AutoDismissFlag
            key={f.id}
            {...sharedProps}
            autoDismissSeconds={autoDismissSeconds}
          />
        );
      })}
    </FlagGroup>
  );
}