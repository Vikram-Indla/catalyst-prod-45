/**
 * ADS shim for the radix useToast() / toast() API.
 *
 * All 69 files that `import { useToast } from '@/hooks/use-toast'`
 * continue to work unchanged. Calls route to @atlaskit/flag via showFlag().
 *
 * Variant mapping:
 *   variant: 'destructive'  →  appearance: 'error'  (persistent — user dismisses)
 *   variant: 'default' / none  →  appearance: 'info'  (auto-dismiss 8s)
 *
 * The original 180-line radix reducer is replaced; the exported interface
 * (useToast, toast, reducer) is kept stable for any callsite that imports them.
 */
import { showFlag } from '@/components/shared/JiraTable/flags';

interface ToastOptions {
  title?: string;
  description?: string;
  /** 'destructive' → error flag; anything else → info flag */
  variant?: 'default' | 'destructive';
  // Additional fields from radix API accepted but ignored (no radix renderer)
  action?: unknown;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
}

type ToastReturn = { id: string; dismiss: () => void; update: (props: ToastOptions) => void };

function toast(opts: ToastOptions): ToastReturn {
  const appearance = opts.variant === 'destructive' ? 'error' : 'info';
  showFlag({
    title: typeof opts.title === 'string' ? opts.title : String(opts.title ?? ''),
    description: typeof opts.description === 'string' ? opts.description : undefined,
    appearance,
  });
  // Return a no-op handle — radix callers that stored the id for update/dismiss
  // can still call dismiss() safely (it's a no-op; ADS flags manage themselves).
  return { id: '', dismiss: () => {}, update: () => {} };
}

function useToast() {
  return {
    // toasts: [] satisfies callers that spread state or check toasts.length
    toasts: [] as ToastOptions[],
    toast,
    dismiss: (_toastId?: string) => { /* no-op — ADS flags self-dismiss */ },
  };
}

// reducer is exported for any file that imports it from use-toast
// (toaster.tsx uses it). Keep as a no-op stub so the import doesn't break.
export const reducer = (state: { toasts: ToastOptions[] }) => state;

export { useToast, toast };
