/**
 * catalystToast — Phase 6 ADS migration (2026-05-26).
 *
 * All 34 call sites continue to work with zero edits.
 * The old custom CatalystToastContainer is no longer the renderer —
 * every call now delegates to `showFlag` from the canonical ADS flag host
 * (mounted once in App.tsx as <FlagsHost />).
 *
 * API surface preserved 1:1:
 *   catalystToast.success(title, message?, action?, duration?)
 *   catalystToast.error(title, message?, action?, duration?)
 *   catalystToast.warning(title, message?, action?, duration?)
 *   catalystToast.info(title, message?, action?, duration?)
 *   catalystToast.loading(title, message?)
 *   catalystToast.undo(title, onUndo, countdown?)
 *   catalystToast.dismiss(id)   → no-op (ADS flags auto-dismiss)
 *   catalystToast._subscribe()  → no-op (FlagsHost owns rendering)
 */
import { showFlag, type FlagAction } from '@/components/shared/JiraTable/flags';
import type { CatalystToastType, CatalystToastAction } from '@/components/ui/catalyst-toast';

// Keep the type exports so importing files don't need to change.
export type { CatalystToastType, CatalystToastAction };

export interface CatalystToastItem {
  id: string;
  type: CatalystToastType;
  title: string;
  message?: string;
  action?: CatalystToastAction;
  actions?: CatalystToastAction[];
  duration?: number;
  undoCountdown?: number;
}

/** Map a CatalystToastAction to the ADS FlagAction shape. */
function toFlagAction(a: CatalystToastAction): FlagAction {
  return { content: a.label, onClick: a.onClick };
}

let idCounter = 0;

export const catalystToast = {
  /**
   * Legacy subscriber hook — no longer needed (FlagsHost owns rendering).
   * Kept as a no-op so CatalystToastContainer callers don't throw.
   */
  _subscribe: (_onToast: unknown, _onDismiss: unknown) => () => { /* no-op */ },

  /** Raw show — delegates to showFlag. Returns a synthetic id string. */
  show: (options: Omit<CatalystToastItem, 'id'>): string => {
    const id = `catalyst-toast-${++idCounter}`;

    // DEPRECATED 2026-06-16 (Vikram): success + info confirmation badges are
    // suppressed platform-wide. Only error / warning / loading / undo render.
    // Call sites are intentionally left intact so feedback can be restored by
    // deleting this guard alone.
    if (options.type === 'success' || options.type === 'info') {
      return id;
    }

    const appearance =
      options.type === 'success' ? 'success'
      : options.type === 'error'   ? 'error'
      : options.type === 'warning' ? 'warning'
      : 'info'; // loading / undo / info all map to info

    const actions: FlagAction[] | undefined = options.action
      ? [toFlagAction(options.action)]
      : options.actions?.map(toFlagAction);

    showFlag({
      title:       options.title,
      description: options.message,
      appearance,
      actions,
      // ADS enforces ≥8s; pass duration for success/info; error/warning ignore it.
      delay: options.duration,
    });
    return id;
  },

  /** Programmatic dismiss — no-op (ADS flags auto-dismiss or require user X). */
  dismiss: (_id: string) => { /* no-op */ },

  success: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string =>
    catalystToast.show({ type: 'success', title, message, action, duration: duration ?? 4000 }),

  error: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string =>
    catalystToast.show({ type: 'error', title, message, action, duration: duration ?? 5000 }),

  warning: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string =>
    catalystToast.show({ type: 'warning', title, message, action, duration: duration ?? 4000 }),

  info: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string =>
    catalystToast.show({ type: 'info', title, message, action, duration: duration ?? 4000 }),

  loading: (title: string, message?: string): string =>
    catalystToast.show({ type: 'loading', title, message }),

  /** Undo toast — renders as an info flag with an "Undo" action button. */
  undo: (title: string, onUndo: () => void, countdown: number = 5): string =>
    catalystToast.show({
      type: 'undo',
      title,
      undoCountdown: countdown,
      action: { label: 'Undo', onClick: onUndo },
      duration: countdown * 1000,
    }),
};

// export default catalystToast;
