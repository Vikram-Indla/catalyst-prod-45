/**
 * ADS notification shim — replaces Sonner with @atlaskit/flag.
 *
 * All 600 files that `import { toast } from '@/components/ui/sonner'`
 * continue to work unchanged. The API surface is drop-in compatible:
 *   toast("message")                    → info flag (auto-dismiss 8s)
 *   toast.success("message")            → success flag (auto-dismiss 8s)
 *   toast.error("message")              → error flag (persistent — user dismisses)
 *   toast.info("message")               → info flag (auto-dismiss 8s)
 *   toast.warning("message")            → warning flag (persistent — user dismisses)
 *   toast.success("msg", { action })    → success flag with action button
 *   toast.loading("msg")                → info flag (Phase 3: migrate to button spinner)
 *   toast.dismiss()                     → no-op (flags auto-dismiss or user X)
 *
 * Toaster export is a null component — FlagsHost is mounted in App.tsx instead.
 */
import { showFlag, flag as flagHelpers } from '@/components/shared/JiraTable/flags';
import type { FlagAction } from '@/components/shared/JiraTable/flags';

interface SonnerOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Drop-in replacement for sonner's `toast` function + method namespace.
 * Exported as `toast` so all existing callsites require zero edits.
 */
export const toast = Object.assign(
  // Default call: toast("message") or toast("title", { description })
  (title: string, opts?: SonnerOptions) => {
    const actions: FlagAction[] | undefined = opts?.action
      ? [{ content: opts.action.label, onClick: opts.action.onClick }]
      : undefined;
    showFlag({ title, description: opts?.description, appearance: 'info', actions });
  },
  {
    success: (title: string, opts?: SonnerOptions) => {
      const actions: FlagAction[] | undefined = opts?.action
        ? [{ content: opts.action.label, onClick: opts.action.onClick }]
        : undefined;
      showFlag({ title, description: opts?.description, appearance: 'success', actions });
    },
    error: (title: string, opts?: SonnerOptions) =>
      showFlag({ title, description: opts?.description, appearance: 'error' }),

    info: (title: string, opts?: SonnerOptions) =>
      showFlag({ title, description: opts?.description, appearance: 'info' }),

    warning: (title: string, opts?: SonnerOptions) =>
      showFlag({ title, description: opts?.description, appearance: 'warning' }),

    // Loading: show an info flag. Phase 3 will migrate these 4 sites to
    // button-spinner + deferred success/error flag pattern.
    loading: (title: string, _opts?: SonnerOptions) =>
      showFlag({ title, appearance: 'info' }),

    // dismiss: no-op — ADS flags dismiss themselves (auto or user X)
    dismiss: (_id?: string | number) => { /* no-op */ },

    // promise: not used in codebase; kept for API compatibility
    promise: <T,>(
      _promise: Promise<T>,
      _msgs?: { loading?: string; success?: string; error?: string },
    ) => { /* no-op */ },
  },
);

/**
 * Toaster is now a no-op — FlagsHost in App.tsx is the ADS provider.
 * Kept as a named export so App.tsx import doesn't break before it's updated.
 */
export const Toaster = () => null;
