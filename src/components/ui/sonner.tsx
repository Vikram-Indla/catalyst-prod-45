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
  // Default call: toast("message") → info badge.
  // DEPRECATED 2026-06-16 (Vikram): info confirmation badges suppressed platform-wide.
  (_title: string, _opts?: SonnerOptions) => { /* suppressed */ },
  {
    // DEPRECATED 2026-06-16 (Vikram): success badges suppressed platform-wide.
    success: (_title: string, _opts?: SonnerOptions) => { /* suppressed */ },
    error: (title: string, opts?: SonnerOptions) =>
      showFlag({ title, description: opts?.description, appearance: 'error' }),

    // DEPRECATED 2026-06-16 (Vikram): info confirmation badges suppressed.
    info: (_title: string, _opts?: SonnerOptions) => { /* suppressed */ },

    warning: (title: string, opts?: SonnerOptions) =>
      showFlag({ title, description: opts?.description, appearance: 'warning' }),

    // DEPRECATED 2026-06-16 (Vikram): loading transient badges suppressed.
    loading: (_title: string, _opts?: SonnerOptions) => { /* suppressed */ },

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

/**
 * Default export for react-hot-toast compatibility.
 * 12 files use `import toast from 'react-hot-toast'` (default import pattern).
 * The Vite alias `"react-hot-toast" → sonner.tsx` intercepts those imports at
 * bundle time. Since react-hot-toast exports a default, we need this line.
 * Zero callsite edits required.
 */
export default toast;
