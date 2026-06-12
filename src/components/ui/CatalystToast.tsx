/**
 * CatalystToast — public API wrapper that fan-outs to the canonical
 * @atlaskit/flag host (src/components/shared/JiraTable/flags.tsx).
 *
 * 671+ call sites use `catalystToast.success(...)`. Migrating each one
 * is high-blast-radius — instead, this wrapper internally forwards to
 * `flag.success(...)` so sonner is removed from the import graph here
 * while the public API stays drop-in.
 *
 * Original custom-render (sonner.toast.custom) is dropped: @atlaskit/flag
 * owns its presentation per ADS, which is the design-system contract.
 * Optional `action` becomes a FlagAction; `title` and `description` map
 * straight through.
 */
import { flag, type FlagAction } from '@/components/shared/JiraTable/flags';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface CatalystToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showCatalystToast = (
  type: ToastType,
  message: string,
  options?: CatalystToastOptions,
) => {
  const actions: FlagAction[] | undefined = options?.action
    ? [{ content: options.action.label, onClick: options.action.onClick }]
    : undefined;
  // ADS-canonical flag.* signature is (title, description, actions).
  // CatalystToast historically treated `message` as the body and an
  // optional `options.title` as the header. Preserve that semantics.
  const title = options?.title ?? message;
  const description = options?.title ? message : options?.description;
  flag[type](title, description, actions);
};

// catalystToast is exported from @/lib/catalystToast (canonical source).
// Do NOT re-export or re-declare it here — duplicate declarations crash Vite.
